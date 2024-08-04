import { STATES } from "@utils/global.ts";
import { createSvgIcon } from "@utils/html.ts";
import { BxIcon } from "@utils/bx-icon";
import { BxEvent } from "@utils/bx-event.ts";
import { t } from "@utils/translation.ts";
import { StreamBadges } from "./stream-badges.ts";
import { StreamStats } from "./stream-stats.ts";
import { SettingsNavigationDialog } from "../ui/dialog/settings-dialog.ts";


export class StreamUiHandler {
    private static $btnStreamSettings: HTMLElement | null | undefined;
    private static $btnStreamStats: HTMLElement | null | undefined;
    private static $btnRefresh: HTMLElement | null | undefined;
    private static $btnHome: HTMLElement | null | undefined;
    private static observer: MutationObserver | undefined;

    private static cloneStreamHudButton($btnOrg: HTMLElement, label: string, svgIcon: typeof BxIcon): HTMLElement | null {
        const $streamHud = document.getElementById('StreamHud') as HTMLElement;
        if (!$streamHud || !$btnOrg) {
            return null;
        }

        const $container = $btnOrg.cloneNode(true) as HTMLElement;
        let timeout: number | null;

        // Prevent touching other button while the bar is showing/hiding
        if (STATES.browser.capabilities.touch) {
            const onTransitionStart = (e: TransitionEvent) => {
                if (e.propertyName !== 'opacity') {
                    return;
                }

                timeout && clearTimeout(timeout);
                $container.style.pointerEvents = 'none';
            };

            const onTransitionEnd = (e: TransitionEvent) => {
                if (e.propertyName !== 'opacity') {
                    return;
                }

                const left = $streamHud.style.left;
                if (left === '0px') {
                    timeout && clearTimeout(timeout);
                    timeout = window.setTimeout(() => {
                        $container.style.pointerEvents = 'auto';
                    }, 100);
                }
            };

            $container.addEventListener('transitionstart', onTransitionStart);
            $container.addEventListener('transitionend', onTransitionEnd);
        }

        const $button = $container.querySelector('button') as HTMLElement;
        if (!$button) {
            return null;
        }
        $button.setAttribute('title', label);

        const $orgSvg = $button.querySelector('svg') as SVGElement;
        if (!$orgSvg) {
            return null;
        }

        const $svg = createSvgIcon(svgIcon);
        $svg.style.fill = 'none';
        $svg.setAttribute('class', $orgSvg.getAttribute('class') || '');
        $svg.ariaHidden = 'true';

        $orgSvg.replaceWith($svg);
        return $container;
    }

    private static cloneCloseButton($btnOrg: HTMLElement, icon: typeof BxIcon, className: string, onChange: any): HTMLElement | null {
        if (!$btnOrg) {
            return null;
        }
        // Create button from the Close button
        const $btn = $btnOrg.cloneNode(true) as HTMLElement;

        const $svg = createSvgIcon(icon);
        // Copy classes
        $svg.setAttribute('class', $btn.firstElementChild!.getAttribute('class') || '');
        $svg.style.fill = 'none';

        $btn.classList.add(className);
        // Remove icon
        $btn.removeChild($btn.firstElementChild!);
        // Add icon
        $btn.appendChild($svg);
        // Add "click" event listener
        $btn.addEventListener('click', onChange);

        return $btn;
    }

    private static async handleStreamMenu() {
        const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]') as HTMLElement;
        if (!$btnCloseHud) {
            return;
        }

        let $btnRefresh = StreamUiHandler.$btnRefresh;
        let $btnHome = StreamUiHandler.$btnHome;

        // Create Refresh button from the Close button
        if (typeof $btnRefresh === 'undefined') {
            $btnRefresh = StreamUiHandler.cloneCloseButton($btnCloseHud, BxIcon.REFRESH, 'bx-stream-refresh-button', () => {
                confirm(t('confirm-reload-stream')) && window.location.reload();
            });
        }

        if (typeof $btnHome === 'undefined') {
            $btnHome = StreamUiHandler.cloneCloseButton($btnCloseHud, BxIcon.HOME, 'bx-stream-home-button', () => {
                confirm(t('back-to-home-confirm')) && (window.location.href = window.location.href.substring(0, 31));
            });
        }

        // Add to website
        if ($btnRefresh && $btnHome) {
            $btnCloseHud.insertAdjacentElement('afterend', $btnRefresh);
            $btnRefresh.insertAdjacentElement('afterend', $btnHome);
        }

