import { BxEvent } from "@/utils/bx-event";
import { AppInterface, STATES } from "@/utils/global";
import { createButton, ButtonStyle, CE } from "@/utils/html";
import { t } from "@/utils/translation";
import { SettingsNavigationDialog } from "./dialog/settings-dialog";

export enum GuideMenuTab {
    HOME = 'home',
}

export class GuideMenu {
    static #BUTTONS = {
        scriptSettings: createButton({
            label: t('better-xcloud'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY,
            onClick: e => {
                // Wait until the Guide dialog is closed
                window.addEventListener(BxEvent.XCLOUD_DIALOG_DISMISSED, e => {
                    setTimeout(() => SettingsNavigationDialog.getInstance().show(), 50);
                }, {once: true});

                // Close all xCloud's dialogs
                window.BX_EXPOSED.dialogRoutes.closeAll();
            },
        }),

        appSettings: createButton({
            label: t('app-settings'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                // Close all xCloud's dialogs
                window.BX_EXPOSED.dialogRoutes.closeAll();

                AppInterface.openAppSettings && AppInterface.openAppSettings();
            },
        }),

        closeApp: createButton({
            label: t('close-app'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
            onClick: e => {
                AppInterface.closeApp();
            },
            attributes: {
                'data-state': 'normal',
            },
        }),

        reloadPage: createButton({
            label: t('reload-page'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                if (STATES.isPlaying) {
                    confirm(t('confirm-reload-stream')) && window.location.reload();
                } else {
                    window.location.reload();
                }

                // Close all xCloud's dialogs
                window.BX_EXPOSED.dialogRoutes.closeAll();
            },
        }),

        backToHome: createButton({
            label: t('back-to-home'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                confirm(t('back-to-home-confirm')) && (window.location.href = window.location.href.substring(0, 31));
            },
            attributes: {
                'data-state': 'playing',
            },
        }),
    }

    static #$renderedButtons: HTMLElement;

    static #renderButtons() {
        if (GuideMenu.#$renderedButtons) {
            return GuideMenu.#$renderedButtons;
        }

        const $div = CE('div', {
            class: 'bx-guide-home-buttons',
        });

        const buttons = [
            GuideMenu.#BUTTONS.scriptSettings,
            GuideMenu.#BUTTONS.reloadPage,
            GuideMenu.#BUTTONS.backToHome,
            AppInterface && GuideMenu.#BUTTONS.closeApp,
        ];

        for (const $button of buttons) {
            $button && $div.appendChild($button);
        }

        GuideMenu.#$renderedButtons = $div;
        return $div;
    }

    static #injectHome($root: HTMLElement, isPlaying = false) {
        // Find the element to add buttons to
        let $target: HTMLElement | null = null;
        if (isPlaying) {
            // Quit button
            $target = $root.querySelector('a[class*=QuitGameButton]');

            // Hide xCloud's Home button
            const $btnXcloudHome = $root.querySelector('div[class^=HomeButtonWithDivider]') as HTMLElement;
            $btnXcloudHome && ($btnXcloudHome.style.display = 'none');
        } else {
            // Last divider
            const $dividers = $root.querySelectorAll('div[class*=Divider-module__divider]');
            if ($dividers) {
                $target = $dividers[$dividers.length - 1] as HTMLElement;
            }
        }

        if (!$target) {
            return false;
        }

        const $buttons = GuideMenu.#renderButtons();
        $buttons.dataset.isPlaying = isPlaying.toString();
        $target.insertAdjacentElement('afterend', $buttons);
    }

    static async #onShown(e: Event) {
        const where = (e as any).where as GuideMenuTab;

        if (where === GuideMenuTab.HOME) {
            const $root = document.querySelector('#gamepass-dialog-root div[role=dialog] div[role=tabpanel] div[class*=HomeLandingPage]') as HTMLElement;
            $root && GuideMenu.#injectHome($root, STATES.isPlaying);
        }
    }

    static observe() {
        window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, GuideMenu.#onShown);
    }
}
