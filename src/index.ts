import { compressCss, isFullVersion } from "@macros/build" with { type: "macro" };

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
import { LoadingScreen } from "@modules/loading-screen";
import { MouseCursorHider } from "@modules/mkb/mouse-cursor-hider";
import { TouchController } from "@modules/touch-controller";
import { checkForUpdate, disablePwa, productTitleToSlug } from "@utils/utils";
import { Patcher } from "@/modules/patcher/patcher";
import { RemotePlayManager } from "@/modules/remote-play-manager";
import { onHistoryChanged, patchHistoryMethod } from "@utils/history";
import { disableAdobeAudienceManager, patchAudioContext, patchCanvasContext, patchMeControl, patchPointerLockApi, patchRtcCodecs, patchRtcPeerConnection, patchVideoApi } from "@utils/monkey-patches";
import { AppInterface, STATES } from "@utils/global";
import { BxLogger } from "@utils/bx-logger";
import { GameBar } from "./modules/game-bar/game-bar";
import { ScreenshotManager } from "./utils/screenshot-manager";
import { NativeMkbHandler } from "./modules/mkb/native-mkb-handler";
import { GuideMenu } from "./modules/ui/guide-menu";
import { updateVideoPlayer } from "./modules/stream/stream-settings-utils";
import { BlockFeature, NativeMkbMode, TouchControllerMode, UiSection } from "./enums/pref-values";
import { HeaderSection } from "./modules/ui/header";
import { GameTile } from "./modules/ui/game-tile";
import { ProductDetailsPage } from "./modules/ui/product-details";
import { NavigationDialogManager } from "./modules/ui/dialog/navigation-dialog";
import { GlobalPref, StreamPref } from "./enums/pref-keys";
import { UserAgent } from "./utils/user-agent";
import { XboxApi } from "./utils/xbox-api";
import { StreamStatsCollector } from "./utils/stream-stats-collector";
import { StreamSettings } from "./utils/stream-settings";
import { KeyboardShortcutHandler } from "./modules/mkb/keyboard-shortcut-handler";
import { GhPagesUtils } from "./utils/gh-pages";
import { DeviceVibrationManager } from "./modules/device-vibration-manager";
import { BxEventBus } from "./utils/bx-event-bus";
import { getGlobalPref, getStreamPref } from "./utils/pref-utils";
import { SettingsManager } from "./modules/settings-manager";
import { Toast } from "./utils/toast";
import { WebGPUPlayer } from "./modules/player/webgpu/webgpu-player";
import { StreamUiHandler } from "./modules/stream/stream-ui";
import { TrueAchievements } from "./utils/true-achievements";
import { localRedirect } from "./modules/ui/ui";
import { handleDeepLink } from "./utils/deep-link";

SettingsManager.getInstance();

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

