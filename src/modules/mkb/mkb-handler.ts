import { MkbPreset } from "./mkb-preset";
import { GamepadKey, MkbPresetKey, GamepadStick, MouseMapTo, WheelCode } from "./definitions";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BxEvent } from "@utils/bx-event";
import { PrefKey, getPref } from "@utils/preferences";
import { Toast } from "@utils/toast";
import { t } from "@utils/translation";
import { LocalDb } from "@utils/local-db";
import { KeyHelper } from "./key-helper";
import type { MkbStoredPreset } from "@/types/mkb";
import { showStreamSettings } from "@modules/stream/stream-ui";
import { AppInterface, STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { BxLogger } from "@utils/bx-logger";
import { PointerClient } from "./pointer-client";
import { NativeMkbHandler } from "./native-mkb-handler";
import { MkbHandler, MouseDataProvider } from "./base-mkb-handler";

const LOG_TAG = 'MkbHandler';

const PointerToMouseButton = {
    1: 0,
    2: 2,
    4: 1,
}


class WebSocketMouseDataProvider extends MouseDataProvider {
    #pointerClient: PointerClient | undefined
    #connected = false

    init(): void {
        this.#pointerClient = PointerClient.getInstance();
        this.#connected = false;
        try {
            this.#pointerClient.start(STATES.pointerServerPort, this.mkbHandler);
            this.#connected = true;
        } catch (e) {
            Toast.show('Cannot enable Mouse & Keyboard feature');
        }
    }

    start(): void {
        this.#connected && AppInterface.requestPointerCapture();
    }

    stop(): void {
        this.#connected && AppInterface.releasePointerCapture();
    }

    destroy(): void {
        this.#connected && this.#pointerClient?.stop();
    }
}

class PointerLockMouseDataProvider extends MouseDataProvider {
    init(): void {}

    start(): void {
        window.addEventListener('mousemove', this.#onMouseMoveEvent);
        window.addEventListener('mousedown', this.#onMouseEvent);
        window.addEventListener('mouseup', this.#onMouseEvent);
        window.addEventListener('wheel', this.#onWheelEvent, {passive: false});
        window.addEventListener('contextmenu', this.#disableContextMenu);
    }

    stop(): void {
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('mousemove', this.#onMouseMoveEvent);
        window.removeEventListener('mousedown', this.#onMouseEvent);
        window.removeEventListener('mouseup', this.#onMouseEvent);
        window.removeEventListener('wheel', this.#onWheelEvent);
        window.removeEventListener('contextmenu', this.#disableContextMenu);
    }

    destroy(): void {}

    #onMouseMoveEvent = (e: MouseEvent) => {
        this.mkbHandler.handleMouseMove({
            movementX: e.movementX,
            movementY: e.movementY,
        });
    }

    #onMouseEvent = (e: MouseEvent) => {
        e.preventDefault();

        const isMouseDown = e.type === 'mousedown';
        const data: MkbMouseClick = {
            mouseButton: e.button,
            pressed: isMouseDown,
        };

        this.mkbHandler.handleMouseClick(data);
    }

    #onWheelEvent = (e: WheelEvent) => {
        const key = KeyHelper.getKeyFromEvent(e);
        if (!key) {
            return;
        }

        const data: MkbMouseWheel = {
            vertical: e.deltaY,
            horizontal: e.deltaX,
        };

        if (this.mkbHandler.handleMouseWheel(data)) {
            e.preventDefault();
        }
    }

    #disableContextMenu = (e: Event) => e.preventDefault();
}

/*
This class uses some code from Yuzu emulator to handle mouse's movements
Source: https://github.com/yuzu-emu/yuzu-mainline/blob/master/src/input_common/drivers/mouse.cpp
*/
export class EmulatedMkbHandler extends MkbHandler {
    static #instance: EmulatedMkbHandler;
    public static getInstance(): EmulatedMkbHandler {
        if (!EmulatedMkbHandler.#instance) {
            EmulatedMkbHandler.#instance = new EmulatedMkbHandler();
        }

        return EmulatedMkbHandler.#instance;
    }

    #CURRENT_PRESET_DATA = MkbPreset.convert(MkbPreset.DEFAULT_PRESET);

    static readonly DEFAULT_PANNING_SENSITIVITY = 0.0010;
    static readonly DEFAULT_DEADZONE_COUNTERWEIGHT = 0.01;
    static readonly MAXIMUM_STICK_RANGE = 1.1;

    static VIRTUAL_GAMEPAD_ID = 'Xbox 360 Controller';

    #VIRTUAL_GAMEPAD = {
            id: EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID,
            index: 3,
            connected: false,
            hapticActuators: null,
            mapping: 'standard',

            axes: [0, 0, 0, 0],
            buttons: new Array(17).fill(null).map(() => ({pressed: false, value: 0})),
            timestamp: performance.now(),

            vibrationActuator: null,
        };
    #nativeGetGamepads = window.navigator.getGamepads.bind(window.navigator);

    #enabled = false;
    #mouseDataProvider: MouseDataProvider | undefined;
    #isPolling = false;

    #prevWheelCode = null;
    #wheelStoppedTimeout?: number | null;

    #detectMouseStoppedTimeout?: number | null;

    #$message?: HTMLElement;

    #escKeyDownTime: number = -1;

    #STICK_MAP: {[key in GamepadKey]?: [GamepadKey[], number, number]};
    #LEFT_STICK_X: GamepadKey[] = [];
    #LEFT_STICK_Y: GamepadKey[] = [];
    #RIGHT_STICK_X: GamepadKey[] = [];
    #RIGHT_STICK_Y: GamepadKey[] = [];

    constructor() {
        super();

        this.#STICK_MAP = {
            [GamepadKey.LS_LEFT]: [this.#LEFT_STICK_X, 0, -1],
            [GamepadKey.LS_RIGHT]: [this.#LEFT_STICK_X, 0, 1],
            [GamepadKey.LS_UP]: [this.#LEFT_STICK_Y, 1, -1],
            [GamepadKey.LS_DOWN]: [this.#LEFT_STICK_Y, 1, 1],

            [GamepadKey.RS_LEFT]: [this.#RIGHT_STICK_X, 2, -1],
            [GamepadKey.RS_RIGHT]: [this.#RIGHT_STICK_X, 2, 1],
            [GamepadKey.RS_UP]: [this.#RIGHT_STICK_Y, 3, -1],
            [GamepadKey.RS_DOWN]: [this.#RIGHT_STICK_Y, 3, 1],
        };
    }

    isEnabled = () => this.#enabled;

    #patchedGetGamepads = () => {
        const gamepads = this.#nativeGetGamepads() || [];
        (gamepads as any)[this.#VIRTUAL_GAMEPAD.index] = this.#VIRTUAL_GAMEPAD;

        return gamepads;
    }

    #getVirtualGamepad = () => this.#VIRTUAL_GAMEPAD;

    #updateStick(stick: GamepadStick, x: number, y: number) {
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.axes[stick * 2] = x;
        virtualGamepad.axes[stick * 2 + 1] = y;

        virtualGamepad.timestamp = performance.now();
    }

    /*
    #getStickAxes(stick: GamepadStick) {
        const virtualGamepad = this.#getVirtualGamepad();
        return {
            x: virtualGamepad.axes[stick * 2],
            y: virtualGamepad.axes[stick * 2 + 1],
        };
    }
    */

    #vectorLength = (x: number, y: number): number => Math.sqrt(x ** 2 + y ** 2);

    #resetGamepad = () => {
        const gamepad = this.#getVirtualGamepad();

        // Reset axes
        gamepad.axes = [0, 0, 0, 0];

        // Reset buttons
        for (const button of gamepad.buttons) {
            button.pressed = false;
            button.value = 0;
        }

        gamepad.timestamp = performance.now();
    }

    #pressButton = (buttonIndex: GamepadKey, pressed: boolean) => {
        const virtualGamepad = this.#getVirtualGamepad();

        if (buttonIndex >= 100) {
            let [valueArr, axisIndex] = this.#STICK_MAP[buttonIndex]!;
            valueArr = valueArr as number[];
            axisIndex = axisIndex as number;

            // Remove old index of the array
            for (let i = valueArr.length - 1; i >= 0; i--) {
                if (valueArr[i] === buttonIndex) {
                    valueArr.splice(i, 1);
                }
            }

            pressed && valueArr.push(buttonIndex);

            let value;
            if (valueArr.length) {
                // Get value of the last key of the axis
                value = this.#STICK_MAP[valueArr[valueArr.length - 1]]![2] as number;
            } else {
                value = 0;
            }

            virtualGamepad.axes[axisIndex] = value;
        } else {
            virtualGamepad.buttons[buttonIndex].pressed = pressed;
            virtualGamepad.buttons[buttonIndex].value = pressed ? 1 : 0;
        }

        virtualGamepad.timestamp = performance.now();
    }

    #onKeyboardEvent = (e: KeyboardEvent) => {
        const isKeyDown = e.type === 'keydown';

        // Toggle MKB feature
        if (e.code === 'F8') {
            if (!isKeyDown) {
                e.preventDefault();
                this.toggle();
            }

            return;
        }

        // Hijack the Esc button
        if (e.code === 'Escape') {
            e.preventDefault();

            // Hold the Esc for 1 second to disable MKB
            if (this.#enabled && isKeyDown) {
                if (this.#escKeyDownTime === -1) {
                    this.#escKeyDownTime = performance.now();
                } else if (performance.now() - this.#escKeyDownTime >= 1000) {
                    this.stop();
                }
            } else {
                this.#escKeyDownTime = -1;
            }
            return;
        }

        if (!this.#isPolling) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[e.code || e.key]!;
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        // Ignore repeating keys
        if (e.repeat) {
            return;
        }

        e.preventDefault();
        this.#pressButton(buttonIndex, isKeyDown);
    }

    #onMouseStopped = () => {
        // Reset stick position
        this.#detectMouseStoppedTimeout = null;

        const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
        this.#updateStick(analog, 0, 0);
    }

    handleMouseClick = (data: MkbMouseClick) => {
        let mouseButton;
        if (typeof data.mouseButton !== 'undefined') {
            mouseButton = data.mouseButton;
        } else if (typeof data.pointerButton !== 'undefined') {
            mouseButton = PointerToMouseButton[data.pointerButton as keyof typeof PointerToMouseButton];
        }

        const keyCode = 'Mouse' + mouseButton;
        const key = {
            code: keyCode,
            name: KeyHelper.codeToKeyName(keyCode),
        };

        if (!key.name) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        this.#pressButton(buttonIndex, data.pressed);
    }

    handleMouseMove = (data: MkbMouseMove) => {
        // TODO: optimize this
        const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
        if (mouseMapTo === MouseMapTo.OFF) {
            // Ignore mouse movements
            return;
        }

        this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout);
        this.#detectMouseStoppedTimeout = window.setTimeout(this.#onMouseStopped.bind(this), 50);

        const deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT];

        let x = data.movementX * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_X];
        let y = data.movementY * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y];

        let length = this.#vectorLength(x, y);
        if (length !== 0 && length < deadzoneCounterweight) {
            x *= deadzoneCounterweight / length;
            y *= deadzoneCounterweight / length;
        } else if (length > EmulatedMkbHandler.MAXIMUM_STICK_RANGE) {
            x *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length;
            y *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length;
        }

        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
        this.#updateStick(analog, x, y);
    }

    handleMouseWheel = (data: MkbMouseWheel): boolean => {
        let code = '';
        if (data.vertical < 0) {
            code = WheelCode.SCROLL_UP;
        } else if (data.vertical > 0) {
            code = WheelCode.SCROLL_DOWN;
        } else if (data.horizontal < 0) {
            code = WheelCode.SCROLL_LEFT;
        } else if (data.horizontal > 0) {
            code = WheelCode.SCROLL_RIGHT;
        }

        if (!code) {
            return false;
        }

        const key = {
            code: code,
            name: KeyHelper.codeToKeyName(code),
        };

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return false;
        }

        if (this.#prevWheelCode === null || this.#prevWheelCode === key.code) {
            this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout);
            this.#pressButton(buttonIndex, true);
        }

        this.#wheelStoppedTimeout = window.setTimeout(() => {
            this.#prevWheelCode = null;
            this.#pressButton(buttonIndex, false);
        }, 20);

        return true;
    }

    toggle = (force?: boolean) => {
        if (typeof force !== 'undefined') {
            this.#enabled = force;
        } else {
            this.#enabled = !this.#enabled;
        }

        if (this.#enabled) {
            document.body.requestPointerLock();
        } else {
            document.pointerLockElement && document.exitPointerLock();
        }
    }

    #getCurrentPreset = (): Promise<MkbStoredPreset> => {
        return new Promise(resolve => {
            const presetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);
            LocalDb.INSTANCE.getPreset(presetId).then((preset: MkbStoredPreset) => {
                resolve(preset);
            });
        });
    }

    refreshPresetData = () => {
        this.#getCurrentPreset().then((preset: MkbStoredPreset) => {
            this.#CURRENT_PRESET_DATA = MkbPreset.convert(preset ? preset.data : MkbPreset.DEFAULT_PRESET);
            this.#resetGamepad();
        });
    }

    waitForMouseData = (wait: boolean) => {
        this.#$message && this.#$message.classList.toggle('bx-gone', !wait);
    }

    #onPollingModeChanged = (e: Event) => {
        if (!this.#$message) {
            return;
        }

        const mode = (e as any).mode;
        if (mode === 'None') {
            this.#$message.classList.remove('bx-offscreen');
        } else {
            this.#$message.classList.add('bx-offscreen');
        }
    }

    #onDialogShown = () => {
        document.pointerLockElement && document.exitPointerLock();
    }

    #initMessage = () => {
        if (!this.#$message) {
            this.#$message = CE('div', {'class': 'bx-mkb-pointer-lock-msg bx-gone'},
                CE('div', {},
                    CE('p', {}, t('virtual-controller')),
                    CE('p', {}, t('press-key-to-toggle-mkb', {key: 'F8'})),
                ),

                CE('div', {'data-type': 'virtual'},
                    createButton({
                        style: ButtonStyle.PRIMARY | ButtonStyle.TALL | ButtonStyle.FULL_WIDTH,
                        label: t('activate'),
                        onClick: ((e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();

                            this.toggle(true);
                        }).bind(this),
                    }),

                    CE('div', {},
                        createButton({
                            label: t('ignore'),
                            style: ButtonStyle.GHOST,
                            onClick: e => {
                                e.preventDefault();
                                e.stopPropagation();

                                this.toggle(false);
                                this.waitForMouseData(false);
                            },
                        }),

                        createButton({
                            label: t('edit'),
                            onClick: e => {
                                e.preventDefault();
                                e.stopPropagation();

                                showStreamSettings('mkb');
                            },
                        }),
                    ),
                ),
            );
        }

        if (!this.#$message.isConnected) {
            document.documentElement.appendChild(this.#$message);
        }
    }

    #onPointerLockChange = () => {
        if (document.pointerLockElement) {
            this.start();
        } else {
            this.stop();
        }
    }

    #onPointerLockError = (e: Event) => {
        console.log(e);
        this.stop();
    }

    #onPointerLockRequested = () => {
        this.start();
    }

    #onPointerLockExited = () => {
        this.#mouseDataProvider?.stop();
    }

    handleEvent(event: Event) {
        switch (event.type) {
            case BxEvent.POINTER_LOCK_REQUESTED:
                this.#onPointerLockRequested();
                break;
            case BxEvent.POINTER_LOCK_EXITED:
                this.#onPointerLockExited();
                break;
        }
    }

    init = () => {
        this.refreshPresetData();
        this.#enabled = false;

        if (AppInterface) {
            this.#mouseDataProvider = new WebSocketMouseDataProvider(this);
        } else {
            this.#mouseDataProvider = new PointerLockMouseDataProvider(this);
        }
        this.#mouseDataProvider.init();

        window.addEventListener('keydown', this.#onKeyboardEvent);
        window.addEventListener('keyup', this.#onKeyboardEvent);

        window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);
        window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.#onDialogShown);

        if (AppInterface) {
            // Android app doesn't support PointerLock API so we need to use a different method
            window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
            window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        } else {
            document.addEventListener('pointerlockchange', this.#onPointerLockChange);
            document.addEventListener('pointerlockerror', this.#onPointerLockError);
        }

        this.#initMessage();
        this.#$message?.classList.add('bx-gone');

        if (AppInterface) {
            Toast.show(t('press-key-to-toggle-mkb', {key: `<b>F8</b>`}), t('virtual-controller'), {html: true});
            this.waitForMouseData(false);
        } else {
            this.waitForMouseData(true);
        }
    }

    destroy = () => {
        this.#isPolling = false;
        this.#enabled = false;
        this.stop();

        this.waitForMouseData(false);
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('keydown', this.#onKeyboardEvent);
        window.removeEventListener('keyup', this.#onKeyboardEvent);

        if (AppInterface) {
            window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
            window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        } else {
            document.removeEventListener('pointerlockchange', this.#onPointerLockChange);
            document.removeEventListener('pointerlockerror', this.#onPointerLockError);
        }

        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);
        window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.#onDialogShown);

        this.#mouseDataProvider?.destroy();

        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);
    }

    start = () => {
        if (!this.#enabled) {
            this.#enabled = true;
            Toast.show(t('virtual-controller'), t('enabled'), {instant: true});
        }

        this.#isPolling = true;
        this.#escKeyDownTime = -1;

        this.#resetGamepad();
        window.navigator.getGamepads = this.#patchedGetGamepads;

        this.waitForMouseData(false);

        this.#mouseDataProvider?.start();

        // Dispatch "gamepadconnected" event
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = true;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepadconnected', {
                gamepad: virtualGamepad,
            });

        window.BX_EXPOSED.stopTakRendering = true;

        Toast.show(t('virtual-controller'), t('enabled'), {instant: true});
    }

    stop = () => {
        this.#enabled = false;
        this.#isPolling = false;
        this.#escKeyDownTime = -1;

        const virtualGamepad = this.#getVirtualGamepad();
        if (virtualGamepad.connected) {
            // Dispatch "gamepaddisconnected" event
            this.#resetGamepad();

            virtualGamepad.connected = false;
            virtualGamepad.timestamp = performance.now();

            BxEvent.dispatch(window, 'gamepaddisconnected', {
                    gamepad: virtualGamepad,
                });

            window.navigator.getGamepads = this.#nativeGetGamepads;
        }

        this.waitForMouseData(true);
        this.#mouseDataProvider?.stop();

        // Toast.show(t('virtual-controller'), t('disabled'), {instant: true});
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, () => {
            if (STATES.currentStream.titleInfo?.details.hasMkbSupport) {
                // Enable native MKB in Android app
                if (AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on') {
                    AppInterface && NativeMkbHandler.getInstance().init();
                }
            } else if (getPref(PrefKey.MKB_ENABLED) && (AppInterface || !UserAgent.isMobile())) {
                    BxLogger.info(LOG_TAG, 'Emulate MKB');
                    EmulatedMkbHandler.getInstance().init();
            }
        });
    }
}
