import { AppInterface } from "./global";

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

    STREAM_MENU_SHOWN = 'bx-stream-menu-shown',
    STREAM_MENU_HIDDEN = 'bx-stream-menu-hidden',

    STREAM_WEBRTC_CONNECTED = 'bx-stream-webrtc-connected',
    STREAM_WEBRTC_DISCONNECTED = 'bx-stream-webrtc-disconnected',

    CUSTOM_TOUCH_LAYOUTS_LOADED = 'bx-custom-touch-layouts-loaded',

    REMOTE_PLAY_READY = 'bx-remote-play-ready',
    REMOTE_PLAY_FAILED = 'bx-remote-play-failed',

    XCLOUD_SERVERS_READY = 'bx-servers-ready',

    DATA_CHANNEL_CREATED = 'bx-data-channel-created',
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

        AppInterface && AppInterface.onEvent(eventName);
        target.dispatchEvent(event);
    }
}
