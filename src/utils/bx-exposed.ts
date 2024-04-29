import { BxEvent } from "./bx-event";
import { STATES } from "./global";
import { getPref, PrefKey } from "./preferences";
import { UserAgent } from "./user-agent";

enum InputType {
    CONTROLLER = 'Controller',
    MKB = 'MKB',
    CUSTOM_TOUCH_OVERLAY = 'CustomTouchOverlay',
    GENERIC_TOUCH = 'GenericTouch',
    NATIVE_TOUCH = 'NativeTouch',
    BATIVE_SENSOR = 'NativeSensor',
}

export const BxExposed = {
    onPollingModeChanged: (mode: 'All' | 'None') => {
        if (!STATES.isPlaying) {
            return false;
        }

        const $screenshotBtn = document.querySelector('.bx-screenshot-button');
        const $touchControllerBar = document.getElementById('bx-touch-controller-bar');

        if (mode !== 'None') {
            // Hide screenshot button
            $screenshotBtn && $screenshotBtn.classList.add('bx-gone');

            // Hide touch controller bar
            $touchControllerBar && $touchControllerBar.classList.add('bx-gone');
        } else {
            // Show screenshot button
            $screenshotBtn && $screenshotBtn.classList.remove('bx-gone');

            // Show touch controller bar
            $touchControllerBar && $touchControllerBar.classList.remove('bx-gone');
        }
    },

    getTitleInfo: () => STATES.currentStream.titleInfo,

    modifyTitleInfo: (titleInfo: XcloudTitleInfo): XcloudTitleInfo => {
        // Clone the object since the original is read-only
        titleInfo = structuredClone(titleInfo);

        if (STATES.hasTouchSupport) {
            let touchControllerAvailability = getPref(PrefKey.STREAM_TOUCH_CONTROLLER);
            let supportedInputTypes = titleInfo.details.supportedInputTypes;

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

            // Remove MKB support on mobile browsers
            if (UserAgent.isMobile()) {
                supportedInputTypes = supportedInputTypes.filter(i => i !== InputType.MKB);
            }

            if (touchControllerAvailability === 'off') {
                // Disable touch on all games (not native touch)
                supportedInputTypes = supportedInputTypes.filter(i => i !== InputType.CUSTOM_TOUCH_OVERLAY && i !== InputType.GENERIC_TOUCH);
            }

            // Pre-check supported input types
            titleInfo.details.hasMkbSupport = supportedInputTypes.includes(InputType.MKB);
            titleInfo.details.hasTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH) &&
                    !supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY) &&
                    !supportedInputTypes.includes(InputType.GENERIC_TOUCH);

            if (!titleInfo.details.hasTouchSupport && touchControllerAvailability === 'all') {
                // Add generic touch support for non touch-supported games
                titleInfo.details.hasFakeTouchSupport = true;
                supportedInputTypes.push(InputType.GENERIC_TOUCH);
            }

            titleInfo.details.supportedInputTypes = supportedInputTypes;
        }

        // Save this info in STATES
        STATES.currentStream.titleInfo = titleInfo;
        BxEvent.dispatch(window, BxEvent.TITLE_INFO_READY);

        return titleInfo;
    }
};
