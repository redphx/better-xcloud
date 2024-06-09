import { SCRIPT_VERSION } from "@utils/global";
import { createButton, ButtonStyle } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { getPreferredServerRegion } from "@utils/region";
import { PrefKey, getPref } from "@utils/preferences";
import { RemotePlay } from "@modules/remote-play";
import { t } from "@utils/translation";
import { setupSettingsUi } from "./global-settings";


function injectSettingsButton($parent?: HTMLElement) {
    if (!$parent) {
        return;
    }

    const PREF_PREFERRED_REGION = getPreferredServerRegion(true);
    const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);

    const $headerFragment = document.createDocumentFragment();

    // Remote Play button
    if (getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
        const $remotePlayBtn = createButton({
            classes: ['bx-header-remote-play-button'],
            icon: BxIcon.REMOTE_PLAY,
            title: t('remote-play'),
            style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
            onClick: e => {
                RemotePlay.togglePopup();
            },
        });
        $headerFragment.appendChild($remotePlayBtn);
    }

    // Setup Settings button
    const $settingsBtn = createButton({
        classes: ['bx-header-settings-button'],
        label: PREF_PREFERRED_REGION,
        style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
        onClick: e => {
            setupSettingsUi();

            const $settings = document.querySelector('.bx-settings-container')!;
            $settings.classList.toggle('bx-gone');
            window.scrollTo(0, 0);
            document.activeElement && (document.activeElement as HTMLElement).blur();
        },
    });

    // Show new update status
    if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
        $settingsBtn.setAttribute('data-update-available', 'true');
    }

    // Add the Settings button to the web page
    $headerFragment.appendChild($settingsBtn);
    $parent.appendChild($headerFragment);
}


export function checkHeader() {
    const $button = document.querySelector('.bx-header-settings-button');

    if (!$button) {
        const $rightHeader = document.querySelector('#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]');
        injectSettingsButton($rightHeader as HTMLElement);
    }
}


export function watchHeader() {
    const $header = document.querySelector('#PageContent header');
    if (!$header) {
        return;
    }

    let timeout: number | null;
    const observer = new MutationObserver(mutationList => {
        timeout && clearTimeout(timeout);
        timeout = window.setTimeout(checkHeader, 2000);
    });
    observer.observe($header, {subtree: true, childList: true});

    checkHeader();
}
