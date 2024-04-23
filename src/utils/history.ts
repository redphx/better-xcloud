import { BxEvent } from "../modules/bx-event";
import { LoadingScreen } from "../modules/loading-screen";
import { RemotePlay } from "../modules/remote-play";
import { checkHeader } from "../modules/ui/header";

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

    setTimeout(RemotePlay.detect, 10);

    const $settings = document.querySelector('.bx-settings-container');
    if ($settings) {
        $settings.classList.add('bx-gone');
    }

    // Hide Remote Play popup
    RemotePlay.detachPopup();

    LoadingScreen.reset();
    setTimeout(checkHeader, 2000);

    BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}
