import { STATES } from "@utils/global.ts";
import { ButtonStyle, createButton, createSvgIcon } from "@utils/html.ts";
import { BxIcon } from "@utils/bx-icon";
import { BxEvent, XcloudGuideWhere } from "@utils/bx-event.ts";
import { t } from "@utils/translation.ts";
import { StreamBadges } from "./stream-badges.ts";
import { StreamStats } from "./stream-stats.ts";


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


export function injectStreamMenuButtons() {
    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if (!$screen) {
        return;
    }

    if (($screen as any).xObserving) {
        return;
    }

    ($screen as any).xObserving = true;

    const $settingsDialog = document.querySelector('.bx-stream-settings-dialog')!;
    const $parent = $screen.parentElement;
    const hideSettingsFunc = (e?: MouseEvent | TouchEvent) => {
        if (e) {
            const $target = e.target as HTMLElement;
            e.stopPropagation();
            if ($target != $parent && $target.id !== 'MultiTouchSurface' && !$target.querySelector('#BabylonCanvasContainer-main')) {
                return;
            }
            if ($target.id === 'MultiTouchSurface') {
                $target.removeEventListener('touchstart', hideSettingsFunc);
            }
        }

        // Hide Stream settings dialog
        $settingsDialog.classList.add('bx-gone');

        $parent?.removeEventListener('click', hideSettingsFunc);
        // $parent.removeEventListener('touchstart', hideSettingsFunc);
    }

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
                    const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]');
                    if (!$btnCloseHud) {
                        return;
                    }

                    // Hide Stream Settings dialog when closing HUD
                    $btnCloseHud && $btnCloseHud.addEventListener('click', e => {
                        $settingsDialog.classList.add('bx-gone');
                    });

                    // Create Refresh button from the Close button
                    const $btnRefresh = $btnCloseHud.cloneNode(true) as HTMLElement;

                    // Refresh SVG
                    const $svgRefresh = createSvgIcon(BxIcon.REFRESH);
                    // Copy classes
                    $svgRefresh.setAttribute('class', $btnRefresh.firstElementChild!.getAttribute('class') || '');
                    $svgRefresh.style.fill = 'none';

                    $btnRefresh.classList.add('bx-stream-refresh-button');
                    // Remove icon
                    $btnRefresh.removeChild($btnRefresh.firstElementChild!);
                    // Add Refresh icon
                    $btnRefresh.appendChild($svgRefresh);
                    // Add "click" event listener
                    $btnRefresh.addEventListener('click', e => {
                        confirm(t('confirm-reload-stream')) && window.location.reload();
                    });
                    // Add to website
                    $btnCloseHud.insertAdjacentElement('afterend', $btnRefresh);

                    // Render stream badges
                    const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                    $menu?.appendChild(await StreamBadges.getInstance().render());

                    hideSettingsFunc();
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
                        $settingsDialog.classList.remove('bx-gone');

                        $parent?.addEventListener('click', hideSettingsFunc);
                        //$parent.addEventListener('touchstart', hideSettingsFunc);

                        const $touchSurface = document.getElementById('MultiTouchSurface');
                        $touchSurface && $touchSurface.style.display != 'none' && $touchSurface.addEventListener('touchstart', hideSettingsFunc);
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


export function showStreamSettings(tabId: string) {
    const $wrapper = document.querySelector('.bx-stream-settings-dialog');
    if (!$wrapper) {
        return;
    }

    // Select tab
    if (tabId) {
        const $tab = $wrapper.querySelector(`.bx-stream-settings-tabs svg[data-group=${tabId}]`);
        $tab && $tab.dispatchEvent(new Event('click'));
    }

    $wrapper.classList.remove('bx-gone');

    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if ($screen && $screen.parentElement) {
        const $parent = $screen.parentElement;
        if (!$parent || ($parent as any).bxClick) {
            return;
        }

        ($parent as any).bxClick = true;

        const onClick = (e: Event) => {
            $wrapper.classList.add('bx-gone');
            ($parent as any).bxClick = false;
            $parent.removeEventListener('click', onClick);
        };

        $parent.addEventListener('click', onClick);
    }
}


export function setupStreamUiEvents() {
    window.addEventListener(BxEvent.XCLOUD_GUIDE_SHOWN, async e => {
        const where = (e as any).where as XcloudGuideWhere;

        if (where !== XcloudGuideWhere.HOME || !STATES.isPlaying) {
            return;
        }

        const $btnQuit = document.querySelector('#gamepass-dialog-root a[class*=QuitGameButton]');
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
        const $btnXcloudHome = document.querySelector('#gamepass-dialog-root div[class^=HomeButtonWithDivider]') as HTMLElement;
        $btnXcloudHome && ($btnXcloudHome.style.display = 'none');
    });
}
