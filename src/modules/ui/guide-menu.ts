import { BxEvent } from "@/utils/bx-event";
import { AppInterface, STATES } from "@/utils/global";
import { createButton, ButtonStyle, CE } from "@/utils/html";
import { t } from "@/utils/translation";
import { StreamSettings } from "../stream/stream-settings";

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

        const buttons = [];

        // "Stream settings" button
        buttons.push(createButton({
            label: t('stream-settings'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                // Close all xCloud's dialogs
                window.BX_EXPOSED.dialogRoutes.closeAll();

                StreamSettings.getInstance().show();
            },
        }));

        // "App settings" & "Close app" buttons
        if (AppInterface) {
            buttons.push(createButton({
                label: t('android-app-settings'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                onClick: e => {
                    AppInterface.openAppSettings && AppInterface.openAppSettings();
                },
            }));

            buttons.push(createButton({
                label: t('close-app'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
                onClick: e => {
                    AppInterface.closeApp();
                },
            }));
        }

        if (!buttons.length) {
            return;
        }

        const $div = CE('div', {});

        for (const $button of buttons) {
            $div.appendChild($button);
        }

        const $lastDivider = $dividers[$dividers.length - 1];
        $lastDivider.insertAdjacentElement('afterend', $div);
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
