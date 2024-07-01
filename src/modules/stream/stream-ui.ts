import { STATES } from "@utils/global.ts";
import { createSvgIcon } from "@utils/html.ts";
import { BxIcon } from "@utils/bx-icon";
import { BxEvent } from "@utils/bx-event.ts";
import { t } from "@utils/translation.ts";
import { StreamBadges } from "./stream-badges.ts";
import { StreamStats } from "./stream-stats.ts";
import { StreamSettings } from "./stream-settings.ts";


function cloneStreamHudButton($orgButton: HTMLElement, label: string, svgIcon: typeof BxIcon) {
    const $container = $orgButton.cloneNode(true) as HTMLElement;
    let timeout: number | null;

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

        const left = document.getElementById('StreamHud')?.style.left;
        if (left === '0px') {
            timeout && clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                    $container.style.pointerEvents = 'auto';
                }, 100);
        }
    };

    if (STATES.browserHasTouchSupport) {
        $container.addEventListener('transitionstart', onTransitionStart);
        $container.addEventListener('transitionend', onTransitionEnd);
    }

    const $button = $container.querySelector('button')!;
    $button.setAttribute('title', label);

    const $orgSvg = $button.querySelector('svg')!;
    const $svg = createSvgIcon(svgIcon);
    $svg.style.fill = 'none';
    $svg.setAttribute('class', $orgSvg.getAttribute('class') || '');
    $svg.ariaHidden = 'true';

    $orgSvg.replaceWith($svg);
    return $container;
}


function cloneCloseButton($$btnOrg: HTMLElement, icon: typeof BxIcon, className: string, onChange: any) {
    // Create button from the Close button
    const $btn = $$btnOrg.cloneNode(true) as HTMLElement;

    // Refresh SVG
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


export function injectStreamMenuButtons() {
    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if (!$screen) {
        return;
    }

    if (($screen as any).xObserving) {
        return;
    }

    ($screen as any).xObserving = true;

    let $btnStreamSettings: HTMLElement;
    let $btnStreamStats: HTMLElement;
    const streamStats = StreamStats.getInstance();

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

                // Ignore SVG elements
                if ($elm instanceof SVGSVGElement) {
                    return;
                }

                // Error Page: .PureErrorPage.ErrorScreen
                if ($elm.className?.includes('PureErrorPage')) {
                    BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
                    return;
                }

                // Render badges
                if ($elm.className?.startsWith('StreamMenu-module__container')) {
                    const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]') as HTMLElement;
                    if (!$btnCloseHud) {
                        return;
                    }

                    // Hide Stream Settings dialog when closing HUD
                    $btnCloseHud.addEventListener('click', e => {
                        StreamSettings.getInstance().hide();
                    });

                    // Create Refresh button from the Close button
                    const $btnRefresh = cloneCloseButton($btnCloseHud, BxIcon.REFRESH, 'bx-stream-refresh-button', () => {
                        confirm(t('confirm-reload-stream')) && window.location.reload();
                    });

                    const $btnHome = cloneCloseButton($btnCloseHud, BxIcon.HOME, 'bx-stream-home-button', () => {
                        confirm(t('back-to-home-confirm')) && (window.location.href = window.location.href.substring(0, 31));
                    });

                    // Add to website
                    $btnCloseHud.insertAdjacentElement('afterend', $btnRefresh);
                    $btnRefresh.insertAdjacentElement('afterend', $btnHome);

                    // Render stream badges
                    const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                    $menu?.appendChild(await StreamBadges.getInstance().render());

                    return;
                }

                if ($elm.className?.startsWith('Overlay-module_') || $elm.className?.startsWith('InProgressScreen')) {
                    $elm = $elm.querySelector('#StreamHud');
                }

                if (!$elm || ($elm.id || '') !== 'StreamHud') {
                    return;
                }

                // Grip handle
                const $gripHandle = $elm.querySelector('button[class^=GripHandle]') as HTMLElement;

                const hideGripHandle = () => {
                    if (!$gripHandle) {
                        return;
                    }

                    $gripHandle.dispatchEvent(new PointerEvent('pointerdown'));
                    $gripHandle.click();
                    $gripHandle.dispatchEvent(new PointerEvent('pointerdown'));
                    $gripHandle.click();
                }

                // Get the second last button
                const $orgButton = $elm.querySelector('div[class^=HUDButton]') as HTMLElement;
                if (!$orgButton) {
                    return;
                }

                // Create Stream Settings button
                if (!$btnStreamSettings) {
                    $btnStreamSettings = cloneStreamHudButton($orgButton, t('stream-settings'), BxIcon.STREAM_SETTINGS);
                    $btnStreamSettings.addEventListener('click', e => {
                        hideGripHandle();
                        e.preventDefault();

                        // Show Stream Settings dialog
                        StreamSettings.getInstance().show();
                    });
                }

                // Create Stream Stats button
                if (!$btnStreamStats) {
                    $btnStreamStats = cloneStreamHudButton($orgButton, t('stream-stats'), BxIcon.STREAM_STATS);
                    $btnStreamStats.addEventListener('click', e => {
                        hideGripHandle();
                        e.preventDefault();

                        // Toggle Stream Stats
                        streamStats.toggle();

                        const btnStreamStatsOn = (!streamStats.isHidden() && !streamStats.isGlancing());
                        $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);
                    });
                }

                const btnStreamStatsOn = (!streamStats.isHidden() && !streamStats.isGlancing());
                $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);

                if ($orgButton) {
                    const $btnParent = $orgButton.parentElement!;

                    // Insert buttons after Stream Settings button
                    $btnParent.insertBefore($btnStreamStats, $btnParent.lastElementChild);
                    $btnParent.insertBefore($btnStreamSettings, $btnStreamStats);

                    // Move the Dots button to the beginning
                    const $dotsButton = $btnParent.lastElementChild!;
                    $dotsButton.parentElement!.insertBefore($dotsButton, $dotsButton.parentElement!.firstElementChild);
                }
            });
        });
    });
    observer.observe($screen, {subtree: true, childList: true});
}
