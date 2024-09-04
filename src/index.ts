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
import { addCss, preloadFonts } from "@utils/css";
import { Toast } from "@utils/toast";
import { LoadingScreen } from "@modules/loading-screen";
import { MouseCursorHider } from "@modules/mkb/mouse-cursor-hider";
import { TouchController } from "@modules/touch-controller";
import { checkForUpdate, disablePwa, productTitleToSlug } from "@utils/utils";
import { Patcher } from "@modules/patcher";
import { RemotePlay } from "@modules/remote-play";
import { onHistoryChanged, patchHistoryMethod } from "@utils/history";
import { VibrationManager } from "@modules/vibration-manager";
import { overridePreloadState } from "@utils/preload-state";
import { disableAdobeAudienceManager, patchAudioContext, patchCanvasContext, patchMeControl, patchPointerLockApi, patchRtcCodecs, patchRtcPeerConnection, patchVideoApi } from "@utils/monkey-patches";
import { AppInterface, STATES } from "@utils/global";
import { BxLogger } from "@utils/bx-logger";
import { GameBar } from "./modules/game-bar/game-bar";
import { Screenshot } from "./utils/screenshot";
import { NativeMkbHandler } from "./modules/mkb/native-mkb-handler";
import { GuideMenu, GuideMenuTab } from "./modules/ui/guide-menu";
import { updateVideoPlayer } from "./modules/stream/stream-settings-utils";
import { UiSection } from "./enums/ui-sections";
import { HeaderSection } from "./modules/ui/header";
import { GameTile } from "./modules/ui/game-tile";
import { ProductDetailsPage } from "./modules/ui/product-details";
import { NavigationDialogManager } from "./modules/ui/dialog/navigation-dialog";
import { PrefKey } from "./enums/pref-keys";
import { getPref, StreamTouchController } from "./utils/settings-storages/global-settings-storage";
import { compressCss } from "@macros/build" with {type: "macro"};
import { SettingsNavigationDialog } from "./modules/ui/dialog/settings-dialog";
import { StreamUiHandler } from "./modules/stream/stream-ui";
import { UserAgent } from "./utils/user-agent";
import { XboxApi } from "./utils/xbox-api";
import { TrueAchievements } from "./utils/true-achievements";


// Handle login page
if (window.location.pathname.includes('/auth/msa')) {
    const nativePushState = window.history['pushState'];
    window.history['pushState'] = function(...args: any[]) {
        const url = args[2];
        if (url && (url.startsWith('/play') || url.substring(6).startsWith('/play'))) {
            console.log('Redirecting to xbox.com/play');
            window.stop();
            window.location.href = 'https://www.xbox.com' + url;
            return;
        }

        // @ts-ignore
        return nativePushState.apply(this, arguments);
    }
    // Stop processing the script
    throw new Error('[Better xCloud] Refreshing the page after logging in');
}

BxLogger.info('readyState', document.readyState);

if (BX_FLAGS.SafariWorkaround && document.readyState !== 'loading') {
    // Stop loading
    window.stop();

    // Show the reloading overlay
    const css = compressCss(`
.bx-reload-overlay {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    background: #000000cc;
    z-index: 9999;
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 1.3rem;
}

.bx-reload-overlay *:focus {
    outline: none !important;
}

.bx-reload-overlay > div {
    margin: 0 auto;
}

.bx-reload-overlay a {
    text-decoration: none;
    display: inline-block;
    background: #107c10;
    color: white;
    border-radius: 4px;
    padding: 6px;
}
`);

    const isSafari = UserAgent.isSafari();
    let $secondaryAction: HTMLElement;
    if (isSafari) {
        $secondaryAction = CE('p', {}, t('settings-reloading'));
    } else {
        $secondaryAction = CE('a', {
            href: 'https://better-xcloud.github.io/troubleshooting',
            target: '_blank',
        }, '🤓 ' + t('how-to-fix'));
    }

    const $fragment = document.createDocumentFragment();
    $fragment.appendChild(CE('style', {}, css));
    $fragment.appendChild(CE('div',{
        class: 'bx-reload-overlay',
    },
        CE('div', {},
            CE('p', {}, t('load-failed-message')),
            $secondaryAction,
        ),
    ));

    document.documentElement.appendChild($fragment);

    // Reload the page if using Safari
    // @ts-ignore
    isSafari && window.location.reload(true);

    // Stop processing the script
    throw new Error('[Better xCloud] Executing workaround for Safari');
}

window.addEventListener('load', e => {
    // Automatically reload the page when running into the "We are sorry..." error message
    window.setTimeout(() => {
        if (document.body.classList.contains('legacyBackground')) {
            // Has error message -> reload page
            window.stop();
            // @ts-ignore
            window.location.reload(true);
        }
    }, 3000);
});

document.addEventListener('readystatechange', e => {
    if (document.readyState !== 'interactive') {
        return;
    }

    STATES.isSignedIn = !!((window as any).xbcUser?.isSignedIn);

    if (STATES.isSignedIn) {
        // Preload Remote Play
        getPref(PrefKey.REMOTE_PLAY_ENABLED) && RemotePlay.preload();
    } else {
        // Show Settings button in the header when not signed in
        window.setTimeout(HeaderSection.watchHeader, 2000);
    }

    // Hide "Play with Friends" skeleton section
    if (getPref(PrefKey.UI_HIDE_SECTIONS).includes(UiSection.FRIENDS)) {
        const $parent = document.querySelector('div[class*=PlayWithFriendsSkeleton]')?.closest('div[class*=HomePage-module]') as HTMLElement;
        $parent && ($parent.style.display = 'none');
    }

    // Preload fonts
    preloadFonts();
})

window.BX_EXPOSED = BxExposed;

