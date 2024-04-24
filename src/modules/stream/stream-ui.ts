import { States } from "../../utils/global";
import { Icon } from "../../utils/html";
import { BxEvent } from "../bx-event";
import { PrefKey, getPref } from "../preferences";
import { t } from "../translation";
import { StreamBadges } from "./stream-badges";
import { StreamStats } from "./stream-stats";


class MouseHoldEvent {
    #isHolding = false;
    #timeout?: number | null;

    #$elm;
    #callback;
    #duration;

    #onMouseDown(e: MouseEvent | TouchEvent) {
        const _this = this;
        this.#isHolding = false;

        this.#timeout && clearTimeout(this.#timeout);
        this.#timeout = setTimeout(() => {
            _this.#isHolding = true;
            _this.#callback();
        }, this.#duration);
    };

    #onMouseUp(e: MouseEvent | TouchEvent) {
        this.#timeout && clearTimeout(this.#timeout);
        this.#timeout = null;

        if (this.#isHolding) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.#isHolding = false;
    };

    #addEventListeners = () => {
        this.#$elm.addEventListener('mousedown', this.#onMouseDown.bind(this));
        this.#$elm.addEventListener('click', this.#onMouseUp.bind(this));

        this.#$elm.addEventListener('touchstart', this.#onMouseDown.bind(this));
        this.#$elm.addEventListener('touchend', this.#onMouseUp.bind(this));
    }

    /*
    #clearEventLiseners = () => {
        this.#$elm.removeEventListener('mousedown', this.#onMouseDown);
        this.#$elm.removeEventListener('click', this.#onMouseUp);

        this.#$elm.removeEventListener('touchstart', this.#onMouseDown);
        this.#$elm.removeEventListener('touchend', this.#onMouseUp);
    }
    */

    constructor($elm: HTMLElement, callback: any, duration=1000) {
        this.#$elm = $elm;
        this.#callback = callback;
        this.#duration = duration;

        this.#addEventListeners();
        // $elm.clearMouseHoldEventListeners = this.#clearEventLiseners;
    }
}


