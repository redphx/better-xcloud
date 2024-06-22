import { AppInterface } from "@utils/global";
import { BxEvent } from "@utils/bx-event";
import { PrefKey, getPref } from "@utils/preferences";

const VIBRATION_DATA_MAP = {
    'gamepadIndex': 8,
    'leftMotorPercent': 8,
    'rightMotorPercent': 8,
    'leftTriggerMotorPercent': 8,
    'rightTriggerMotorPercent': 8,
    'durationMs': 16,
    // 'delayMs': 16,
    // 'repeat': 8,
};

type VibrationData = {
    [key in keyof typeof VIBRATION_DATA_MAP]?: number;
}

export class VibrationManager {
    static #playDeviceVibration(data: Required<VibrationData>) {
        // console.log(+new Date, data);

        if (AppInterface) {
            AppInterface.vibrate(JSON.stringify(data), window.BX_VIBRATION_INTENSITY);
            return;
        }

        const intensity = Math.min(100, data.leftMotorPercent + data.rightMotorPercent / 2) * window.BX_VIBRATION_INTENSITY;
        if (intensity === 0 || intensity === 100) {
            // Stop vibration
            window.navigator.vibrate(intensity ? data.durationMs : 0);
            return;
        }

        const pulseDuration = 200;
        const onDuration = Math.floor(pulseDuration * intensity / 100);
        const offDuration = pulseDuration - onDuration;

        const repeats = Math.ceil(data.durationMs / pulseDuration);

        const pulses = Array(repeats).fill([onDuration, offDuration]).flat();
        // console.log(pulses);

        window.navigator.vibrate(pulses);
    }

    static supportControllerVibration() {
        return Gamepad.prototype.hasOwnProperty('vibrationActuator');
    }

    static supportDeviceVibration() {
        return !!window.navigator.vibrate;
    }

    static updateGlobalVars(stopVibration: boolean = true) {
        window.BX_ENABLE_CONTROLLER_VIBRATION = VibrationManager.supportControllerVibration() ? getPref(PrefKey.CONTROLLER_ENABLE_VIBRATION) : false;
        window.BX_VIBRATION_INTENSITY = getPref(PrefKey.CONTROLLER_VIBRATION_INTENSITY) / 100;

        if (!VibrationManager.supportDeviceVibration()) {
            window.BX_ENABLE_DEVICE_VIBRATION = false;
            return;
        }

        // Stop vibration
        stopVibration && window.navigator.vibrate(0);

        const value = getPref(PrefKey.CONTROLLER_DEVICE_VIBRATION);
        let enabled;

        if (value === 'on') {
            enabled = true;
        } else if (value === 'auto') {
            enabled = true;
            const gamepads = window.navigator.getGamepads();
            for (const gamepad of gamepads) {
                if (gamepad) {
                    enabled = false;
                    break;
                }
            }
        } else {
            enabled = false;
        }

        window.BX_ENABLE_DEVICE_VIBRATION = enabled;
    }

    static #onMessage(e: MessageEvent) {
        if (!window.BX_ENABLE_DEVICE_VIBRATION) {
            return;
        }

        if (typeof e !== 'object' || !(e.data instanceof ArrayBuffer)) {
            return;
        }

        const dataView = new DataView(e.data);
        let offset = 0;

        let messageType;
        if (dataView.byteLength === 13) { // version >= 8
            messageType = dataView.getUint16(offset, true);
            offset += Uint16Array.BYTES_PER_ELEMENT;
        } else {
            messageType = dataView.getUint8(offset);
            offset += Uint8Array.BYTES_PER_ELEMENT;
        }

        if (!(messageType & 128)) { // Vibration
            return;
        }

        const vibrationType = dataView.getUint8(offset);
        offset += Uint8Array.BYTES_PER_ELEMENT;

        if (vibrationType !== 0) { // FourMotorRumble
            return;
        }

        const data: VibrationData = {};
        let key: keyof typeof VIBRATION_DATA_MAP;
        for (key in VIBRATION_DATA_MAP) {
            if (VIBRATION_DATA_MAP[key] === 16) {
                data[key] = dataView.getUint16(offset, true);
                offset += Uint16Array.BYTES_PER_ELEMENT;
            } else {
                data[key] = dataView.getUint8(offset);
                offset += Uint8Array.BYTES_PER_ELEMENT;
            }
        }

        VibrationManager.#playDeviceVibration(data as Required<VibrationData>);
    }

    static initialSetup() {
        window.addEventListener('gamepadconnected', e => VibrationManager.updateGlobalVars());
        window.addEventListener('gamepaddisconnected', e => VibrationManager.updateGlobalVars());

        VibrationManager.updateGlobalVars(false);

        window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, e => {
            const dataChannel = (e as any).dataChannel;
            if (!dataChannel || dataChannel.label !== 'input') {
                return;
            }

            dataChannel.addEventListener('message', VibrationManager.#onMessage);
        });
    }
}
