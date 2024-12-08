import type { PrefKey, StorageKey } from "@/enums/pref-keys";
import { BX_FLAGS } from "./bx-flags";
import { BxLogger } from "./bx-logger";

type EventCallback<T = any> = (payload: T) => void;

type ScriptEvents = {
    xcloudServerReady: {};
    xcloudServerUnavailable: {};

    titleInfoReady: {};
    settingChanged: {
        storageKey: StorageKey;
        settingKey: PrefKey;
        settingValue: any;
    };

    mkbSettingUpdated: {};
    keyboardShortcutsUpdated: {};
    deviceVibrationUpdated: {};

    // GH pages
    listForcedNativeMkbUpdated: {};
};

type StreamEvents = {
    stateLoading: {};
    stateStarting: {};
    statePlaying: { $video?: HTMLVideoElement };
    stateStopped: {};
    stateError: {};
};

export class EventBus<TEvents extends Record<string, any>> {
    private listeners: Map<keyof TEvents, Set<EventCallback<any>>> = new Map();

    static readonly Script = new EventBus<ScriptEvents>();
    static readonly Stream = new EventBus<StreamEvents>();

    on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        BX_FLAGS.Debug && BxLogger.warning('EventBus', 'on', event, callback);
    }

    off<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]> | null): void {
        BX_FLAGS.Debug && BxLogger.warning('EventBus', 'off', event, callback);

        if (!callback) {
            // Remove all listener callbacks
            this.listeners.delete(event);
            return;
        }

        const callbacks = this.listeners.get(event);
        if (!callbacks) {
            return;
        }

        callbacks.delete(callback);
        if (callbacks.size === 0) {
            this.listeners.delete(event);
        }
    }

    offAll(): void {
        this.listeners.clear();
    }

    emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
        BX_FLAGS.Debug && BxLogger.warning('EventBus', 'emit', event, payload);

        const callbacks = this.listeners.get(event) || [];
        for (const callback of callbacks) {
            callback(payload);
        }
    }
}
