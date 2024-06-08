import { BxEvent } from "@/utils/bx-event";
import { AppInterface, STATES } from "@/utils/global";
import { createButton, ButtonStyle } from "@/utils/html";
import { t } from "@/utils/translation";

export enum GuideMenuTab {
    HOME,
}

export class GuideMenu {
    static #injectHome($root: HTMLElement) {
        // Find the last divider
        const $dividers = $root.querySelectorAll('div[class*=Divider-module__divider]');
        if (!$dividers) {
            return;
        }
        const $lastDivider = $dividers[$dividers.length - 1];

        // Add "Close app" button
        if (AppInterface) {
            const $btnQuit = createButton({
                label: t('close-app'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
                onClick: e => {
                    AppInterface.closeApp();
                },
            });

            $lastDivider.insertAdjacentElement('afterend', $btnQuit);
        }
    }

    static #injectHomePlaying($root: HTMLElement) {
        const $btnQuit = $root.querySelector('a[class*=QuitGameButton]');
        if (!$btnQuit) {
            return;
        }

        // Add buttons
        const $btnReload = createButton({
            label: t('reload-stream'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                confirm(t('confirm-reload-stream')) && window.location.reload();
            },
        });

        const $btnHome = createButton({
            label: t('back-to-home'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                confirm(t('back-to-home-confirm')) && (window.location.href = window.location.href.substring(0, 31));
            },
        });

        $btnQuit.insertAdjacentElement('afterend', $btnReload);
        $btnReload.insertAdjacentElement('afterend', $btnHome);

        // Hide xCloud's Home button
        const $btnXcloudHome = $root.querySelector('div[class^=HomeButtonWithDivider]') as HTMLElement;
        $btnXcloudHome && ($btnXcloudHome.style.display = 'none');
    }

    static async #onShown(e: Event) {
        const where = (e as any).where as GuideMenuTab;

        if (where === GuideMenuTab.HOME) {
            const $root = document.querySelector('#gamepass-dialog-root div[role=dialog]') as HTMLElement;
            if (STATES.isPlaying) {
                GuideMenu.#injectHomePlaying($root);
            } else {
                GuideMenu.#injectHome($root);
            }
        }
    }

    static observe() {
        window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, GuideMenu.#onShown);
    }
}
