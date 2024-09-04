import { BxEvent } from "@/utils/bx-event";
import { AppInterface, STATES } from "@/utils/global";
import { createButton, ButtonStyle, CE } from "@/utils/html";
import { t } from "@/utils/translation";
import { SettingsNavigationDialog } from "./dialog/settings-dialog";
import { TrueAchievements } from "@/utils/true-achievements";
import { BxIcon } from "@/utils/bx-icon";

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

        closeApp: AppInterface && createButton({
            icon: BxIcon.POWER,
            title: t('close-app'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
            onClick: e => {
                AppInterface.closeApp();
            },

            attributes: {
                'data-state': 'normal',
            },
        }),

        reloadPage: createButton({
            icon: BxIcon.REFRESH,
            title: t('reload-page'),
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
            icon: BxIcon.HOME,
            title: t('back-to-home'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                confirm(t('back-to-home-confirm')) && (window.location.href = window.location.href.substring(0, 31));

                // Close all xCloud's dialogs
                window.BX_EXPOSED.dialogRoutes.closeAll();
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
            [
                TrueAchievements.$button,
                GuideMenu.#BUTTONS.backToHome,
                GuideMenu.#BUTTONS.reloadPage,
                GuideMenu.#BUTTONS.closeApp,
            ],
        ];

        for (const $button of buttons) {
            if (!$button) {
                continue;
            }

            if ($button instanceof HTMLElement) {
                $div.appendChild($button);
            } else if (Array.isArray($button)) {
                const $wrapper = CE('div', {});
                for (const $child of $button) {
                    $child && $wrapper.appendChild($child);
                }
                $div.appendChild($wrapper);
            }
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

    static addEventListeners() {
        window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, GuideMenu.#onShown);
    }

    static observe($addedElm: HTMLElement) {
        const className = $addedElm.className;
        if (!className.startsWith('NavigationAnimation') &&
                !className.startsWith('DialogRoutes') &&
                !className.startsWith('Dialog-module__container')) {
            return;
        }

        // Achievement Details page
        const $achievDetailPage = $addedElm.querySelector('div[class*=AchievementDetailPage]');
        if ($achievDetailPage) {
            TrueAchievements.injectAchievementDetailPage($achievDetailPage as HTMLElement);
            return;
        }

        // Find navigation bar
        const $selectedTab = $addedElm.querySelector('div[class^=NavigationMenu] button[aria-selected=true');
        if ($selectedTab) {
            let $elm: Element | null = $selectedTab;
            let index;
            for (index = 0; ($elm = $elm?.previousElementSibling); index++);

            if (index === 0) {
                BxEvent.dispatch(window, BxEvent.XCLOUD_GUIDE_MENU_SHOWN, {where: GuideMenuTab.HOME});
            }
        }
    }
}
