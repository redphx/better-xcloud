import { isFullVersion } from "@macros/build" with { type: "macro" };

import { ControllerShortcut } from "@/modules/controller-shortcut";
import { deepClone, STATES } from "@utils/global";
import { BxLogger } from "./bx-logger";
import { BX_FLAGS } from "./bx-flags";
import { NavigationDialogManager } from "@/modules/ui/dialog/navigation-dialog";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";
import { GamePassCloudGallery } from "@/enums/game-pass-gallery";
import { TouchController } from "@/modules/touch-controller";
import { NativeMkbMode, TouchControllerMode } from "@/enums/pref-values";
import { Patcher, type PatchPage } from "@/modules/patcher/patcher";
import { EventBus } from "./event-bus";

export enum SupportedInputType {
    CONTROLLER = 'Controller',
    MKB = 'MKB',
    CUSTOM_TOUCH_OVERLAY = 'CustomTouchOverlay',
    GENERIC_TOUCH = 'GenericTouch',
    NATIVE_TOUCH = 'NativeTouch',
    BATIVE_SENSOR = 'NativeSensor',
};
export type SupportedInputTypeValue = (typeof SupportedInputType)[keyof typeof SupportedInputType];

export const BxExposed = {
    getTitleInfo: () => STATES.currentStream.titleInfo,

    modifyPreloadedState: isFullVersion() && ((state: any) => {
        let LOG_TAG = 'PreloadState';

        // Override User-Agent
        try {
            state.appContext.requestInfo.userAgent = window.navigator.userAgent;
        } catch (e) {
            BxLogger.error(LOG_TAG, e);
        }

        // Add list of games with custom layouts to the official list
        try {
            const sigls = state.xcloud.sigls;
            if (STATES.userAgent.capabilities.touch) {
                // The list of custom touch controls
                let customList = TouchController.getCustomList();

                // Remove non-cloud games from the official list
                const allGames = sigls[GamePassCloudGallery.ALL].data.products;
                customList = customList.filter(id => allGames.includes(id));

                // Add to the official touchlist
                sigls[GamePassCloudGallery.TOUCH]?.data.products.push(...customList);
            }
        } catch (e) {
            BxLogger.error(LOG_TAG, e);
        }

        // Add forced Native MKB titles to the official list
        try {
            const sigls = state.xcloud.sigls;
            if (BX_FLAGS.ForceNativeMkbTitles) {
                // Add to the official list
                sigls[GamePassCloudGallery.NATIVE_MKB]?.data.products.push(...BX_FLAGS.ForceNativeMkbTitles);
            }
        } catch (e) {
            BxLogger.error(LOG_TAG, e);
        }

        // Redirect to /en-US/play if visiting from an unsupported region
        try {
            const xCloud = state.xcloud.authentication.authStatusByStrategy.XCloud;
            if (xCloud.type === 3 && xCloud.error.type === 'UnsupportedMarketError') {
                // Redirect to /en-US/play
                window.stop();
                window.location.href = 'https://www.xbox.com/en-US/play';
            }
        } catch (e) {
            BxLogger.error(LOG_TAG, e);
        }

        return state;
    }),

    modifyTitleInfo: isFullVersion() && function(titleInfo: XcloudTitleInfo): XcloudTitleInfo {
        // Clone the object since the original is read-only
        titleInfo = deepClone(titleInfo);

        let supportedInputTypes = titleInfo.details.supportedInputTypes;

        if (BX_FLAGS.ForceNativeMkbTitles?.includes(titleInfo.details.productId)) {
            supportedInputTypes.push(SupportedInputType.MKB);
        }

        // Remove native MKB support on mobile browsers or by user's choice
        if (getPref<NativeMkbMode>(PrefKey.NATIVE_MKB_MODE) === NativeMkbMode.OFF) {
            supportedInputTypes = supportedInputTypes.filter(i => i !== SupportedInputType.MKB);
        }

        titleInfo.details.hasMkbSupport = supportedInputTypes.includes(SupportedInputType.MKB);

        if (STATES.userAgent.capabilities.touch) {
            let touchControllerAvailability = getPref<TouchControllerMode>(PrefKey.TOUCH_CONTROLLER_MODE);

            // Disable touch control when gamepad found
            if (touchControllerAvailability !== TouchControllerMode.OFF && getPref(PrefKey.TOUCH_CONTROLLER_AUTO_OFF)) {
                const gamepads = window.navigator.getGamepads();
                let gamepadFound = false;

                for (let gamepad of gamepads) {
                    if (gamepad && gamepad.connected) {
                        gamepadFound = true;
                        break;
                    }
                }

                gamepadFound && (touchControllerAvailability = TouchControllerMode.OFF);
            }

            if (touchControllerAvailability === TouchControllerMode.OFF) {
                // Disable touch on all games (not native touch)
                supportedInputTypes = supportedInputTypes.filter(i => i !== SupportedInputType.CUSTOM_TOUCH_OVERLAY && i !== SupportedInputType.GENERIC_TOUCH);
                // Empty TABs
                titleInfo.details.supportedTabs = [];
            }

            // Pre-check supported input types
            titleInfo.details.hasNativeTouchSupport = supportedInputTypes.includes(SupportedInputType.NATIVE_TOUCH);
            titleInfo.details.hasTouchSupport = titleInfo.details.hasNativeTouchSupport ||
                    supportedInputTypes.includes(SupportedInputType.CUSTOM_TOUCH_OVERLAY) ||
                    supportedInputTypes.includes(SupportedInputType.GENERIC_TOUCH);

            if (!titleInfo.details.hasTouchSupport && touchControllerAvailability === TouchControllerMode.ALL) {
                // Add generic touch support for non touch-supported games
                titleInfo.details.hasFakeTouchSupport = true;
                supportedInputTypes.push(SupportedInputType.GENERIC_TOUCH);
            }
        }

        titleInfo.details.supportedInputTypes = supportedInputTypes;

        // Save this info in STATES
        STATES.currentStream.titleInfo = titleInfo;
        EventBus.Script.emit('titleInfoReady', {});

        return titleInfo;
    },

    setupGainNode: ($media: HTMLMediaElement, audioStream: MediaStream) => {
        if ($media instanceof HTMLAudioElement) {
            $media.muted = true;
            $media.addEventListener('playing', e => {
                $media.muted = true;
                $media.pause();
            });
        } else {
            $media.muted = true;
            $media.addEventListener('playing', e => {
                $media.muted = true;
            });
        }

        try {
            const audioCtx = STATES.currentStream.audioContext!;
            const source = audioCtx.createMediaStreamSource(audioStream);

            const gainNode = audioCtx.createGain();  // call monkey-patched createGain() in BxAudioContext
            source.connect(gainNode).connect(audioCtx.destination);
        } catch (e) {
            BxLogger.error('setupGainNode', e);
            STATES.currentStream.audioGainNode = null;
        }
    },

    handleControllerShortcut: isFullVersion() && ControllerShortcut.handle,
    resetControllerShortcut: isFullVersion() && ControllerShortcut.reset,

    overrideSettings: {
        Tv_settings: {
            hasCompletedOnboarding: true,
        },
    },

    disableGamepadPolling: false,

    backButtonPressed: () => {
        const navigationDialogManager = NavigationDialogManager.getInstance();
        if (navigationDialogManager.isShowing()) {
            navigationDialogManager.hide();
            return true;
        }

        const dict = {
            bubbles: true,
            cancelable: true,
            key: 'XF86Back',
            code: 'XF86Back',
            keyCode: 4,
            which: 4,
        };

        document.body.dispatchEvent(new KeyboardEvent('keydown', dict));
        document.body.dispatchEvent(new KeyboardEvent('keyup', dict));

        return false;
    },

    GameSlugRegexes: [
        /[;,/?:@&=+_`~$%#^*()!^\u2122\xae\xa9]/g,
        / {2,}/g,
        / /g,
    ],

    toggleLocalCoOp(enable: boolean) {},

    beforePageLoad: isFullVersion() ? (page: PatchPage) => {
        BxLogger.info('beforePageLoad', page);
        Patcher.patchPage(page);
    } : () => {},
};
