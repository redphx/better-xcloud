import { BxEvent } from "@utils/bx-event";
import { LoadingScreen } from "@modules/loading-screen";
import { RemotePlay } from "@modules/remote-play";
import { HeaderSection } from "@/modules/ui/header";
import { StreamSettings } from "@/modules/stream/stream-settings";

export function patchHistoryMethod(type: 'pushState' | 'replaceState') {
    const orig = window.history[type];

    return function(...args: any[]) {
        BxEvent.dispatch(window, BxEvent.POPSTATE, {
                arguments: args,
            });

        // @ts-ignore
        return orig.apply(this, arguments);
    };
};


export function onHistoryChanged(e: PopStateEvent) {
    // @ts-ignore
    if (e && e.arguments && e.arguments[0] && e.arguments[0].origin === 'better-xcloud') {
        return;
    }

    window.setTimeout(RemotePlay.detect, 10);

    // Hide Global settings
    const $settings = document.querySelector('.bx-settings-container');
    if ($settings) {
        $settings.classList.add('bx-gone');
    }

    // Hide Stream settings
    if (document.querySelector('.' + StreamSettings.MAIN_CLASS)) {
        StreamSettings.getInstance().hide();
    }

    // Hide Remote Play popup
    RemotePlay.detachPopup();

    LoadingScreen.reset();
    window.setTimeout(HeaderSection.watchHeader, 2000);

    BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}
