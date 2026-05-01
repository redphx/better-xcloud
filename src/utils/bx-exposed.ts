import { isFullVersion } from "@macros/build" with { type: "macro" };

import { ControllerShortcut } from "@/modules/controller-shortcut";
import { deepClone, STATES } from "@utils/global";
import { BxLogger } from "./bx-logger";
import { BX_FLAGS } from "./bx-flags";
import { NavigationDialogManager } from "@/modules/ui/dialog/navigation-dialog";
import { GlobalPref } from "@/enums/pref-keys";
import { GamePassCloudGallery } from "@/enums/game-pass-gallery";
import { TouchController } from "@/modules/touch-controller";
import { NativeMkbMode, TouchControllerMode } from "@/enums/pref-values";
import { Patcher, type PatchPage } from "@/modules/patcher/patcher";
import { BxEventBus } from "./bx-event-bus";
import { FeatureGates } from "./feature-gates";
import { getGlobalPref } from "./pref-utils";
import { LocalCoOpManager } from "./local-co-op-manager";

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

        // Override feature gates
        try {
            for (const exp in FeatureGates) {
                state.experiments.overrideFeatureGates[exp.toLocaleLowerCase()] = FeatureGates[exp];
            }
            BxLogger.info('state.experiments', state.experiments);
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
                const siglId = GamePassCloudGallery.ALL_WITH_BYOG;
                if (siglId in sigls) {
                    const allGames = sigls[siglId].data.products;
                    customList = customList.filter(id => allGames.includes(id));

                    // Add to the official touchlist
                    sigls[GamePassCloudGallery.TOUCH]?.data.products.push(...customList);
                } else {
                    BxLogger.warning(LOG_TAG, 'Sigl not found: ' + siglId);
                }
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

        // Disable header & footer
        try {
            state.uhf.headerMode = 'Off';
            state.uhf.footerMode = 'Off';
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
        if (getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.OFF) {
            supportedInputTypes = supportedInputTypes.filter(i => i !== SupportedInputType.MKB);
        }

        titleInfo.details.hasMkbSupport = supportedInputTypes.includes(SupportedInputType.MKB);

        if (STATES.userAgent.capabilities.touch) {
            let touchControllerAvailability = getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE);

            // Disable touch control when gamepad found
            if (touchControllerAvailability !== TouchControllerMode.OFF && getGlobalPref(GlobalPref.TOUCH_CONTROLLER_AUTO_OFF)) {
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
        BxEventBus.Script.emit('titleInfo.ready', {});

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

    handleControllerShortcut: isFullVersion() ? ControllerShortcut.handle : () => {},
    resetControllerShortcut: isFullVersion() ? ControllerShortcut.reset : () => {},

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

    getGamepadPlayerSlot(browserIndex: number): number {
        const slots = window.BX_STREAM_SETTINGS?.gamepadSlots;
        if (slots && browserIndex in slots) {
            return slots[browserIndex];
        }
        return browserIndex;
    },

    beforePageLoad: isFullVersion() ? (page: PatchPage) => {
        BxLogger.info('beforePageLoad', page);
        Patcher.patchPage(page);
    } : () => {},

    localCoOpManager: isFullVersion() ? LocalCoOpManager.getInstance() : null,
    reactCreateElement: function(...args: any[]) {},
    reactUseEffect: function(...args: any[]) {},

    createReactLocalCoOpIcon: isFullVersion() ? (attrs: any): any => {
        const reactCE = window.BX_EXPOSED.reactCreateElement;

        // local-co-op.svg
        return reactCE(
            'svg',
            { xmlns: 'http://www.w3.org/2000/svg', width: '1em', height: '1em', viewBox: '0 0 32 32', 'fill-rule': 'evenodd', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs },
            reactCE(
                'g',
                null,
                reactCE('path', { d: 'M24.272 11.165h-3.294l-3.14 3.564c-.391.391-.922.611-1.476.611a2.1 2.1 0 0 1-2.087-2.088 2.09 2.09 0 0 1 .031-.362l1.22-6.274a3.89 3.89 0 0 1 3.81-3.206h6.57c1.834 0 3.439 1.573 3.833 3.295l1.205 6.185a2.09 2.09 0 0 1 .031.362 2.1 2.1 0 0 1-2.087 2.088c-.554 0-1.085-.22-1.476-.611l-3.14-3.564', fill: 'none', stroke: '#fff', 'stroke-width': '2' }),
                reactCE('circle', { cx: '22.625', cy: '5.874', r: '.879' }),
                reactCE('path', { d: 'M11.022 24.415H7.728l-3.14 3.564c-.391.391-.922.611-1.476.611a2.1 2.1 0 0 1-2.087-2.088 2.09 2.09 0 0 1 .031-.362l1.22-6.274a3.89 3.89 0 0 1 3.81-3.206h6.57c1.834 0 3.439 1.573 3.833 3.295l1.205 6.185a2.09 2.09 0 0 1 .031.362 2.1 2.1 0 0 1-2.087 2.088c-.554 0-1.085-.22-1.476-.611l-3.14-3.564', fill: 'none', stroke: '#fff', 'stroke-width': '2' }),
                reactCE('circle', { cx: '9.375', cy: '19.124', r: '.879' })
            ),
        );
    } : () => {},

    hasCustomTouchControl: TouchController.hasCustomControl,
    hasCustomNativeMkb: (productId: string) => {
        return BX_FLAGS.ForceNativeMkbTitles?.includes(productId);
    }
};
