import { CE } from "@utils/html";
import { getPreferredServerRegion } from "@utils/region";
import { t } from "@utils/translation";
import { STATES } from "@utils/global";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";

export class LoadingScreen {
    static #$bgStyle: HTMLElement;
    static #$waitTimeBox: HTMLElement;

    static #waitTimeInterval?: number | null = null;
    static #orgWebTitle: string;

    static #secondsToString(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);

        const mDisplay = m > 0 ? `${m}m`: '';
        const sDisplay = `${s}s`.padStart(s >=0 ? 3 : 4, '0');
        return mDisplay + sDisplay;
    }

    static setup() {
        const titleInfo = STATES.currentStream.titleInfo;
        if (!titleInfo) {
            return;
        }

        if (!LoadingScreen.#$bgStyle) {
            const $bgStyle = CE('style');
            document.documentElement.appendChild($bgStyle);
            LoadingScreen.#$bgStyle = $bgStyle;
        }

        LoadingScreen.#setBackground(titleInfo.product.heroImageUrl || titleInfo.product.titledHeroImageUrl || titleInfo.product.tileImageUrl);

        if (getPref(PrefKey.UI_LOADING_SCREEN_ROCKET) === 'hide') {
            LoadingScreen.#hideRocket();
        }
    }

    static #hideRocket() {
        let $bgStyle = LoadingScreen.#$bgStyle;

        const css = `
#game-stream div[class*=RocketAnimation-module__container] > svg {
    display: none;
}

#game-stream video[class*=RocketAnimationVideo-module__video] {
    display: none;
}
`;
        $bgStyle.textContent += css;
    }

    static #setBackground(imageUrl: string) {
        // Setup style tag
        let $bgStyle = LoadingScreen.#$bgStyle;

        // Limit max width to reduce image size
        imageUrl = imageUrl + '?w=1920';

        const css = `
#game-stream {
    background-image: linear-gradient(#00000033, #000000e6), url(${imageUrl}) !important;
    background-color: transparent !important;
    background-position: center center !important;
    background-repeat: no-repeat !important;
    background-size: cover !important;
}

#game-stream rect[width="800"] {
    transition: opacity 0.3s ease-in-out !important;
}
`;
        $bgStyle.textContent += css;

        const bg = new Image();
        bg.onload = e => {
            $bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 0 !important;
}
`;
        };
        bg.src = imageUrl;
    }

    static setupWaitTime(waitTime: number) {
        // Hide rocket when queing
        if (getPref(PrefKey.UI_LOADING_SCREEN_ROCKET) === 'hide-queue') {
            LoadingScreen.#hideRocket();
        }

        let secondsLeft = waitTime;
        let $countDown;
        let $estimated;

        LoadingScreen.#orgWebTitle = document.title;

        const endDate = new Date();
        const timeZoneOffsetSeconds = endDate.getTimezoneOffset() * 60;
        endDate.setSeconds(endDate.getSeconds() + waitTime - timeZoneOffsetSeconds);

        let endDateStr = endDate.toISOString().slice(0, 19);
        endDateStr = endDateStr.substring(0, 10) + ' ' + endDateStr.substring(11, 19);
        endDateStr += ` (${LoadingScreen.#secondsToString(waitTime)})`;

        let $waitTimeBox = LoadingScreen.#$waitTimeBox;
        if (!$waitTimeBox) {
            $waitTimeBox = CE('div', {'class': 'bx-wait-time-box'},
                                    CE('label', {}, t('server')),
                                    CE('span', {}, getPreferredServerRegion()),
                                    CE('label', {}, t('wait-time-estimated')),
                                    $estimated = CE('span', {}),
                                    CE('label', {}, t('wait-time-countdown')),
                                    $countDown = CE('span', {}),
                                   );

            document.documentElement.appendChild($waitTimeBox);
            LoadingScreen.#$waitTimeBox = $waitTimeBox;
        } else {
            $waitTimeBox.classList.remove('bx-gone');
            $estimated = $waitTimeBox.querySelector('.bx-wait-time-estimated')!;
            $countDown = $waitTimeBox.querySelector('.bx-wait-time-countdown')!;
        }

        $estimated.textContent = endDateStr;
        $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
        document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;

        LoadingScreen.#waitTimeInterval = window.setInterval(() => {
            secondsLeft--;
            $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
            document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;

            if (secondsLeft <= 0) {
                LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
                LoadingScreen.#waitTimeInterval = null;
            }
        }, 1000);
    }

    static hide() {
        LoadingScreen.#orgWebTitle && (document.title = LoadingScreen.#orgWebTitle);
        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('bx-gone');

        if (getPref(PrefKey.UI_LOADING_SCREEN_GAME_ART) && LoadingScreen.#$bgStyle) {
            const $rocketBg = document.querySelector('#game-stream rect[width="800"]');
            $rocketBg && $rocketBg.addEventListener('transitionend', e => {
                LoadingScreen.#$bgStyle.textContent += `
#game-stream {
    background: #000 !important;
}
`;
            });

            LoadingScreen.#$bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 1 !important;
}
`;
        }

        setTimeout(LoadingScreen.reset, 2000);
    }

    static reset() {
        LoadingScreen.#$bgStyle && (LoadingScreen.#$bgStyle.textContent = '');

        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('bx-gone');
        LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
        LoadingScreen.#waitTimeInterval = null;
    }
}
