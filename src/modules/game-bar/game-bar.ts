import { CE, createSvgIcon } from "@utils/html";
import { ScreenshotAction } from "./action-screenshot";
import { TouchControlAction } from "./action-touch-control";
import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import type { BaseGameBarAction } from "./action-base";
import { STATES } from "@utils/global";
import { PrefKey, getPref } from "@utils/preferences";
import { MicrophoneAction } from "./action-microphone";


export class GameBar {
    private static instance: GameBar;

    public static getInstance(): GameBar {
        if (!GameBar.instance) {
            GameBar.instance = new GameBar();
        }

        return GameBar.instance;
    }

    private static readonly VISIBLE_DURATION = 2000;

    private $gameBar: HTMLElement;
    private $container: HTMLElement;

    private timeout: number | null = null;

    private actions: BaseGameBarAction[] = [];

    private constructor() {
        let $container;
        const $gameBar = CE('div', {id: 'bx-game-bar', class: 'bx-gone'},
                $container = CE('div', {class: 'bx-game-bar-container bx-offscreen'}),
                createSvgIcon(BxIcon.CARET_RIGHT),
            );

        this.actions = [
            new ScreenshotAction(),
            ...(STATES.hasTouchSupport && (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== 'off') ? [new TouchControlAction()] : []),
            new MicrophoneAction(),
        ];

        // Render actions
        for (const action of this.actions) {
            $container.appendChild(action.render());
        }

        // Toggle game bar when clicking on the game bar box
        $gameBar.addEventListener('click', e => {
            if (e.target !== $gameBar) {
                return;
            }

            $container.classList.contains('bx-show') ? this.hideBar() : this.showBar();
        });

        // Hide game bar after clicking on an action
        window.addEventListener(BxEvent.GAME_BAR_ACTION_ACTIVATED, this.hideBar.bind(this));

        $container.addEventListener('pointerover', this.clearHideTimeout.bind(this));
        $container.addEventListener('pointerout', this.beginHideTimeout.bind(this));

        // Add animation when hiding game bar
        $container.addEventListener('transitionend', e => {
            const classList = $container.classList;
            if (classList.contains('bx-hide')) {
                classList.remove('bx-offscreen', 'bx-hide');
                classList.add('bx-offscreen');
            }
        });

        document.documentElement.appendChild($gameBar);
        this.$gameBar = $gameBar;
        this.$container = $container;
    }

    private beginHideTimeout() {
        this.clearHideTimeout();

        this.timeout = window.setTimeout(() => {
                this.timeout = null;
                this.hideBar();
            }, GameBar.VISIBLE_DURATION);
    }

    private clearHideTimeout() {
        this.timeout && clearTimeout(this.timeout);
        this.timeout = null;
    }

    enable() {
        this.$gameBar && this.$gameBar.classList.remove('bx-gone');
    }

    disable() {
        this.hideBar();
        this.$gameBar && this.$gameBar.classList.add('bx-gone');
    }

    showBar() {
        if (!this.$container) {
            return;
        }

        this.$container.classList.remove('bx-offscreen', 'bx-hide');
        this.$container.classList.add('bx-show');

        this.beginHideTimeout();
    }

    hideBar() {
        if (!this.$container) {
            return;
        }

        this.$container.classList.remove('bx-show');
        this.$container.classList.add('bx-hide');
    }

    // Reset all states
    reset() {
        for (const action of this.actions) {
            action.reset();
        }
    }
}
