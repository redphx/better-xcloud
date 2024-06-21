import "@utils/global";
import { BxEvent } from "@utils/bx-event";
import { BX_FLAGS } from "@utils/bx-flags";
import { BxExposed } from "@utils/bx-exposed";
import { t } from "@utils/translation";
import { interceptHttpRequests } from "@utils/network";
import { CE } from "@utils/html";
import { showGamepadToast } from "@utils/gamepad";
import { EmulatedMkbHandler } from "@modules/mkb/mkb-handler";
import { StreamBadges } from "@modules/stream/stream-badges";
import { StreamStats } from "@modules/stream/stream-stats";
import { addCss } from "@utils/css";
import { Toast } from "@utils/toast";
import { setupStreamUi, updateVideoPlayer } from "@modules/ui/ui";
import { PrefKey, getPref } from "@utils/preferences";
import { LoadingScreen } from "@modules/loading-screen";
import { MouseCursorHider } from "@modules/mkb/mouse-cursor-hider";
import { TouchController } from "@modules/touch-controller";
import { watchHeader } from "@modules/ui/header";
import { checkForUpdate, disablePwa } from "@utils/utils";
import { Patcher } from "@modules/patcher";
import { RemotePlay } from "@modules/remote-play";
import { onHistoryChanged, patchHistoryMethod } from "@utils/history";
import { VibrationManager } from "@modules/vibration-manager";
import { overridePreloadState } from "@utils/preload-state";
import { patchAudioContext, patchCanvasContext, patchMeControl, patchPointerLockApi, patchRtcCodecs, patchRtcPeerConnection, patchVideoApi } from "@utils/monkey-patches";
import { AppInterface, STATES } from "@utils/global";
import { injectStreamMenuButtons } from "@modules/stream/stream-ui";
import { BxLogger } from "@utils/bx-logger";
import { GameBar } from "./modules/game-bar/game-bar";
import { Screenshot } from "./utils/screenshot";
import { NativeMkbHandler } from "./modules/mkb/native-mkb-handler";
import { GuideMenu, GuideMenuTab } from "./modules/ui/guide-menu";


// Handle login page
if (window.location.pathname.includes('/auth/msa')) {
    window.addEventListener('load', e => {
            window.location.search.includes('loggedIn') && window.setTimeout(() => {
                const location = window.location;
                // @ts-ignore
                location.pathname.includes('/play') && location.reload(true);
            }, 2000);
        });
    // Stop processing the script
    throw new Error('[Better xCloud] Refreshing the page after logging in');
}

BxLogger.info('readyState', document.readyState);

if (BX_FLAGS.SafariWorkaround && document.readyState !== 'loading') {
    // Stop loading
    window.stop();

    // Show the reloading overlay
    const css = `
.bx-reload-overlay {
    position: fixed;
    top: 0;
    background: #000000cc;
    z-index: 9999;
    width: 100%;
    line-height: 100vh;
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 1.3rem;
}
`;
    const $fragment = document.createDocumentFragment();
    $fragment.appendChild(CE('style', {}, css));
    $fragment.appendChild(CE('div', {'class': 'bx-reload-overlay'}, t('safari-failed-message')));

    document.documentElement.appendChild($fragment);

    // Reload the page
    // @ts-ignore
    window.location.reload(true);

    // Stop processing the script
    throw new Error('[Better xCloud] Executing workaround for Safari');
}

// Automatically reload the page when running into the "We are sorry..." error message
window.addEventListener('load', e => {
    window.setTimeout(() => {
        if (document.body.classList.contains('legacyBackground')) {
            // Has error message -> reload page
            window.stop();
            // @ts-ignore
            window.location.reload(true);
        }
    }, 3000);
});

window.BX_EXPOSED = BxExposed;

// Hide Settings UI when navigate to another page
// @ts-ignore
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener('popstate', onHistoryChanged);

// Make pushState/replaceState methods dispatch BxEvent.POPSTATE event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

window.addEventListener(BxEvent.XCLOUD_SERVERS_READY, e => {
    // Start rendering UI
    if (document.querySelector('div[class^=UnsupportedMarketPage]')) {
        window.setTimeout(watchHeader, 2000);
    } else {
        watchHeader();
    }
});

window.addEventListener(BxEvent.STREAM_LOADING, e => {
    // Get title ID for screenshot's name
    if (window.location.pathname.includes('/launch/')) {
        const matches = /\/launch\/(?<title_id>[^\/]+)\/(?<product_id>\w+)/.exec(window.location.pathname);
        if (matches?.groups) {
            STATES.currentStream.titleId = matches.groups.title_id;
            STATES.currentStream.productId = matches.groups.product_id;
        }
    } else {
        STATES.currentStream.titleId = 'remote-play';
        STATES.currentStream.productId = '';
    }

    // Setup UI
    setupStreamUi();
});

// Setup loading screen
getPref(PrefKey.UI_LOADING_SCREEN_GAME_ART) && window.addEventListener(BxEvent.TITLE_INFO_READY, LoadingScreen.setup);

window.addEventListener(BxEvent.STREAM_STARTING, e => {
    // Hide loading screen
    LoadingScreen.hide();

    // Start hiding cursor
    if (!getPref(PrefKey.MKB_ENABLED) && getPref(PrefKey.MKB_HIDE_IDLE_CURSOR)) {
        MouseCursorHider.start();
        MouseCursorHider.hide();
    }
});

