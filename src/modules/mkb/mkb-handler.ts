import { MkbPreset } from "./mkb-preset";
import { GamepadKey, MkbPresetKey, GamepadStick, MouseMapTo } from "./definitions";
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
import { BxIcon } from "@utils/bx-icon";
import { PointerClient } from "./pointer-client";

const LOG_TAG = 'MkbHandler';


abstract class MouseDataProvider {
    protected mkbHandler: MkbHandler;
    constructor(handler: MkbHandler) {
        this.mkbHandler = handler;
    }

    abstract init(): void;
    abstract start(): void;
    abstract stop(): void;
    abstract destroy(): void;
    abstract toggle(enabled: boolean): void;
}

class WebSocketMouseDataProvider extends MouseDataProvider {
    #pointerClient: PointerClient | undefined
    #connected = false

    init(): void {
        this.#pointerClient = PointerClient.getInstance();
        this.#connected = false;
        try {
            this.#pointerClient.start(this.mkbHandler);
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

    toggle(enabled: boolean): void {
        if (!this.#connected) {
            enabled = false;
        }

        enabled ? this.mkbHandler.start() : this.mkbHandler.stop();
        this.mkbHandler.waitForMouseData(!enabled);
    }
}

class PointerLockMouseDataProvider extends MouseDataProvider {
    init(): void {
        document.addEventListener('pointerlockchange', this.#onPointerLockChange);
        document.addEventListener('pointerlockerror', this.#onPointerLockError);
    }

    start(): void {
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
        }

        window.addEventListener('mousemove', this.#onMouseMoveEvent);
        window.addEventListener('mousedown', this.#onMouseEvent);
        window.addEventListener('mouseup', this.#onMouseEvent);
        window.addEventListener('wheel', this.#onWheelEvent);
        window.addEventListener('contextmenu', this.#disableContextMenu);
    }

    stop(): void {
        window.removeEventListener('mousemove', this.#onMouseMoveEvent);
        window.removeEventListener('mousedown', this.#onMouseEvent);
        window.removeEventListener('mouseup', this.#onMouseEvent);
        window.removeEventListener('wheel', this.#onWheelEvent);
        window.removeEventListener('contextmenu', this.#disableContextMenu);
    }

    destroy(): void {
        document.removeEventListener('pointerlockchange', this.#onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.#onPointerLockError);
    }

    toggle(enabled: boolean): void {
        enabled ? document.pointerLockElement && this.mkbHandler.start() : this.mkbHandler.stop();

        if (enabled) {
            !document.pointerLockElement && this.mkbHandler.waitForMouseData(true);
        } else {
            this.mkbHandler.waitForMouseData(false);
            document.pointerLockElement && document.exitPointerLock();
        }
    }

    #onPointerLockChange = () => {
        if (this.mkbHandler.isEnabled() && !document.pointerLockElement) {
            this.mkbHandler.stop();
        }
    }

    #onPointerLockError = (e: Event) => {
        console.log(e);
        this.stop();
    }

    #onMouseMoveEvent = (e: MouseEvent) => {
        this.mkbHandler.handleMouseMove({
            movementX: e.movementX,
            movementY: e.movementY,
        });
    }

    #onMouseEvent = (e: MouseEvent) => {
        e.preventDefault();

        const isMouseDown = e.type === 'mousedown';
        const key = KeyHelper.getKeyFromEvent(e);
        const data: MkbMouseClick = {
            key: key,
            pressed: isMouseDown
        };

        this.mkbHandler.handleMouseClick(data);
    }

    #onWheelEvent = (e: WheelEvent) => {
        const key = KeyHelper.getKeyFromEvent(e);
        if (!key) {
            return;
        }

        if (this.mkbHandler.handleMouseWheel({key})) {
            e.preventDefault();
        }
    }

    #disableContextMenu = (e: Event) => e.preventDefault();
}

/*
This class uses some code from Yuzu emulator to handle mouse's movements
Source: https://github.com/yuzu-emu/yuzu-mainline/blob/master/src/input_common/drivers/mouse.cpp
*/
export class MkbHandler {
    static #instance: MkbHandler;
    static get INSTANCE() {
        if (!MkbHandler.#instance) {
            MkbHandler.#instance = new MkbHandler();
        }

        return MkbHandler.#instance;
    }

    #CURRENT_PRESET_DATA = MkbPreset.convert(MkbPreset.DEFAULT_PRESET);

    static readonly DEFAULT_PANNING_SENSITIVITY = 0.0010;
    static readonly DEFAULT_DEADZONE_COUNTERWEIGHT = 0.01;
    static readonly MAXIMUM_STICK_RANGE = 1.1;

    static VIRTUAL_GAMEPAD_ID = 'Xbox 360 Controller';

    #VIRTUAL_GAMEPAD = {
            id: MkbHandler.VIRTUAL_GAMEPAD_ID,
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

    #STICK_MAP: {[key in GamepadKey]?: [GamepadKey[], number, number]};
    #LEFT_STICK_X: GamepadKey[] = [];
    #LEFT_STICK_Y: GamepadKey[] = [];
    #RIGHT_STICK_X: GamepadKey[] = [];
    #RIGHT_STICK_Y: GamepadKey[] = [];

    constructor() {
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
        if (isKeyDown) {
            if (e.code === 'F8') {
                e.preventDefault();
                this.toggle();
                return;
            } else if (e.code === 'Escape') {
                e.preventDefault();
                this.#enabled && this.stop();
                return;
            }

            if (!this.#isPolling) {
                return;
            }
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
        if (!data || !data.key) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[data.key.code]!;
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
        } else if (length > MkbHandler.MAXIMUM_STICK_RANGE) {
            x *= MkbHandler.MAXIMUM_STICK_RANGE / length;
            y *= MkbHandler.MAXIMUM_STICK_RANGE / length;
        }

        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
        this.#updateStick(analog, x, y);
    }

    handleMouseWheel = (data: MkbMouseWheel): boolean => {
        if (!data || !data.key) {
            return false;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[data.key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return false;
        }

        if (this.#prevWheelCode === null || this.#prevWheelCode === data.key.code) {
            this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout);
            this.#pressButton(buttonIndex, true);
        }

        this.#wheelStoppedTimeout = window.setTimeout(() => {
            this.#prevWheelCode = null;
            this.#pressButton(buttonIndex, false);
        }, 20);

        return true;
    }

    toggle = () => {
        this.#enabled = !this.#enabled;
        Toast.show(t('mouse-and-keyboard'), t(this.#enabled ? 'enabled' : 'disabled'), {instant: true});
        this.#mouseDataProvider?.toggle(this.#enabled);
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

    init = () => {
        this.refreshPresetData();
        this.#enabled = true;

        if (AppInterface) {
            this.#mouseDataProvider = new WebSocketMouseDataProvider(this);
        } else {
            this.#mouseDataProvider = new PointerLockMouseDataProvider(this);
        }
        this.#mouseDataProvider.init();

        window.addEventListener('keydown', this.#onKeyboardEvent);

        this.#$message = CE('div', {'class': 'bx-mkb-pointer-lock-msg bx-gone'},
                createButton({
                    icon: BxIcon.MOUSE_SETTINGS,
                    style: ButtonStyle.PRIMARY,
                    onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();

                        showStreamSettings('mkb');
                    },
                }),
                CE('div', {},
                    CE('p', {}, t('mkb-click-to-activate')),
                    CE('p', {}, t('press-key-to-toggle-mkb', {key: 'F8'})),
                ),
            );

        this.#$message.addEventListener('click', this.start.bind(this));
        document.documentElement.appendChild(this.#$message);

        window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);

        this.waitForMouseData(true);
    }

    destroy = () => {
        this.#isPolling = false;
        this.#enabled = false;
        this.stop();

        this.waitForMouseData(false);
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('keydown', this.#onKeyboardEvent);

        this.#mouseDataProvider?.destroy();

        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);
    }

    start = () => {
        if (!this.#enabled) {
            this.#enabled = true;
            Toast.show(t('mouse-and-keyboard'), t('enabled'), {instant: true});
        }

        this.#isPolling = true;

        this.#resetGamepad();
        window.navigator.getGamepads = this.#patchedGetGamepads;

        this.waitForMouseData(false);

        window.addEventListener('keyup', this.#onKeyboardEvent);
        this.#mouseDataProvider?.start();

        // Dispatch "gamepadconnected" event
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = true;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepadconnected', {
                gamepad: virtualGamepad,
            });
    }

    stop = () => {
        this.#isPolling = false;

        // Dispatch "gamepaddisconnected" event
        this.#resetGamepad();

        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = false;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepaddisconnected', {
                gamepad: virtualGamepad,
            });

        window.navigator.getGamepads = this.#nativeGetGamepads;

        window.removeEventListener('keyup', this.#onKeyboardEvent);

        this.waitForMouseData(true);
        this.#mouseDataProvider?.stop();
    }

    static setupEvents() {
        getPref(PrefKey.MKB_ENABLED) && (AppInterface || !UserAgent.isMobile()) && window.addEventListener(BxEvent.STREAM_PLAYING, () => {
            // Enable MKB
            if (!STATES.currentStream.titleInfo?.details.hasMkbSupport) {
                BxLogger.info(LOG_TAG, 'Emulate MKB');
                MkbHandler.INSTANCE.init();
            }
        });
    }
}
