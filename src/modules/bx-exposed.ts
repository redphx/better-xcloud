import { STATES } from "../utils/global";

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
};