window.addEventListener(BxEvent.STREAM_PLAYING, e => {
    STATES.isPlaying = true;
    injectStreamMenuButtons();

    if (getPref(PrefKey.GAME_BAR_POSITION) !== 'off') {
        const gameBar = GameBar.getInstance();
        gameBar.reset();
        gameBar.enable();
        gameBar.showBar();
    }

    const $video = (e as any).$video as HTMLVideoElement;
    Screenshot.updateCanvasSize($video.videoWidth, $video.videoHeight);

    updateVideoPlayer();
});

window.addEventListener(BxEvent.STREAM_ERROR_PAGE, e => {
    BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});

function unload() {
    if (!STATES.isPlaying) {
        return;
    }

    // Stop MKB listeners
    EmulatedMkbHandler.getInstance().destroy();
    NativeMkbHandler.getInstance().destroy();

    // Destroy StreamPlayer
    STATES.currentStream.streamPlayer?.destroy();

    STATES.isPlaying = false;
    STATES.currentStream = {};
    window.BX_EXPOSED.shouldShowSensorControls = false;
    window.BX_EXPOSED.stopTakRendering = false;

    const $streamSettingsDialog = document.querySelector('.bx-stream-settings-dialog');
    if ($streamSettingsDialog) {
        $streamSettingsDialog.classList.add('bx-gone');
    }

    StreamStats.getInstance().onStoppedPlaying();

    MouseCursorHider.stop();
    TouchController.reset();
    GameBar.getInstance().disable();
}

window.addEventListener(BxEvent.STREAM_STOPPED, unload);
window.addEventListener('pagehide', e => {
    BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});

window.addEventListener(BxEvent.CAPTURE_SCREENSHOT, e => {
    Screenshot.takeScreenshot();
});


function observeRootDialog($root: HTMLElement) {
    let currentShown = false;

    const observer = new MutationObserver(mutationList => {
        for (const mutation of mutationList) {
            if (mutation.type !== 'childList') {
                continue;
            }

            if (mutation.addedNodes.length === 1) {
                const $addedElm = mutation.addedNodes[0];
                if ($addedElm instanceof HTMLElement && $addedElm.className) {
                    if ($addedElm.className.startsWith('NavigationAnimation') || $addedElm.className.startsWith('DialogRoutes') || $addedElm.className.startsWith('Dialog-module__container')) {
                        // Make sure it's Guide dialog
                        if (document.querySelector('#gamepass-dialog-root div[class*=GuideDialog]')) {
                            // Find navigation bar
                            const $selectedTab = $addedElm.querySelector('div[class^=NavigationMenu] button[aria-selected=true');
                            if ($selectedTab) {
                                let $elm: Element | null = $selectedTab;
                                let index;
                                for (index = 0; ($elm = $elm?.previousElementSibling); index++);

                                if (index === 0) {
                                    BxEvent.dispatch(window, BxEvent.XCLOUD_GUIDE_MENU_SHOWN, {where: GuideMenuTab.HOME});
                                }
                            }
                        }
                    }
                }
            }

            const shown = ($root.firstElementChild && $root.firstElementChild.childElementCount > 0) || false;
            if (shown !== currentShown) {
                currentShown = shown;
                BxEvent.dispatch(window, shown ? BxEvent.XCLOUD_DIALOG_SHOWN : BxEvent.XCLOUD_DIALOG_DISMISSED);
            }
        }
    });
    observer.observe($root, {subtree: true, childList: true});
}

function waitForRootDialog() {
    const observer = new MutationObserver(mutationList => {
        for (const mutation of mutationList) {
            if (mutation.type !== 'childList') {
                continue;
            }

            const $target = mutation.target as HTMLElement;
            if ($target.id && $target.id === 'gamepass-dialog-root') {
                observer.disconnect();
                observeRootDialog($target);
                break;
            }
        };
    });
    observer.observe(document.documentElement, {subtree: true, childList: true});
}


function main() {
    waitForRootDialog();

    // Monkey patches
    patchRtcPeerConnection();
    patchRtcCodecs();
    interceptHttpRequests();
    patchVideoApi();
    patchCanvasContext();
    AppInterface && patchPointerLockApi();

    getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && patchAudioContext();
    getPref(PrefKey.BLOCK_TRACKING) && patchMeControl();

    STATES.userAgentHasTouchSupport && TouchController.updateCustomList();
    overridePreloadState();

    VibrationManager.initialSetup();

    // Check for Update
    BX_FLAGS.CheckForUpdate && checkForUpdate();

    // Setup UI
    addCss();
    Toast.setup();
    (getPref(PrefKey.GAME_BAR_POSITION) !== 'off') && GameBar.getInstance();
    BX_FLAGS.PreloadUi && setupStreamUi();

    GuideMenu.observe();
    StreamBadges.setupEvents();
    StreamStats.setupEvents();
    EmulatedMkbHandler.setupEvents();

    Patcher.init();

    disablePwa();

    // Show a toast when connecting/disconecting controller
    window.addEventListener('gamepadconnected', e => showGamepadToast(e.gamepad));
    window.addEventListener('gamepaddisconnected', e => showGamepadToast(e.gamepad));

    // Preload Remote Play
    if (getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
        RemotePlay.detect();
    }

    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all') {
        TouchController.setup();
    }

    // Start PointerProviderServer
    if (getPref(PrefKey.MKB_ENABLED) && AppInterface) {
        STATES.pointerServerPort = AppInterface.startPointerServer() || 9269;
        BxLogger.info('startPointerServer', 'Port', STATES.pointerServerPort.toString());
    }
}

main();
