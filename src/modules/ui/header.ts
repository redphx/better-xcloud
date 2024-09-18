import { SCRIPT_VERSION } from "@utils/global";
import { createButton, ButtonStyle, CE, isElementVisible } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { getPreferredServerRegion } from "@utils/region";
import { RemotePlayManager } from "@/modules/remote-play-manager";
import { t } from "@utils/translation";
import { SettingsNavigationDialog } from "./dialog/settings-dialog";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";

export class HeaderSection {
    static #$remotePlayBtn = createButton({
        classes: ['bx-header-remote-play-button', 'bx-gone'],
        icon: BxIcon.REMOTE_PLAY,
        title: t('remote-play'),
        style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.CIRCULAR,
        onClick: e => {
            RemotePlayManager.getInstance().togglePopup();
        },
    });

    static #$settingsBtn = createButton({
        classes: ['bx-header-settings-button'],
        label: '???',
        style: ButtonStyle.FROSTED | ButtonStyle.DROP_SHADOW | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
        onClick: e => {
            SettingsNavigationDialog.getInstance().show();
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
        const $btnSettings = HeaderSection.#$settingsBtn;
        if (isElementVisible(HeaderSection.#$buttonsWrapper)) {
            return;
        }

        $btnSettings.querySelector('span')!.textContent = getPreferredServerRegion(true) || t('better-xcloud');

        // Show new update status
        if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
            $btnSettings.setAttribute('data-update-available', 'true');
        }

        // Add the Settings button to the web page
        $parent.appendChild(HeaderSection.#$buttonsWrapper);
    }

    static checkHeader() {
        let $target = document.querySelector('#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]');
        if (!$target) {
            $target = document.querySelector("div[class^=UnsupportedMarketPage-module__buttons]");
        }

        $target && HeaderSection.#injectSettingsButton($target as HTMLElement);
    }

    static showRemotePlayButton() {
        HeaderSection.#$remotePlayBtn.classList.remove('bx-gone');
    }

    static watchHeader() {
        const $root = document.querySelector('#PageContent header') || document.querySelector('#root');
        if (!$root) {
            return;
        }

        HeaderSection.#timeout && clearTimeout(HeaderSection.#timeout);
        HeaderSection.#timeout = null;

        HeaderSection.#observer && HeaderSection.#observer.disconnect();
        HeaderSection.#observer = new MutationObserver(mutationList => {
            HeaderSection.#timeout && clearTimeout(HeaderSection.#timeout);
            HeaderSection.#timeout = window.setTimeout(HeaderSection.checkHeader, 2000);
        });
        HeaderSection.#observer.observe($root, {subtree: true, childList: true});

        HeaderSection.checkHeader();
    }
}