        // Render stream badges
        const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
        $menu?.appendChild(await StreamBadges.getInstance().render());
    }

    private static handleSystemMenu($streamHud: HTMLElement) {
        const streamStats = StreamStats.getInstance();

        // Grip handle
        const $gripHandle = $streamHud.querySelector('button[class^=GripHandle]') as HTMLElement;

        const hideGripHandle = () => {
            if (!$gripHandle) {
                return;
            }

            $gripHandle.dispatchEvent(new PointerEvent('pointerdown'));
            $gripHandle.click();
            $gripHandle.dispatchEvent(new PointerEvent('pointerdown'));
            $gripHandle.click();
        }

        // Get the last button
        const $orgButton = $streamHud.querySelector('div[class^=HUDButton]') as HTMLElement;
        if (!$orgButton) {
            return;
        }

        // Create Stream Settings button
        let $btnStreamSettings = StreamUiHandler.$btnStreamSettings;
        if (typeof $btnStreamSettings === 'undefined') {
            $btnStreamSettings = StreamUiHandler.cloneStreamHudButton($orgButton, t('better-xcloud'), BxIcon.BETTER_XCLOUD);
            $btnStreamSettings?.addEventListener('click', e => {
                hideGripHandle();
                e.preventDefault();

                // Show Stream Settings dialog
                SettingsNavigationDialog.getInstance().show();
            });
        }

        // Create Stream Stats button
        let $btnStreamStats = StreamUiHandler.$btnStreamStats;
        if (typeof $btnStreamStats === 'undefined') {
            $btnStreamStats = StreamUiHandler.cloneStreamHudButton($orgButton, t('stream-stats'), BxIcon.STREAM_STATS);
            $btnStreamStats?.addEventListener('click', e => {
                hideGripHandle();
                e.preventDefault();

                // Toggle Stream Stats
                streamStats.toggle();

                const btnStreamStatsOn = (!streamStats.isHidden() && !streamStats.isGlancing());
                $btnStreamStats!.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);
            });
        }

        const $btnParent = $orgButton.parentElement!;

        if ($btnStreamSettings && $btnStreamStats) {
            const btnStreamStatsOn = (!streamStats.isHidden() && !streamStats.isGlancing());
            $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);

            // Insert buttons after Stream Settings button
            $btnParent.insertBefore($btnStreamStats, $btnParent.lastElementChild);
            $btnParent.insertBefore($btnStreamSettings, $btnStreamStats);
        }

        // Move the Dots button to the beginning
        const $dotsButton = $btnParent.lastElementChild!;
        $dotsButton.parentElement!.insertBefore($dotsButton, $dotsButton.parentElement!.firstElementChild);
    }

    private static reset() {
        StreamUiHandler.$btnStreamSettings = undefined;
        StreamUiHandler.$btnStreamStats = undefined;
        StreamUiHandler.$btnRefresh = undefined;
        StreamUiHandler.$btnHome = undefined;

        StreamUiHandler.observer && StreamUiHandler.observer.disconnect();
        StreamUiHandler.observer = undefined;
    }

    static observe() {
        StreamUiHandler.reset();

        const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
        if (!$screen) {
            return;
        }

        console.log('StreamUI', 'observing');
        const observer = new MutationObserver(mutationList => {
            mutationList.forEach(item => {
                if (item.type !== 'childList') {
                    return;
                }

                item.addedNodes.forEach(async $node => {
                    if (!$node || $node.nodeType !== Node.ELEMENT_NODE) {
                        return;
                    }

                    let $elm: HTMLElement | null = $node as HTMLElement;

                    // Ignore non-HTML elements
                    if (!($elm instanceof HTMLElement)) {
                        return;
                    }

                    const className = $elm.className || '';

                    // Error Page: .PureErrorPage.ErrorScreen
                    if (className.includes('PureErrorPage')) {
                        BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
                        return;
                    }

                    // Render badges
                    if (className.startsWith('StreamMenu-module__container')) {
                        StreamUiHandler.handleStreamMenu();
                        return;
                    }

                    if (className.startsWith('Overlay-module_') || className.startsWith('InProgressScreen')) {
                        $elm = $elm.querySelector('#StreamHud');
                    }

                    if (!$elm || ($elm.id || '') !== 'StreamHud') {
                        return;
                    }

                    // Handle System Menu bar
                    StreamUiHandler.handleSystemMenu($elm);
                });
            });
        });

        observer.observe($screen, {subtree: true, childList: true});
    }
}
