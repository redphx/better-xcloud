import { AppInterface } from "@utils/global";

export enum BxEvent {
    JUMP_BACK_IN_READY = 'bx-jump-back-in-ready',
    POPSTATE = 'bx-popstate',

    TITLE_INFO_READY = 'bx-title-info-ready',

    STREAM_LOADING = 'bx-stream-loading',
    STREAM_STARTING = 'bx-stream-starting',
    STREAM_STARTED = 'bx-stream-started',
    STREAM_PLAYING = 'bx-stream-playing',
    STREAM_STOPPED = 'bx-stream-stopped',
    STREAM_ERROR_PAGE = 'bx-stream-error-page',

    STREAM_WEBRTC_CONNECTED = 'bx-stream-webrtc-connected',
    STREAM_WEBRTC_DISCONNECTED = 'bx-stream-webrtc-disconnected',

    // STREAM_EVENT_TARGET_READY = 'bx-stream-event-target-ready',
    STREAM_SESSION_READY = 'bx-stream-session-ready',

    CUSTOM_TOUCH_LAYOUTS_LOADED = 'bx-custom-touch-layouts-loaded',
    TOUCH_LAYOUT_MANAGER_READY = 'bx-touch-layout-manager-ready',

    REMOTE_PLAY_READY = 'bx-remote-play-ready',
    REMOTE_PLAY_FAILED = 'bx-remote-play-failed',

    XCLOUD_SERVERS_READY = 'bx-servers-ready',

    DATA_CHANNEL_CREATED = 'bx-data-channel-created',

    GAME_BAR_ACTION_ACTIVATED = 'bx-game-bar-action-activated',
    MICROPHONE_STATE_CHANGED = 'bx-microphone-state-changed',

    CAPTURE_SCREENSHOT = 'bx-capture-screenshot',
    GAINNODE_VOLUME_CHANGED = 'bx-gainnode-volume-changed',

    POINTER_LOCK_REQUESTED = 'bx-pointer-lock-requested',
    POINTER_LOCK_EXITED = 'bx-pointer-lock-exited',

    // xCloud Dialog events
    XCLOUD_DIALOG_SHOWN = 'bx-xcloud-dialog-shown',
    XCLOUD_DIALOG_DISMISSED = 'bx-xcloud-dialog-dismissed',

    XCLOUD_GUIDE_MENU_SHOWN = 'bx-xcloud-guide-menu-shown',

    XCLOUD_POLLING_MODE_CHANGED = 'bx-xcloud-polling-mode-changed',
}

export enum XcloudEvent {
    MICROPHONE_STATE_CHANGED = 'microphoneStateChanged',
}

export namespace BxEvent {
    export function dispatch(target: HTMLElement | Window, eventName: string, data?: any) {
        if (!eventName) {
            alert('BxEvent.dispatch(): eventName is null');
            return;
        }

        const event = new Event(eventName);

        if (data) {
            for (const key in data) {
                (event as any)[key] = data[key];
            }
        }

        target.dispatchEvent(event);
        AppInterface && AppInterface.onEvent(eventName);
    }
}

(window as any).BxEvent = BxEvent;
