import { GameBar } from "@modules/game-bar/game-bar";
import { BxEvent } from "@utils/bx-event";
import { STATES } from "@utils/global";
import { getPref, PrefKey } from "@utils/preferences";
import { UserAgent } from "@utils/user-agent";

enum InputType {
    CONTROLLER = 'Controller',
    MKB = 'MKB',
    CUSTOM_TOUCH_OVERLAY = 'CustomTouchOverlay',
    GENERIC_TOUCH = 'GenericTouch',
    NATIVE_TOUCH = 'NativeTouch',
    BATIVE_SENSOR = 'NativeSensor',
}

export const BxExposed = {
    // Enable/disable Game Bar when playing/pausing
    onPollingModeChanged: (mode: 'All' | 'None') => {
        if (getPref(PrefKey.GAME_BAR_POSITION) === 'off') {
            return;
        }

        const gameBar = GameBar.getInstance();

        if (!STATES.isPlaying) {
            gameBar.disable();
            return;
        }

        // Toggle Game bar
        mode !== 'None' ? gameBar.disable() : gameBar.enable();
    },

    getTitleInfo: () => STATES.currentStream.titleInfo,

    modifyTitleInfo: (titleInfo: XcloudTitleInfo): XcloudTitleInfo => {
        // Clone the object since the original is read-only
        titleInfo = structuredClone(titleInfo);

        let supportedInputTypes = titleInfo.details.supportedInputTypes;

        // Remove native MKB support on mobile browsers or by user's choice
        if (getPref(PrefKey.NATIVE_MKB_DISABLED) || UserAgent.isMobile()) {
            supportedInputTypes = supportedInputTypes.filter(i => i !== InputType.MKB);
        }

        titleInfo.details.hasMkbSupport = supportedInputTypes.includes(InputType.MKB);

        if (STATES.hasTouchSupport) {
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
            }

            // Pre-check supported input types
            titleInfo.details.hasTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH) ||
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

        const audioCtx = STATES.currentStream.audioContext!;
        const source = audioCtx.createMediaStreamSource(audioStream);

        const gainNode = audioCtx.createGain();  // call monkey-patched createGain() in BxAudioContext
        source.connect(gainNode).connect(audioCtx.destination);
    }
};