function cloneStreamHudButton($orgButton: HTMLElement, label: string, svgIcon: Icon) {
    const $container = $orgButton.cloneNode(true) as HTMLElement;
    let timeout: number | null;

    const onTransitionStart = (e: TransitionEvent) => {
        if ( e.propertyName !== 'opacity') {
            return;
        }

        timeout && clearTimeout(timeout);
        $container.style.pointerEvents = 'none';
    };

    const onTransitionEnd = (e: TransitionEvent) => {
        if ( e.propertyName !== 'opacity') {
            return;
        }

        const left = document.getElementById('StreamHud')?.style.left;
        if (left === '0px') {
            timeout && clearTimeout(timeout);
            timeout = setTimeout(() => {
                    $container.style.pointerEvents = 'auto';
                }, 100);
        }
    };

    if (States.hasTouchSupport) {
        $container.addEventListener('transitionstart', onTransitionStart);
        $container.addEventListener('transitionend', onTransitionEnd);
    }

    const $button = $container.querySelector('button')!;
    $button.setAttribute('title', label);

    const $svg = $button.querySelector('svg')!;
    $svg.innerHTML = svgIcon;
    $svg.style.fill = 'none';

    const attrs = {
        'fill': 'none',
        'stroke': '#fff',
        'fill-rule': 'evenodd',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        'viewBox': '0 0 32 32'
    };

    let attr: keyof typeof attrs;
    for (attr in attrs) {
        $svg.setAttribute(attr, attrs[attr]);
    }

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

    const $quickBar = document.querySelector('.bx-quick-settings-bar')!;
    const $parent = $screen.parentElement;
    const hideQuickBarFunc = (e?: MouseEvent | TouchEvent) => {
        if (e) {
            const $target = e.target as HTMLElement;
            e.stopPropagation();
            if ($target != $parent && $target.id !== 'MultiTouchSurface' && !$target.querySelector('#BabylonCanvasContainer-main')) {
                return;
            }
            if ($target.id === 'MultiTouchSurface') {
                $target.removeEventListener('touchstart', hideQuickBarFunc);
            }
        }

        // Hide Quick settings bar
        $quickBar.classList.add('bx-gone');

        $parent?.removeEventListener('click', hideQuickBarFunc);
        // $parent.removeEventListener('touchstart', hideQuickBarFunc);
    }

    let $btnStreamSettings: HTMLElement;
    let $btnStreamStats: HTMLElement;

    const PREF_DISABLE_FEEDBACK_DIALOG = getPref(PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG);
    const observer = new MutationObserver(mutationList => {
        mutationList.forEach(item => {
            if (item.type !== 'childList') {
                return;
            }

            item.removedNodes.forEach($node => {
                if (!$node || $node.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }

                if (!($node as HTMLElement).className || !($node as HTMLElement).className.startsWith) {
                    return;
                }

                if (($node as HTMLElement).className.startsWith('StreamMenu')) {
                    if (!document.querySelector('div[class^=PureInStreamConfirmationModal]')) {
                        BxEvent.dispatch(window, BxEvent.STREAM_MENU_HIDDEN);
                    }
                }
            });

            item.addedNodes.forEach(async $node => {
                if (!$node || $node.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }

                let $elm: HTMLElement | null = $node as HTMLElement;

                // Error Page: .PureErrorPage.ErrorScreen
                if ($elm.className.includes('PureErrorPage')) {
                    BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
                    return;
                }

                if (PREF_DISABLE_FEEDBACK_DIALOG && $elm.className.startsWith('PostStreamFeedbackScreen')) {
                    const $btnClose = $elm.querySelector('button');
                    $btnClose && $btnClose.click();
                    return;
                }

                // Render badges
                if ($elm.className.startsWith('StreamMenu')) {
                    BxEvent.dispatch(window, BxEvent.STREAM_MENU_SHOWN);

                    // Hide Quick bar when closing HUD
                    const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]');
                    if (!$btnCloseHud) {
                        return;
                    }

                    $btnCloseHud && $btnCloseHud.addEventListener('click', e => {
                        $quickBar.classList.add('bx-gone');
                    });

                    // Get "Quit game" button
                    const $btnQuit = $elm.querySelector('div[class^=StreamMenu] > div > button:last-child') as HTMLElement;
                    // Hold "Quit game" button to refresh the stream
                    new MouseHoldEvent($btnQuit, () => {
                        confirm(t('confirm-reload-stream')) && window.location.reload();
                    }, 1000);

                    // Render stream badges
                    const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                    $menu?.appendChild(await StreamBadges.render());

                    hideQuickBarFunc();
                    return;
                }

                if ($elm.className.startsWith('Overlay-module_') || $elm.className.startsWith('InProgressScreen')) {
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
                    $btnStreamSettings = cloneStreamHudButton($orgButton, t('menu-stream-settings'), Icon.STREAM_SETTINGS);
                    $btnStreamSettings.addEventListener('click', e => {
                        hideGripHandle();
                        e.preventDefault();

                        // Show Quick settings bar
                        $quickBar.classList.remove('bx-gone');

                        $parent?.addEventListener('click', hideQuickBarFunc);
                        //$parent.addEventListener('touchstart', hideQuickBarFunc);

                        const $touchSurface = document.getElementById('MultiTouchSurface');
                        $touchSurface && $touchSurface.style.display != 'none' && $touchSurface.addEventListener('touchstart', hideQuickBarFunc);
                    });
                }

                // Create Stream Stats button
                if (!$btnStreamStats) {
                    $btnStreamStats = cloneStreamHudButton($orgButton, t('menu-stream-stats'), Icon.STREAM_STATS);
                    $btnStreamStats.addEventListener('click', e => {
                        hideGripHandle();
                        e.preventDefault();

                        // Toggle Stream Stats
                        StreamStats.toggle();

                        const btnStreamStatsOn = (!StreamStats.isHidden() && !StreamStats.isGlancing());
                        $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);
                    });
                }

                const btnStreamStatsOn = (!StreamStats.isHidden() && !StreamStats.isGlancing());
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
    const $wrapper = document.querySelector('.bx-quick-settings-bar');
    if (!$wrapper) {
        return;
    }

    // Select tab
    if (tabId) {
        const $tab = $wrapper.querySelector(`.bx-quick-settings-tabs svg[data-group=${tabId}]`);
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
