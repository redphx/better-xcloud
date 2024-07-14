import { SCRIPT_VERSION } from "@utils/global";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { getPreferredServerRegion } from "@utils/region";
import { PrefKey, getPref } from "@utils/preferences";
import { RemotePlay } from "@modules/remote-play";
import { t } from "@utils/translation";
import { setupSettingsUi } from "./global-settings";

export class HeaderSection {
    static #$remotePlayBtn = createButton({
        classes: ['bx-header-remote-play-button', 'bx-gone'],
        icon: BxIcon.REMOTE_PLAY,
        title: t('remote-play'),
        style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
        onClick: e => {
            RemotePlay.togglePopup();
        },
    });

    static #$settingsBtn = createButton({
        classes: ['bx-header-settings-button'],
        label: '???',
        style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
        onClick: e => {
            setupSettingsUi();

            const $settings = document.querySelector('.bx-settings-container')!;
            $settings.classList.toggle('bx-gone');
            window.scrollTo(0, 0);
            document.activeElement && (document.activeElement as HTMLElement).blur();
        },
    });

    static #$buttonsWrapper = CE('div', {},
        getPref(PrefKey.REMOTE_PLAY_ENABLED) ? HeaderSection.#$remotePlayBtn : null,
        HeaderSection.#$settingsBtn,
    );

    static #observer: MutationObserver;
    static #timeout: number | null;

    static #injectSettingsButton($parent?: HTMLElement) {
        if (!$parent) {
            return;
        }

        const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);

        // Setup Settings button
        const $settingsBtn = HeaderSection.#$settingsBtn;
        $settingsBtn.querySelector('span')!.textContent = getPreferredServerRegion(true);

        // Show new update status
        if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
            $settingsBtn.setAttribute('data-update-available', 'true');
        }

        // Add the Settings button to the web page
        $parent.appendChild(HeaderSection.#$buttonsWrapper);
    }

    static checkHeader() {
        if (!HeaderSection.#$buttonsWrapper.isConnected) {
            const $rightHeader = document.querySelector('#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]');
            HeaderSection.#injectSettingsButton($rightHeader as HTMLElement);
        }
    }

    static showRemotePlayButton() {
        HeaderSection.#$remotePlayBtn.classList.remove('bx-gone');
    }

    static watchHeader() {
        const $header = document.querySelector('#PageContent header');
        if (!$header) {
            return;
        }

        HeaderSection.#observer && HeaderSection.#observer.disconnect();
        HeaderSection.#observer = new MutationObserver(mutationList => {
            HeaderSection.#timeout && clearTimeout(HeaderSection.#timeout);
            HeaderSection.#timeout = window.setTimeout(HeaderSection.checkHeader, 2000);
        });
        HeaderSection.#observer.observe($header, {subtree: true, childList: true});

        HeaderSection.checkHeader();
    }
}
