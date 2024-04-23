import { MkbPreset } from "./mkb-preset";
import { GamepadKey, MkbPresetKey, GamepadStick, MouseMapTo } from "./definitions";
import { createButton, Icon, ButtonStyle, CE } from "../../utils/html";
import { BxEvent } from "../bx-event";
import { PrefKey, getPref } from "../preferences";
import { Toast } from "../../utils/toast";
import { t } from "../translation";
import { LocalDb } from "../../utils/local-db";
import { KeyHelper } from "./key-helper";
import type { MkbStoredPreset } from "../../types/mkb";
import { showStreamSettings } from "../stream/stream-ui";

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
    static readonly DEFAULT_STICK_SENSITIVITY = 0.0006;
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

    #prevWheelCode = null;
    #wheelStoppedTimeout?: number | null;

    #detectMouseStoppedTimeout?: number | null;
    #allowStickDecaying = false;

    #$message?: HTMLElement;

    #STICK_MAP: {[index: keyof typeof GamepadKey]: (number | number[])[]};
    #LEFT_STICK_X: number[] = [];
    #LEFT_STICK_Y: number[] = [];
    #RIGHT_STICK_X: number[] = [];
    #RIGHT_STICK_Y: number[] = [];

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

    #getStickAxes(stick: GamepadStick) {
        const virtualGamepad = this.#getVirtualGamepad();
        return {
            x: virtualGamepad.axes[stick * 2],
            y: virtualGamepad.axes[stick * 2 + 1],
        };
    }

    #vectorLength = (x: number, y: number): number => Math.sqrt(x ** 2 + y ** 2);

    #disableContextMenu = (e: Event) => e.preventDefault();

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

    #pressButton = (buttonIndex: number, pressed: boolean) => {
        const virtualGamepad = this.#getVirtualGamepad();

        if (buttonIndex >= 100) {
            let [valueArr, axisIndex, fullValue] = this.#STICK_MAP[buttonIndex];
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
                value = this.#STICK_MAP[valueArr[valueArr.length - 1]][2] as number;
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
        if (isKeyDown && e.code === 'F8') {
            e.preventDefault();
            this.toggle();
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[e.code]!;
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

    #onMouseEvent = (e: MouseEvent) => {
        const isMouseDown = e.type === 'mousedown';
        const key = KeyHelper.getKeyFromEvent(e);
        if (!key) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        e.preventDefault();
        this.#pressButton(buttonIndex, isMouseDown);
    }

    #onWheelEvent = (e: WheelEvent) => {
        const key = KeyHelper.getKeyFromEvent(e);
        if (!key) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code]!;
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        e.preventDefault();

        if (this.#prevWheelCode === null || this.#prevWheelCode === key.code) {
            this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout);
            this.#pressButton(buttonIndex, true);
        }

        this.#wheelStoppedTimeout = setTimeout(() => {
            this.#prevWheelCode = null;
            this.#pressButton(buttonIndex, false);
        }, 20);
    }

    #decayStick = () => {
        if (!this.#allowStickDecaying) {
            return;
        }

        const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
        if (mouseMapTo === MouseMapTo.OFF) {
            return;
        }

        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;

        const virtualGamepad = this.#getVirtualGamepad();
        let { x, y } = this.#getStickAxes(analog);
        const length = this.#vectorLength(x, y);

        const clampedLength = Math.min(1.0, length);
        const decayStrength = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH];
        const decay = 1 - clampedLength * clampedLength * decayStrength;
        const minDecay = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_STICK_DECAY_MIN];
        const clampedDecay = Math.min(1 - minDecay, decay);

        x *= clampedDecay;
        y *= clampedDecay;

        const deadzoneCounterweight = 20 * MkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
        if (Math.abs(x) <= deadzoneCounterweight && Math.abs(y) <= deadzoneCounterweight) {
            x = 0;
            y = 0;
        }

        if (this.#allowStickDecaying) {
            this.#updateStick(analog, x, y);

            (x !== 0 || y !== 0) && requestAnimationFrame(this.#decayStick);
        }
    }

    #onMouseStopped = (e: MouseEvent) => {
        this.#allowStickDecaying = true;
        requestAnimationFrame(this.#decayStick);
    }

    #onMouseMoveEvent = (e: MouseEvent) => {
        // TODO: optimize this
        const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
        if (mouseMapTo === MouseMapTo.OFF) {
            // Ignore mouse movements
            return;
        }

        this.#allowStickDecaying = false;
        this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout);
        this.#detectMouseStoppedTimeout = setTimeout(this.#onMouseStopped.bind(this, e), 100);

        const deltaX = e.movementX;
        const deltaY = e.movementY;

        const deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT];

        let x = deltaX * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_X];
        let y = deltaY * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y];

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

    toggle = () => {
        this.#enabled = !this.#enabled;
        this.#enabled ? document.pointerLockElement && this.start() : this.stop();

        Toast.show(t('mouse-and-keyboard'), t(this.#enabled ? 'enabled' : 'disabled'), {instant: true});

        if (this.#enabled) {
            !document.pointerLockElement && this.#waitForPointerLock(true);
        } else {
            this.#waitForPointerLock(false);
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

    #onPointerLockChange = (e: Event) => {
        if (this.#enabled && !document.pointerLockElement) {
            this.stop();
            this.#waitForPointerLock(true);
        }
    }

    #onPointerLockError = (e: Event) => {
        console.log(e);
        this.stop();
    }

    #onActivatePointerLock = () => {
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
        }

        this.#waitForPointerLock(false);
        this.start();
    }

    #waitForPointerLock = (wait: boolean) => {
        this.#$message && this.#$message.classList.toggle('bx-gone', !wait);
    }

    #onStreamMenuShown = () => {
        this.#enabled && this.#waitForPointerLock(false);
    }

    #onStreamMenuHidden = () => {
        this.#enabled && this.#waitForPointerLock(true);
    }

    init = () => {
        this.refreshPresetData();
        this.#enabled = true;

        window.addEventListener('keydown', this.#onKeyboardEvent);

        document.addEventListener('pointerlockchange', this.#onPointerLockChange);
        document.addEventListener('pointerlockerror', this.#onPointerLockError);

        this.#$message = CE('div', {'class': 'bx-mkb-pointer-lock-msg bx-gone'},
                createButton({
                    icon: Icon.MOUSE_SETTINGS,
                    style: ButtonStyle.PRIMARY,
                    onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();

                        showStreamSettings('mkb');
                    },
                }),
                CE('div', {},
                    CE('p', {}, t('mkb-click-to-activate')),
                    CE('p', {}, t<any>('press-key-to-toggle-mkb')({key: 'F8'})),
                ),
            );

        this.#$message.addEventListener('click', this.#onActivatePointerLock);
        document.documentElement.appendChild(this.#$message);

        window.addEventListener(BxEvent.STREAM_MENU_SHOWN, this.#onStreamMenuShown);
        window.addEventListener(BxEvent.STREAM_MENU_HIDDEN, this.#onStreamMenuHidden);

        this.#waitForPointerLock(true);
    }

    destroy = () => {
        this.#enabled = false;
        this.stop();

        this.#waitForPointerLock(false);
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('keydown', this.#onKeyboardEvent);

        document.removeEventListener('pointerlockchange', this.#onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.#onPointerLockError);

        window.removeEventListener(BxEvent.STREAM_MENU_SHOWN, this.#onStreamMenuShown);
        window.removeEventListener(BxEvent.STREAM_MENU_HIDDEN, this.#onStreamMenuHidden);
    }

    start = () => {
        window.navigator.getGamepads = this.#patchedGetGamepads;

        this.#resetGamepad();

        window.addEventListener('keyup', this.#onKeyboardEvent);

        window.addEventListener('mousemove', this.#onMouseMoveEvent);
        window.addEventListener('mousedown', this.#onMouseEvent);
        window.addEventListener('mouseup', this.#onMouseEvent);
        window.addEventListener('wheel', this.#onWheelEvent);
        window.addEventListener('contextmenu', this.#disableContextMenu);

        // Dispatch "gamepadconnected" event
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = true;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepadconnected', {
                gamepad: virtualGamepad,
            });
    }

    stop = () => {

        // Dispatch "gamepaddisconnected" event
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = false;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepaddisconnected', {
                gamepad: virtualGamepad,
            });

        window.navigator.getGamepads = this.#nativeGetGamepads;

        this.#resetGamepad();

        window.removeEventListener('keyup', this.#onKeyboardEvent);

        window.removeEventListener('mousemove', this.#onMouseMoveEvent);
        window.removeEventListener('mousedown', this.#onMouseEvent);
        window.removeEventListener('mouseup', this.#onMouseEvent);
        window.removeEventListener('wheel', this.#onWheelEvent);
        window.removeEventListener('contextmenu', this.#disableContextMenu);
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            // Enable MKB
            if (getPref(PrefKey.MKB_ENABLED)) {
                console.log('Emulate MKB');
                MkbHandler.INSTANCE.init();
            }
        });
    }
}