// Hide Settings UI when navigate to another page
// @ts-ignore
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener('popstate', onHistoryChanged);

// Make pushState/replaceState methods dispatch BxEvent.POPSTATE event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

window.addEventListener(BxEvent.XCLOUD_SERVERS_UNAVAILABLE, e => {
    STATES.supportedRegion = false;
    window.setTimeout(HeaderSection.watchHeader, 2000);

    // Open Settings dialog on Unsupported page
    SettingsNavigationDialog.getInstance().show();
});

window.addEventListener(BxEvent.XCLOUD_SERVERS_READY, e => {
    STATES.isSignedIn = true;
    window.setTimeout(HeaderSection.watchHeader, 2000);
});

window.addEventListener(BxEvent.STREAM_LOADING, e => {
    // Get title ID for screenshot's name
    if (window.location.pathname.includes('/launch/') && STATES.currentStream.titleInfo) {
        STATES.currentStream.titleSlug = productTitleToSlug(STATES.currentStream.titleInfo.product.title);
    } else {
        STATES.currentStream.titleSlug = 'remote-play';
    }
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
    StreamUiHandler.observe();

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

window.addEventListener(BxEvent.XCLOUD_RENDERING_COMPONENT, e => {
    const component = (e as any).component;
    if (component === 'product-details') {
        ProductDetailsPage.injectButtons();
    }
});

// Detect game change
window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, e => {
    const dataChannel = (e as any).dataChannel;
    if (!dataChannel || dataChannel.label !== 'message') {
        return;
    }

    dataChannel.addEventListener('message', async (msg: MessageEvent) => {
        if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
            return;
        }

        // Get xboxTitleId from message
        if (msg.data.includes('/titleinfo')) {
            const json = JSON.parse(JSON.parse(msg.data).content);
            const xboxTitleId = parseInt(json.titleid, 16);
            STATES.currentStream.xboxTitleId = xboxTitleId;

            // Get titleSlug for Remote Play
            if (STATES.remotePlay.isPlaying) {
                STATES.currentStream.titleSlug = 'remote-play';
                if (json.focused) {
                    const productTitle = await XboxApi.getProductTitle(xboxTitleId);
                    if (productTitle) {
                        STATES.currentStream.titleSlug = productTitleToSlug(productTitle);
                    }
                }
            }
        }
    });
});

function unload() {
    if (!STATES.isPlaying && !Object.keys(STATES.currentStream).length) {
        return;
    }

    STATES.isPlaying = false;
    STATES.currentStream = {};

    // Stop MKB listeners
    EmulatedMkbHandler.getInstance().destroy();
    NativeMkbHandler.getInstance().destroy();

    // Destroy StreamPlayer
    STATES.currentStream.streamPlayer?.destroy();

    window.BX_EXPOSED.shouldShowSensorControls = false;
    window.BX_EXPOSED.stopTakRendering = false;

    NavigationDialogManager.getInstance().hide();
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
    let beingShown = false;

    const observer = new MutationObserver(mutationList => {
        for (const mutation of mutationList) {
            if (mutation.type !== 'childList') {
                continue;
            }

            console.log('added', mutation.addedNodes);
            if (mutation.addedNodes.length === 1) {
                const $addedElm = mutation.addedNodes[0];
                if ($addedElm instanceof HTMLElement && $addedElm.className) {
                    if ($addedElm.className.startsWith('NavigationAnimation') || $addedElm.className.startsWith('DialogRoutes') || $addedElm.className.startsWith('Dialog-module__container')) {
                        // Make sure it's Guide dialog
                        if (document.querySelector('#gamepass-dialog-root div[class*=GuideDialog]')) {
                            // Achievement Details page
                            const $achievDetailPage = $addedElm.querySelector('div[class*=AchievementDetailPage]');
                            if ($achievDetailPage) {
                                TrueAchievements.injectAchievementDetailPage($achievDetailPage as HTMLElement);
                            } else {
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
            }

            const shown = ($root.firstElementChild && $root.firstElementChild.childElementCount > 0) || false;
            if (shown !== beingShown) {
                beingShown = shown;
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

    if (getPref(PrefKey.BLOCK_TRACKING)) {
        patchMeControl();
        disableAdobeAudienceManager();
    }

    STATES.userAgent.capabilities.touch && TouchController.updateCustomList();
    overridePreloadState();

    VibrationManager.initialSetup();

    // Check for Update
    BX_FLAGS.CheckForUpdate && checkForUpdate();

    // Setup UI
    addCss();
    Toast.setup();
    (getPref(PrefKey.GAME_BAR_POSITION) !== 'off') && GameBar.getInstance();
    Screenshot.setup();

    GuideMenu.observe();
    StreamBadges.setupEvents();
    StreamStats.setupEvents();
    EmulatedMkbHandler.setupEvents();

    Patcher.init();

    disablePwa();

    // Show a toast when connecting/disconecting controller
    if (getPref(PrefKey.CONTROLLER_SHOW_CONNECTION_STATUS)) {
        window.addEventListener('gamepadconnected', e => showGamepadToast(e.gamepad));
        window.addEventListener('gamepaddisconnected', e => showGamepadToast(e.gamepad));
    }

    // Preload Remote Play
    if (getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
        RemotePlay.detect();
    }

    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === StreamTouchController.ALL) {
        TouchController.setup();
    }

    // Start PointerProviderServer
    if (getPref(PrefKey.MKB_ENABLED) && AppInterface) {
        STATES.pointerServerPort = AppInterface.startPointerServer() || 9269;
        BxLogger.info('startPointerServer', 'Port', STATES.pointerServerPort.toString());
    }

    // Show wait time in game card
    getPref(PrefKey.UI_GAME_CARD_SHOW_WAIT_TIME) && GameTile.setup();
}

main();
