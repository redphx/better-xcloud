import { ControllerShortcut } from "@/modules/controller-shortcut";
import { BxEvent } from "@utils/bx-event";
import { deepClone, STATES } from "@utils/global";
import { getPref, PrefKey } from "@utils/preferences";
import { BxLogger } from "./bx-logger";
import { BX_FLAGS } from "./bx-flags";

export enum InputType {
    CONTROLLER = 'Controller',
    MKB = 'MKB',
    CUSTOM_TOUCH_OVERLAY = 'CustomTouchOverlay',
    GENERIC_TOUCH = 'GenericTouch',
    NATIVE_TOUCH = 'NativeTouch',
    BATIVE_SENSOR = 'NativeSensor',
}

export const BxExposed = {
    getTitleInfo: () => STATES.currentStream.titleInfo,

    modifyTitleInfo: (titleInfo: XcloudTitleInfo): XcloudTitleInfo => {
        // Clone the object since the original is read-only
        titleInfo = deepClone(titleInfo);

        let supportedInputTypes = titleInfo.details.supportedInputTypes;

        if (BX_FLAGS.ForceNativeMkbTitles?.includes(titleInfo.details.productId)) {
            supportedInputTypes.push(InputType.MKB);
        }

        // Remove native MKB support on mobile browsers or by user's choice
        if (getPref(PrefKey.NATIVE_MKB_ENABLED) === 'off') {
            supportedInputTypes = supportedInputTypes.filter(i => i !== InputType.MKB);
        }

        titleInfo.details.hasMkbSupport = supportedInputTypes.includes(InputType.MKB);

        if (STATES.userAgentHasTouchSupport) {
            let touchControllerAvailability = getPref(PrefKey.STREAM_TOUCH_CONTROLLER);

            // Disable touch control when gamepad found
            if (touchControllerAvailability !== 'off' && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) {
                const gamepads = window.navigator.getGamepads();
                let gamepadFound = false;

                for (let gamepad of gamepads) {
                    if (gamepad && gamepad.connected) {
                        gamepadFound = true;
                        break;
                    }
                }

                gamepadFound && (touchControllerAvailability = 'off');
            }

            if (touchControllerAvailability === 'off') {
                // Disable touch on all games (not native touch)
                supportedInputTypes = supportedInputTypes.filter(i => i !== InputType.CUSTOM_TOUCH_OVERLAY && i !== InputType.GENERIC_TOUCH);
                // Empty TABs
                titleInfo.details.supportedTabs = [];
            }

            // Pre-check supported input types
            titleInfo.details.hasNativeTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH);
            titleInfo.details.hasTouchSupport = titleInfo.details.hasNativeTouchSupport ||
                    supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY) ||
                    supportedInputTypes.includes(InputType.GENERIC_TOUCH);

            if (!titleInfo.details.hasTouchSupport && touchControllerAvailability === 'all') {
                // Add generic touch support for non touch-supported games
                titleInfo.details.hasFakeTouchSupport = true;
                supportedInputTypes.push(InputType.GENERIC_TOUCH);
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

    handleControllerShortcut: ControllerShortcut.handle,
    resetControllerShortcut: ControllerShortcut.reset,
};
