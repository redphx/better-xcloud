import { AppInterface, STATES } from "@utils/global";
import { BxEvent } from "@utils/bx-event";
import { StreamSettings } from "@/utils/stream-settings";
import { EventBus } from "@/utils/event-bus";

const VIBRATION_DATA_MAP = {
    gamepadIndex: 8,
    leftMotorPercent: 8,
    rightMotorPercent: 8,
    leftTriggerMotorPercent: 8,
    rightTriggerMotorPercent: 8,
    durationMs: 16,
    // delayMs: 16,
    // repeat: 8,
};

type VibrationData = {
    [key in keyof typeof VIBRATION_DATA_MAP]?: number;
}

export class DeviceVibrationManager {
    private static instance: DeviceVibrationManager | null | undefined;
    public static getInstance(): typeof DeviceVibrationManager['instance'] {
        if (typeof DeviceVibrationManager.instance === 'undefined') {
            if (STATES.browser.capabilities.deviceVibration) {
                DeviceVibrationManager.instance = new DeviceVibrationManager();
            } else {
                DeviceVibrationManager.instance = null;
            }
        }

        return DeviceVibrationManager.instance;
    }

    private dataChannel: RTCDataChannel | null = null;
    private boundOnMessage: (e: MessageEvent) => void;

    constructor() {
        this.boundOnMessage = this.onMessage.bind(this);

        window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, e => {
            const dataChannel = (e as any).dataChannel as RTCDataChannel;
            if (dataChannel?.label === 'input') {
                this.reset();

                this.dataChannel = dataChannel;
                this.setupDataChannel();
            }
        });

        EventBus.Script.on('deviceVibrationUpdated', () => this.setupDataChannel());
    }

    private setupDataChannel() {
        if (!this.dataChannel) {
            return;
        }

        this.removeEventListeners();

        if (window.BX_STREAM_SETTINGS.deviceVibrationIntensity > 0) {
            this.dataChannel.addEventListener('message', this.boundOnMessage);
        }
    }

    private playVibration(data: Required<VibrationData>) {
        const vibrationIntensity = StreamSettings.settings.deviceVibrationIntensity;
        if (AppInterface) {
            AppInterface.vibrate(JSON.stringify(data), vibrationIntensity);
            return;
        }

        const realIntensity = Math.min(100, data.leftMotorPercent + data.rightMotorPercent / 2) * vibrationIntensity;
        if (realIntensity === 0 || realIntensity === 100) {
            // Stop vibration
            window.navigator.vibrate(realIntensity ? data.durationMs : 0);
            return;
        }

        const pulseDuration = 200;
        const onDuration = Math.floor(pulseDuration * realIntensity / 100);
        const offDuration = pulseDuration - onDuration;

        const repeats = Math.ceil(data.durationMs / pulseDuration);
        const pulses = Array(repeats).fill([onDuration, offDuration]).flat();

        window.navigator.vibrate(pulses);
    }

    onMessage(e: MessageEvent) {
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

        this.playVibration(data as Required<VibrationData>);
    }

    private removeEventListeners() {
        // Clear event listeners in previous DataChannel
        try {
            this.dataChannel?.removeEventListener('message', this.boundOnMessage);
        } catch (e) {}
    }

    reset() {
        this.removeEventListeners();
        this.dataChannel = null;
    }
}