if (isFullVersion() && BX_FLAGS.SafariWorkaround && document.readyState !== 'loading') {
    // Stop loading
    window.stop();

    // We need to set it to an empty string first to work around Bun's bug
    // https://github.com/oven-sh/bun/issues/12067
    let css = '';
    css += compressCss(`
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
        $secondaryAction = CE('p', false, t('settings-reloading'));
    } else {
        $secondaryAction = CE('a', {
            href: 'https://better-xcloud.github.io/troubleshooting',
            target: '_blank',
        }, '🤓 ' + t('how-to-fix'));
    }

    // Show the reloading overlay
    const $fragment = document.createDocumentFragment();
    $fragment.appendChild(CE('style', false, css));
    $fragment.appendChild(CE('div',{
        class: 'bx-reload-overlay',
    },
        CE('div', false,
            CE('p', false, t('load-failed-message')),
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

// Make sure it only run on /play
if (!window.location.pathname.match(/^\/[a-zA-Z]{2}-[a-zA-Z]{2}\/play/)) {
    throw new Error('[Better xCloud] Not xCloud page');
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

    STATES.isSignedIn = !!window.xbcUser?.isSignedIn;

    if (STATES.isSignedIn) {
        // Preload Remote Play
        if (isFullVersion()) {
            RemotePlayManager.getInstance()?.initialize();
        }
    } else {
        // Show Settings button in the header when not signed in
        // window.setTimeout(HeaderSection.watchHeader, 2000);
    }

    // Hide "Play with Friends" skeleton section
    if (getGlobalPref(GlobalPref.UI_HIDE_SECTIONS).includes(UiSection.FRIENDS) || getGlobalPref(GlobalPref.BLOCK_FEATURES).includes(BlockFeature.FRIENDS)) {
        const $parent = document.querySelector('div[class*=PlayWithFriendsSkeleton]')?.closest<HTMLElement>('div[class*=HomePage-module]');
        $parent && ($parent.style.display = 'none');
    }

    // Preload fonts
    preloadFonts();
});

// Deep link
if (AppInterface) {
    window.addEventListener(BxEvent.XCLOUD_ROUTER_HISTORY_READY, e => {
        if (window.location.pathname.includes('/fireos-browser-update')) {
            localRedirect('/play');
        } else {
            handleDeepLink();
        }
    }, { once: true });
}

window.BX_EXPOSED = BxExposed;

// Hide Settings UI when navigate to another page
// @ts-ignore
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener('popstate', onHistoryChanged);

// Make pushState/replaceState methods dispatch BxEvent.POPSTATE event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

BxEventBus.Script.on('ui.header.rendered', () => {
    HeaderSection.getInstance().checkHeader();
});

BxEventBus.Stream.on('state.loading', () => {
    // Get title ID for screenshot's name
    if (window.location.pathname.includes('/launch/') && STATES.currentStream.titleInfo) {
        STATES.currentStream.titleSlug = productTitleToSlug(STATES.currentStream.titleInfo.productInfo.title);
    } else {
        STATES.currentStream.titleSlug = 'remote-play';
    }
});

// Setup loading screen
getGlobalPref(GlobalPref.LOADING_SCREEN_GAME_ART) && BxEventBus.Script.on('titleInfo.ready', LoadingScreen.setup);

BxEventBus.Stream.on('state.starting', () => {
    // Hide loading screen
    LoadingScreen.hide();

    if (isFullVersion()) {
        // Start hiding cursor
        const cursorHider = MouseCursorHider.getInstance();
        if (cursorHider) {
            cursorHider.start();
            cursorHider.hide();
        }
    }
});

BxEventBus.Stream.on('state.playing', payload => {
    if (isFullVersion()) {
        window.BX_STREAM_SETTINGS = StreamSettings.settings;
        StreamSettings.refreshAllSettings();
    }

    STATES.isPlaying = true;

    if (isFullVersion()) {
        const gameBar = GameBar.getInstance();
        if (gameBar) {
            gameBar.reset();
            gameBar.enable();
            gameBar.showBar();
        }

        // Setup Keyboard shortcuts
        KeyboardShortcutHandler.getInstance().start();

        // Setup screenshot
        const $video = payload.$video as HTMLVideoElement;
        ScreenshotManager.getInstance().updateCanvasSize($video.videoWidth, $video.videoHeight);

        // Setup local co-op
        if (getStreamPref(StreamPref.LOCAL_CO_OP_ENABLED)) {
            BxExposed.toggleLocalCoOp(true);
            Toast.show(t('local-co-op'), t('enabled'));
        }
    }

    updateVideoPlayer();
});

BxEventBus.Script.on('ui.error.rendered', () => {
    BxEventBus.Stream.emit('state.stopped', {});
});

BxEventBus.Script.on('ui.guideHome.rendered', () => {
    const $root = document.querySelector<HTMLElement>('#gamepass-dialog-root div[role=dialog] div[role=tabpanel] div[class*=HomeLandingPage]');
    $root && GuideMenu.getInstance().injectHome($root, STATES.isPlaying);
});

BxEventBus.Script.on('ui.guideAchievementProgress.rendered', () => {
    const $elm = document.querySelector('#gamepass-dialog-root button[class*=AchievementsButton-module__progressBarContainer]');
    if ($elm) {
        TrueAchievements.getInstance().injectAchievementsProgress($elm as HTMLElement);
    }
});

BxEventBus.Script.on('ui.guideAchievementDetail.rendered', () => {
    const $elm = document.querySelector('#gamepass-dialog-root div[class^=AchievementDetailPage-module]');
    if ($elm) {
        TrueAchievements.getInstance().injectAchievementDetailPage($elm as HTMLElement);
    }
});

BxEventBus.Stream.on('ui.streamMenu.rendered', async () => {
    await StreamUiHandler.handleStreamMenu();
});

BxEventBus.Stream.on('ui.streamHud.rendered', async () => {
    const $elm = document.querySelector<HTMLElement>('#StreamHud');
    $elm && StreamUiHandler.handleSystemMenu($elm);
});


isFullVersion() && window.addEventListener(BxEvent.XCLOUD_RENDERING_COMPONENT, e => {
    const component = (e as any).component;
    if (component === 'product-detail') {
        ProductDetailsPage.injectButtons();
    }
});

// Detect game change
BxEventBus.Stream.on('dataChannelCreated', payload => {
    const { dataChannel } = payload;
    if (dataChannel?.label !== 'message') {
        return;
    }

    dataChannel.addEventListener('message', async (msg: MessageEvent) => {
        if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
            return;
        }

        if (!msg.data.includes('/titleinfo')) {
            return;
        }

        // Get xboxTitleId from message
        const currentStream = STATES.currentStream;
        const json = JSON.parse(JSON.parse(msg.data).content);
        const currentId = currentStream.xboxTitleId ?? null;
        let newId: number = parseInt(json.titleid, 16);

        // Get titleSlug for Remote Play
        if (window.location.pathname.includes('/play/consoles/launch/')) {
            currentStream.titleSlug = 'remote-play';
            if (json.focused) {
                const productTitle = await XboxApi.getProductTitle(newId);
                if (productTitle) {
                    currentStream.titleSlug = productTitleToSlug(productTitle);
                } else {
                    newId = -1;
                }
            } else {
                newId = 0;
            }
        }

        if (currentId !== newId) {
            currentStream.xboxTitleId = newId;
            BxEventBus.Stream.emit('xboxTitleId.changed', {
                id: newId,
            });
        }
    });
});


function unload() {
    if (!STATES.isPlaying) {
        return;
    }

    BxLogger.warning('Unloading');
    if (isFullVersion()) {
        KeyboardShortcutHandler.getInstance().stop();

        // Stop MKB listeners
        EmulatedMkbHandler.getInstance()?.destroy();
        NativeMkbHandler.getInstance()?.destroy();

        DeviceVibrationManager.getInstance()?.reset();
    }

    // Destroy StreamPlayer
    STATES.currentStream.streamPlayerManager?.destroy();

    STATES.isPlaying = false;
    STATES.currentStream = {};
    window.BX_EXPOSED.shouldShowSensorControls = false;
    window.BX_EXPOSED.stopTakRendering = false;

    NavigationDialogManager.getInstance().hide();
    StreamStats.getInstance().destroy();
    StreamBadges.getInstance().destroy();

    if (isFullVersion()) {
        MouseCursorHider.getInstance()?.stop();
        TouchController.reset();

        GameBar.getInstance()?.disable();

        BxEventBus.Stream.emit('xboxTitleId.changed', { id: -1 });
    }
}

BxEventBus.Stream.on('state.stopped', unload);
window.addEventListener('pagehide', e => {
    BxEventBus.Stream.emit('state.stopped', {});
});

isFullVersion() && window.addEventListener(BxEvent.CAPTURE_SCREENSHOT, e => {
    ScreenshotManager.getInstance().takeScreenshot();
});


function main() {
    GhPagesUtils.fetchLatestCommit();

    if (isFullVersion()) {
        if (getGlobalPref(GlobalPref.NATIVE_MKB_MODE) !== NativeMkbMode.OFF) {
            const customList = getGlobalPref(GlobalPref.NATIVE_MKB_FORCED_GAMES);
            BX_FLAGS.ForceNativeMkbTitles.push(...customList);
        }
    }

    StreamSettings.setup();

    // Monkey patches
    patchRtcPeerConnection();
    patchRtcCodecs();
    interceptHttpRequests();
    patchVideoApi();
    patchCanvasContext();
    isFullVersion() && AppInterface && patchPointerLockApi();

    getGlobalPref(GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED) && patchAudioContext();

    if (getGlobalPref(GlobalPref.BLOCK_TRACKING)) {
        patchMeControl();
        disableAdobeAudienceManager();
    }

    // Setup UI
    addCss();

    StreamStatsCollector.setupEvents();
    StreamBadges.setupEvents();
    StreamStats.setupEvents();

    if (isFullVersion()) {
        WebGPUPlayer.prepare();

        STATES.userAgent.capabilities.touch && TouchController.updateCustomList();

        DeviceVibrationManager.getInstance();

        // Check for Update
        BX_FLAGS.CheckForUpdate && checkForUpdate();

        Patcher.init();
        disablePwa();

        if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.ALL) {
            TouchController.setup();
        }

        // Start PointerProviderServer
        if (AppInterface && (getGlobalPref(GlobalPref.MKB_ENABLED) || getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON)) {
            STATES.pointerServerPort = AppInterface.startPointerServer() || 9269;
            BxLogger.info('startPointerServer', 'Port', STATES.pointerServerPort.toString());
        }

        // Show wait time in game card
        getGlobalPref(GlobalPref.UI_GAME_CARD_SHOW_WAIT_TIME) && GameTile.setup();

        EmulatedMkbHandler.setupEvents();
    }

    // Show a toast when connecting/disconecting controller
    if (getGlobalPref(GlobalPref.UI_CONTROLLER_SHOW_STATUS)) {
        window.addEventListener('gamepadconnected', e => showGamepadToast(e.gamepad));
        window.addEventListener('gamepaddisconnected', e => showGamepadToast(e.gamepad));
    }

    // Ctrl+Scroll Zoom Blocker
    if (isFullVersion()) {
        const blockZoom = (e: WheelEvent) => {
            if (e.ctrlKey && getStreamPref(StreamPref.MKB_DISABLE_ZOOM)) {
                const isFullscreen = !!(
                    document.fullscreenElement ||
                    (document as any).webkitFullscreenElement ||
                    (document as any).mozFullScreenElement ||
                    (document as any).msFullscreenElement
                );
                if (isFullscreen) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }
        };

        window.addEventListener('wheel', blockZoom, { passive: false, capture: true });
        document.addEventListener('wheel', blockZoom, { passive: false, capture: true });

        // Needs to capture again when full screen changes as some sites recreate listeners
        document.addEventListener('fullscreenchange', () => {
            window.addEventListener('wheel', blockZoom, { passive: false, capture: true });
            document.body?.addEventListener('wheel', blockZoom, { passive: false, capture: true });
        });
    }
}

main();
