import { isFullVersion } from "@macros/build" with { type: "macro" };

import { MkbPresetKey, MouseConstant, MouseMapTo, WheelCode } from "@/enums/mkb";
import { BxEvent } from "@utils/bx-event";
import { Toast } from "@utils/toast";
import { t } from "@utils/translation";
import { KeyHelper } from "./key-helper";
import { AppInterface, STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { BxLogger } from "@utils/bx-logger";
import { PointerClient } from "./pointer-client";
import { NativeMkbHandler } from "./native-mkb-handler";
import { MkbHandler, MouseDataProvider } from "./base-mkb-handler";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { GamepadKey, GamepadStick } from "@/enums/gamepad";
import { MkbPopup } from "./mkb-popup";
import type { MkbConvertedPresetData } from "@/types/presets";
import { StreamSettings } from "@/utils/stream-settings";
import { ShortcutAction } from "@/enums/shortcut-actions";
import { EventBus } from "@/utils/event-bus";

const PointerToMouseButton = {
    1: 0,
    2: 2,
    4: 1,
}

export const VIRTUAL_GAMEPAD_ID = 'Better xCloud Virtual Controller';

class WebSocketMouseDataProvider extends MouseDataProvider {
    private pointerClient: PointerClient | undefined
    private isConnected = false

    init(): void {
        this.pointerClient = PointerClient.getInstance();
        this.isConnected = false;
        try {
            this.pointerClient.start(STATES.pointerServerPort, this.mkbHandler);
            this.isConnected = true;
        } catch (e) {
            Toast.show('Cannot enable Mouse & Keyboard feature');
        }
    }

    start(): void {
        this.isConnected && AppInterface.requestPointerCapture();
    }

    stop(): void {
        this.isConnected && AppInterface.releasePointerCapture();
    }

    destroy(): void {
        this.isConnected && this.pointerClient?.stop();
    }
}

class PointerLockMouseDataProvider extends MouseDataProvider {
    start() {
        window.addEventListener('mousemove', this.onMouseMoveEvent);
        window.addEventListener('mousedown', this.onMouseEvent);
        window.addEventListener('mouseup', this.onMouseEvent);
        window.addEventListener('wheel', this.onWheelEvent, { passive: false });
        window.addEventListener('contextmenu', this.disableContextMenu);
    }

    stop() {
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('mousemove', this.onMouseMoveEvent);
        window.removeEventListener('mousedown', this.onMouseEvent);
        window.removeEventListener('mouseup', this.onMouseEvent);
        window.removeEventListener('wheel', this.onWheelEvent);
        window.removeEventListener('contextmenu', this.disableContextMenu);
    }

    private onMouseMoveEvent = (e: MouseEvent) => {
        this.mkbHandler.handleMouseMove({
            movementX: e.movementX,
            movementY: e.movementY,
        });
    }

    private onMouseEvent = (e: MouseEvent) => {
        e.preventDefault();

        const data: MkbMouseClick = {
            mouseButton: e.button,
            pressed: e.type === 'mousedown',
        };

        this.mkbHandler.handleMouseClick(data);
    }

    private onWheelEvent = (e: WheelEvent) => {
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

    private disableContextMenu = (e: Event) => e.preventDefault();
}

/*
This class uses some code from Yuzu emulator to handle mouse's movements
Source: https://github.com/yuzu-emu/yuzu-mainline/blob/master/src/input_common/drivers/mouse.cpp
*/
export class EmulatedMkbHandler extends MkbHandler {
    private static instance: EmulatedMkbHandler | null | undefined;
    public static getInstance(): typeof EmulatedMkbHandler['instance'] {
        if (typeof EmulatedMkbHandler.instance === 'undefined') {
            if (EmulatedMkbHandler.isAllowed()) {
                EmulatedMkbHandler.instance = new EmulatedMkbHandler();
            } else {
                EmulatedMkbHandler.instance = null;
            }
        }

        return EmulatedMkbHandler.instance;
    }

    private static readonly LOG_TAG = 'EmulatedMkbHandler';

    static isAllowed() {
        return getPref(PrefKey.MKB_ENABLED) && (AppInterface || !UserAgent.isMobile());
    }

    private PRESET!: MkbConvertedPresetData | null;
    private VIRTUAL_GAMEPAD = {
        id: VIRTUAL_GAMEPAD_ID,
        index: 0,
        connected: false,
        hapticActuators: null,
        mapping: 'standard',

        axes: [0, 0, 0, 0],
        buttons: new Array(17).fill(null).map(() => ({pressed: false, value: 0})),
        timestamp: performance.now(),

        vibrationActuator: null,
    };
    private nativeGetGamepads: Navigator['getGamepads'];

    private initialized = false;
    private enabled = false;
    private mouseDataProvider: MouseDataProvider | undefined;
    private isPolling = false;

    private prevWheelCode = null;
    private wheelStoppedTimeoutId: number | null = null;

    private detectMouseStoppedTimeoutId: number | null = null;

    private escKeyDownTime: number = -1;

    private LEFT_STICK_X: GamepadKey[] = [];
    private LEFT_STICK_Y: GamepadKey[] = [];
    private RIGHT_STICK_X: GamepadKey[] = [];
    private RIGHT_STICK_Y: GamepadKey[] = [];

    private popup: MkbPopup;

    private STICK_MAP: { [key in GamepadKey]?: [GamepadKey[], number, number] } = {
        [GamepadKey.LS_LEFT]: [this.LEFT_STICK_X, 0, -1],
        [GamepadKey.LS_RIGHT]: [this.LEFT_STICK_X, 0, 1],
        [GamepadKey.LS_UP]: [this.LEFT_STICK_Y, 1, -1],
        [GamepadKey.LS_DOWN]: [this.LEFT_STICK_Y, 1, 1],

        [GamepadKey.RS_LEFT]: [this.RIGHT_STICK_X, 2, -1],
        [GamepadKey.RS_RIGHT]: [this.RIGHT_STICK_X, 2, 1],
        [GamepadKey.RS_UP]: [this.RIGHT_STICK_Y, 3, -1],
        [GamepadKey.RS_DOWN]: [this.RIGHT_STICK_Y, 3, 1],
    };

    private constructor() {
        super();
        BxLogger.info(EmulatedMkbHandler.LOG_TAG, 'constructor()');

        this.nativeGetGamepads = window.navigator.getGamepads.bind(window.navigator);

        this.popup = MkbPopup.getInstance();
        this.popup.attachMkbHandler(this);
    }

    isEnabled = () => this.enabled;

    private patchedGetGamepads = () => {
        const gamepads = (this.nativeGetGamepads() || []) as any;

        gamepads[this.VIRTUAL_GAMEPAD.index] = this.VIRTUAL_GAMEPAD;
        return gamepads;
    }

    private getVirtualGamepad = () => this.VIRTUAL_GAMEPAD;

    private updateStick(stick: GamepadStick, x: number, y: number) {
        const virtualGamepad = this.getVirtualGamepad();
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

    private vectorLength = (x: number, y: number): number => Math.sqrt(x ** 2 + y ** 2);

    private resetGamepad() {
        const gamepad = this.getVirtualGamepad();

        // Reset axes
        gamepad.axes = [0, 0, 0, 0];

        // Reset buttons
        for (const button of gamepad.buttons) {
            button.pressed = false;
            button.value = 0;
        }

        gamepad.timestamp = performance.now();
    }

    private pressButton(buttonIndex: GamepadKey, pressed: boolean) {
        const virtualGamepad = this.getVirtualGamepad();

        if (buttonIndex >= 100) {
            let [valueArr, axisIndex] = this.STICK_MAP[buttonIndex]!;
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
                value = this.STICK_MAP[valueArr[valueArr.length - 1]]![2] as number;
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

    private onKeyboardEvent = (e: KeyboardEvent) => {
        const isKeyDown = e.type === 'keydown';

        // Hijack the Esc button
        if (e.code === 'Escape') {
            e.preventDefault();

            // Hold the Esc for 1 second to disable MKB
            if (this.enabled && isKeyDown) {
                if (this.escKeyDownTime === -1) {
                    this.escKeyDownTime = performance.now();
                } else if (performance.now() - this.escKeyDownTime >= 1000) {
                    this.stop();
                }
            } else {
                this.escKeyDownTime = -1;
            }
            return;
        }

        if (!this.isPolling || !this.PRESET) {
            return;
        }

        if (window.BX_STREAM_SETTINGS.xCloudPollingMode !== 'none') {
            return;
        }

        const buttonIndex = this.PRESET.mapping[e.code || e.key]!;
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        // Ignore repeating keys
        if (e.repeat) {
            return;
        }

        e.preventDefault();
        this.pressButton(buttonIndex, isKeyDown);
    }

    private onMouseStopped = () => {
        // Reset stick position
        this.detectMouseStoppedTimeoutId = null;

        if (!this.PRESET) {
            return;
        }

        const mouseMapTo = this.PRESET.mouse[MkbPresetKey.MOUSE_MAP_TO];
        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
        this.updateStick(analog, 0, 0);
    }

    handleMouseClick(data: MkbMouseClick) {
        let mouseButton;
        if (typeof data.mouseButton !== 'undefined') {
            mouseButton = data.mouseButton;
        } else if (typeof data.pointerButton !== 'undefined') {
            mouseButton = PointerToMouseButton[data.pointerButton as keyof typeof PointerToMouseButton];
        }

        const keyCode = 'Mouse' + mouseButton;
        const key = {
            code: keyCode,
        };

        if (!this.PRESET) {
            return;
        }
        const buttonIndex = this.PRESET.mapping[key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        this.pressButton(buttonIndex, data.pressed);
    }

    handleMouseMove(data: MkbMouseMove) {
        const preset = this.PRESET;
        if (!preset) {
            return;
        }

        // TODO: optimize this
        const mouseMapTo = preset.mouse[MkbPresetKey.MOUSE_MAP_TO];
        if (mouseMapTo === MouseMapTo.OFF) {
            // Ignore mouse movements
            return;
        }

        this.detectMouseStoppedTimeoutId && clearTimeout(this.detectMouseStoppedTimeoutId);
        this.detectMouseStoppedTimeoutId = window.setTimeout(this.onMouseStopped, 50);

        const deadzoneCounterweight = preset.mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT];

        let x = data.movementX * preset.mouse[MkbPresetKey.MOUSE_SENSITIVITY_X];
        let y = data.movementY * preset.mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y];

        let length = this.vectorLength(x, y);
        if (length !== 0 && length < deadzoneCounterweight) {
            x *= deadzoneCounterweight / length;
            y *= deadzoneCounterweight / length;
        } else if (length > MouseConstant.MAXIMUM_STICK_RANGE) {
            x *= MouseConstant.MAXIMUM_STICK_RANGE / length;
            y *= MouseConstant.MAXIMUM_STICK_RANGE / length;
        }

        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
        this.updateStick(analog, x, y);
    }

    handleMouseWheel(data: MkbMouseWheel): boolean {
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

        if (!this.PRESET) {
            return false;
        }

        const key = {
            code: code,
        };

        const buttonIndex = this.PRESET.mapping[key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return false;
        }

        if (this.prevWheelCode === null || this.prevWheelCode === key.code) {
            this.wheelStoppedTimeoutId && clearTimeout(this.wheelStoppedTimeoutId);
            this.pressButton(buttonIndex, true);
        }

        this.wheelStoppedTimeoutId = window.setTimeout(() => {
            this.prevWheelCode = null;
            this.pressButton(buttonIndex, false);
        }, 20);

        return true;
    }

    toggle(force?: boolean) {
        if (!this.initialized) {
            return;
        }

        if (typeof force !== 'undefined') {
            this.enabled = force;
        } else {
            this.enabled = !this.enabled;
        }

        if (this.enabled) {
            document.body.requestPointerLock();
        } else {
            document.pointerLockElement && document.exitPointerLock();
        }
    }

    refreshPresetData() {
        this.PRESET = window.BX_STREAM_SETTINGS.mkbPreset;
        this.resetGamepad();
    }

    waitForMouseData(showPopup: boolean) {
        this.popup.toggleVisibility(showPopup);
    }

    private onPollingModeChanged = (e: Event) => {
        const move = window.BX_STREAM_SETTINGS.xCloudPollingMode !== 'none';
        this.popup.moveOffscreen(move);
    }

    private onDialogShown = () => {
        document.pointerLockElement && document.exitPointerLock();
    }

    private onPointerLockChange = () => {
        if (document.pointerLockElement) {
            this.start();
        } else {
            this.stop();
        }
    }

    private onPointerLockError = (e: Event) => {
        console.log(e);
        this.stop();
    }

    private onPointerLockRequested = () => {
        this.start();
    }

    private onPointerLockExited = () => {
        this.mouseDataProvider?.stop();
    }

    handleEvent(event: Event) {
        switch (event.type) {
            case BxEvent.POINTER_LOCK_REQUESTED:
                this.onPointerLockRequested();
                break;
            case BxEvent.POINTER_LOCK_EXITED:
                this.onPointerLockExited();
                break;
        }
    }

    init() {
        if (!STATES.browser.capabilities.mkb) {
            this.initialized = false;
            return;
        }

        this.initialized = true;

        this.refreshPresetData();
        this.enabled = false;

        if (AppInterface) {
            this.mouseDataProvider = new WebSocketMouseDataProvider(this);
        } else {
            this.mouseDataProvider = new PointerLockMouseDataProvider(this);
        }
        this.mouseDataProvider.init();

        window.addEventListener('keydown', this.onKeyboardEvent);
        window.addEventListener('keyup', this.onKeyboardEvent);

        window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.onPollingModeChanged);
        window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.onDialogShown);

        if (AppInterface) {
            // Android app doesn't support PointerLock API so we need to use a different method
            window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
            window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        } else {
            document.addEventListener('pointerlockchange', this.onPointerLockChange);
            document.addEventListener('pointerlockerror', this.onPointerLockError);
        }

        MkbPopup.getInstance().reset();

        if (AppInterface) {
            const shortcutKey = StreamSettings.findKeyboardShortcut(ShortcutAction.MKB_TOGGLE);
            if (shortcutKey) {
                const msg = t('press-key-to-toggle-mkb', { key: `<b>${KeyHelper.codeToKeyName(shortcutKey)}</b>` });
                Toast.show(msg, t('native-mkb'), { html: true });
            }

            this.waitForMouseData(false);
        } else {
            this.waitForMouseData(true);
        }
    }

    destroy() {
        if (!this.initialized) {
            return;
        }

        this.initialized = false;
        this.isPolling = false;
        this.enabled = false;
        this.stop();

        this.waitForMouseData(false);
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('keydown', this.onKeyboardEvent);
        window.removeEventListener('keyup', this.onKeyboardEvent);

        if (AppInterface) {
            window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
            window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        } else {
            document.removeEventListener('pointerlockchange', this.onPointerLockChange);
            document.removeEventListener('pointerlockerror', this.onPointerLockError);
        }

        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.onPollingModeChanged);
        window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.onDialogShown);

        this.mouseDataProvider?.destroy();

        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.onPollingModeChanged);
    }

    updateGamepadSlots() {
        // Set gamepad slot
        this.VIRTUAL_GAMEPAD.index = getPref<number>(PrefKey.MKB_P1_SLOT) - 1;
    }

    start() {
        if (!this.enabled) {
            this.enabled = true;
            Toast.show(t('virtual-controller'), t('enabled'), { instant: true });
        }

        this.isPolling = true;
        this.escKeyDownTime = -1;

        this.resetGamepad();
        this.updateGamepadSlots();
        window.navigator.getGamepads = this.patchedGetGamepads;

        this.waitForMouseData(false);

        this.mouseDataProvider?.start();

        // Dispatch "gamepadconnected" event
        const virtualGamepad = this.getVirtualGamepad();
        virtualGamepad.connected = true;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepadconnected', {
                gamepad: virtualGamepad,
            });

        window.BX_EXPOSED.stopTakRendering = true;

        Toast.show(t('virtual-controller'), t('enabled'), { instant: true });
    }

    stop() {
        this.enabled = false;
        this.isPolling = false;
        this.escKeyDownTime = -1;

        const virtualGamepad = this.getVirtualGamepad();
        if (virtualGamepad.connected) {
            // Dispatch "gamepaddisconnected" event
            this.resetGamepad();

            virtualGamepad.connected = false;
            virtualGamepad.timestamp = performance.now();

            BxEvent.dispatch(window, 'gamepaddisconnected', {
                gamepad: virtualGamepad,
            });

            window.navigator.getGamepads = this.nativeGetGamepads;
        }

        this.waitForMouseData(true);
        this.mouseDataProvider?.stop();

        // Toast.show(t('virtual-controller'), t('disabled'), { instant: true });
    }

    static setupEvents() {
        if (isFullVersion()) {
            EventBus.Stream.on('statePlaying', () => {
                if (STATES.currentStream.titleInfo?.details.hasMkbSupport) {
                    // Enable native MKB in Android app
                    NativeMkbHandler.getInstance()?.init();
                } else {
                    EmulatedMkbHandler.getInstance()?.init();
                }
            });

            if (EmulatedMkbHandler.isAllowed()) {
                EventBus.Script.on('mkbSettingUpdated', () => {
                    EmulatedMkbHandler.getInstance()?.refreshPresetData();
                });
            }
        }
    }
}
