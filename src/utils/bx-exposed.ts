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

    modifyTitleInfo: (titleInfo: XcloudTitleInfo): XcloudTitleInfo => {
        // Clone the object since the original is read-only
        titleInfo = structuredClone(titleInfo);

        const touchControllerAvailability = getPref(PrefKey.STREAM_TOUCH_CONTROLLER);

        let supportedInputTypes = titleInfo.details.supportedInputTypes;

        // Remove MKB support on mobile browsers
        if (UserAgent.isMobile()) {
            supportedInputTypes = supportedInputTypes.filter(i => i !== 'MKB');
        }

        // Add custom property
        titleInfo.details.hasTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH) &&
                !supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY) &&
                !supportedInputTypes.includes(InputType.GENERIC_TOUCH);

        // Add generic touch support for non touch-supported games
        if (!titleInfo.details.hasTouchSupport && touchControllerAvailability === 'all') {
            supportedInputTypes.push(InputType.GENERIC_TOUCH);
        }
        titleInfo.details.supportedInputTypes = supportedInputTypes;

        // Save this info in STATES
        STATES.currentStream.titleInfo = titleInfo;
        BxEvent.dispatch(window, BxEvent.TITLE_INFO_READY);

        return titleInfo;
    }
};
