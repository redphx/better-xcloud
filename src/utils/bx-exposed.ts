import { isFullVersion } from "@macros/build" with {type: "macro"};

import { ControllerShortcut } from "@/modules/controller-shortcut";
import { BxEvent } from "@utils/bx-event";
import { deepClone, STATES } from "@utils/global";
import { BxLogger } from "./bx-logger";
import { BX_FLAGS } from "./bx-flags";
import { NavigationDialogManager } from "@/modules/ui/dialog/navigation-dialog";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, StreamTouchController } from "./settings-storages/global-settings-storage";

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

    modifyTitleInfo: (titleInfo: XcloudTitleInfo): XcloudTitleInfo => {
        // Clone the object since the original is read-only
        titleInfo = deepClone(titleInfo);

        let supportedInputTypes = titleInfo.details.supportedInputTypes;

        if (BX_FLAGS.ForceNativeMkbTitles?.includes(titleInfo.details.productId)) {
            supportedInputTypes.push(SupportedInputType.MKB);
        }

        // Remove native MKB support on mobile browsers or by user's choice
        if (getPref(PrefKey.NATIVE_MKB_ENABLED) === 'off') {
            supportedInputTypes = supportedInputTypes.filter(i => i !== SupportedInputType.MKB);
        }

        titleInfo.details.hasMkbSupport = supportedInputTypes.includes(SupportedInputType.MKB);

        if (STATES.userAgent.capabilities.touch) {
            let touchControllerAvailability = getPref(PrefKey.STREAM_TOUCH_CONTROLLER);

            // Disable touch control when gamepad found
            if (touchControllerAvailability !== StreamTouchController.OFF && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) {
                const gamepads = window.navigator.getGamepads();
                let gamepadFound = false;

                for (let gamepad of gamepads) {
                    if (gamepad && gamepad.connected) {
                        gamepadFound = true;
                        break;
                    }
                }

                gamepadFound && (touchControllerAvailability = StreamTouchController.OFF);
            }

            if (touchControllerAvailability === StreamTouchController.OFF) {
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

            if (!titleInfo.details.hasTouchSupport && touchControllerAvailability === StreamTouchController.ALL) {
                // Add generic touch support for non touch-supported games
                titleInfo.details.hasFakeTouchSupport = true;
                supportedInputTypes.push(SupportedInputType.GENERIC_TOUCH);
            }
        }

        titleInfo.details.supportedInputTypes = supportedInputTypes;

        // Save this info in STATES
        STATES.currentStream.titleInfo = titleInfo;
        BxEvent.dispatch(window, BxEvent.TITLE_INFO_READY);

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
        'Tv_settings': {
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
};
