import { SCRIPT_VERSION } from "@utils/global";
import { createButton, ButtonStyle, CE, isElementVisible } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { getPreferredServerRegion } from "@utils/region";
import { RemotePlayManager } from "@/modules/remote-play-manager";
import { t } from "@utils/translation";
import { SettingsNavigationDialog } from "./dialog/settings-dialog";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { BxLogger } from "@/utils/bx-logger";

export class HeaderSection {
    private static instance: HeaderSection;
    public static getInstance = () => HeaderSection.instance ?? (HeaderSection.instance = new HeaderSection());
    private readonly LOG_TAG = 'HeaderSection';

    private $btnRemotePlay: HTMLElement;
    private $btnSettings: HTMLElement;
    private $buttonsWrapper: HTMLElement;

    private observer?: MutationObserver;
    private timeoutId?: number | null;

    constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.$btnRemotePlay = createButton({
            classes: ['bx-header-remote-play-button', 'bx-gone'],
            icon: BxIcon.REMOTE_PLAY,
            title: t('remote-play'),
            style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.CIRCULAR,
            onClick: e => RemotePlayManager.getInstance().togglePopup(),
        });

        this.$btnSettings = createButton({
            classes: ['bx-header-settings-button'],
            label: '???',
            style: ButtonStyle.FROSTED | ButtonStyle.DROP_SHADOW | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
            onClick: e => SettingsNavigationDialog.getInstance().show(),
        });

        this.$buttonsWrapper = CE('div', {},
            getPref(PrefKey.REMOTE_PLAY_ENABLED) ? this.$btnRemotePlay : null,
            this.$btnSettings,
        );
    }

    private injectSettingsButton($parent?: HTMLElement) {
        if (!$parent) {
            return;
        }

        const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);

        // Setup Settings button
        const $btnSettings = this.$btnSettings;
        if (isElementVisible(this.$buttonsWrapper)) {
            return;
        }

        $btnSettings.querySelector('span')!.textContent = getPreferredServerRegion(true) || t('better-xcloud');

        // Show new update status
        if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
            $btnSettings.setAttribute('data-update-available', 'true');
        }

        // Add the Settings button to the web page
        $parent.appendChild(this.$buttonsWrapper);
    }

    private checkHeader() {
        let $target = document.querySelector('#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]');
        if (!$target) {
            $target = document.querySelector('div[class^=UnsupportedMarketPage-module__buttons]');
        }

        $target && this.injectSettingsButton($target as HTMLElement);
    }

    private watchHeader() {
        const $root = document.querySelector('#PageContent header') || document.querySelector('#root');
        if (!$root) {
            return;
        }

        this.timeoutId && clearTimeout(this.timeoutId);
        this.timeoutId = null;

        this.observer && this.observer.disconnect();
        this.observer = new MutationObserver(mutationList => {
            this.timeoutId && clearTimeout(this.timeoutId);
            this.timeoutId = window.setTimeout(this.checkHeader.bind(this), 2000);
        });
        this.observer.observe($root, {subtree: true, childList: true});

        this.checkHeader();
    }

    showRemotePlayButton() {
        this.$btnRemotePlay.classList.remove('bx-gone');
    }

    static watchHeader() {
        HeaderSection.getInstance().watchHeader();
    }
}
