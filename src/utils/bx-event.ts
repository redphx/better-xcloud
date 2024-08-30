import { AppInterface } from "@utils/global";


export namespace BxEvent {
    export const JUMP_BACK_IN_READY = 'bx-jump-back-in-ready';
    export const POPSTATE = 'bx-popstate';

    export const TITLE_INFO_READY = 'bx-title-info-ready';

    export const SETTINGS_CHANGED = 'bx-settings-changed';

    export const STREAM_LOADING = 'bx-stream-loading';
    export const STREAM_STARTING = 'bx-stream-starting';
    export const STREAM_STARTED = 'bx-stream-started';
    export const STREAM_PLAYING = 'bx-stream-playing';
    export const STREAM_STOPPED = 'bx-stream-stopped';
    export const STREAM_ERROR_PAGE = 'bx-stream-error-page';

    export const STREAM_WEBRTC_CONNECTED = 'bx-stream-webrtc-connected';
    export const STREAM_WEBRTC_DISCONNECTED = 'bx-stream-webrtc-disconnected';

    // export const STREAM_EVENT_TARGET_READY = 'bx-stream-event-target-ready';
    export const STREAM_SESSION_READY = 'bx-stream-session-ready';

    export const CUSTOM_TOUCH_LAYOUTS_LOADED = 'bx-custom-touch-layouts-loaded';
    export const TOUCH_LAYOUT_MANAGER_READY = 'bx-touch-layout-manager-ready';

    export const REMOTE_PLAY_READY = 'bx-remote-play-ready';
    export const REMOTE_PLAY_FAILED = 'bx-remote-play-failed';

    export const XCLOUD_SERVERS_READY = 'bx-servers-ready';
    export const XCLOUD_SERVERS_UNAVAILABLE = 'bx-servers-unavailable';

    export const DATA_CHANNEL_CREATED = 'bx-data-channel-created';

    export const GAME_BAR_ACTION_ACTIVATED = 'bx-game-bar-action-activated';
    export const MICROPHONE_STATE_CHANGED = 'bx-microphone-state-changed';

    export const CAPTURE_SCREENSHOT = 'bx-capture-screenshot';

    export const POINTER_LOCK_REQUESTED = 'bx-pointer-lock-requested';
    export const POINTER_LOCK_EXITED = 'bx-pointer-lock-exited';

    export const NAVIGATION_FOCUS_CHANGED = 'bx-nav-focus-changed';

    // xCloud Dialog events
    export const XCLOUD_DIALOG_SHOWN = 'bx-xcloud-dialog-shown';
    export const XCLOUD_DIALOG_DISMISSED = 'bx-xcloud-dialog-dismissed';

    export const XCLOUD_GUIDE_MENU_SHOWN = 'bx-xcloud-guide-menu-shown';

    export const XCLOUD_POLLING_MODE_CHANGED = 'bx-xcloud-polling-mode-changed';

    export const XCLOUD_RENDERING_COMPONENT = 'bx-xcloud-rendering-component';

    export const XCLOUD_ROUTER_HISTORY_READY = 'bx-xcloud-router-history-ready';

    export function dispatch(target: Element | Window | null, eventName: string, data?: any) {
        if (!target) {
            return;
        }

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
