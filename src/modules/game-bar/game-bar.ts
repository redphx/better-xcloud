import { CE } from "@utils/html";
import { ActionScreenshot } from "./action-screenshot";
import { ActionTouchControl } from "./action-touch-control";
import { BxEvent } from "@/utils/bx-event";


export class GameBar {
    static readonly #VISIBLE_DURATION = 2000;
    static #timeout: number | null;

    static #$gameBar: HTMLElement;
    static #$container: HTMLElement;

    static #beginHideTimeout() {
        GameBar.#clearHideTimeout();

        GameBar.#timeout = window.setTimeout(() => {
                GameBar.#timeout = null;
                GameBar.hideBar();
            }, GameBar.#VISIBLE_DURATION);
    }

    static #clearHideTimeout() {
        GameBar.#timeout && clearTimeout(GameBar.#timeout);
        GameBar.#timeout = null;
    }

    static enable() {
        GameBar.#$gameBar && GameBar.#$gameBar.classList.remove('bx-gone');
    }

    static disable() {
        GameBar.#$gameBar && GameBar.#$gameBar.classList.add('bx-gone');
        GameBar.hideBar();
    }

    static showBar() {
        GameBar.#$container && GameBar.#$container.classList.remove('bx-gone');
        GameBar.#beginHideTimeout();
    }

    static hideBar() {
        GameBar.#$container && GameBar.#$container.classList.add('bx-gone');
    }

    static setup() {
        let $container;
        const $gameBar = CE('div', {id: 'bx-game-bar'},
                $container = CE('div', {'class': 'bx-game-bar-container'})
            );

        const actions = [
            ActionScreenshot.setup(),
            ActionTouchControl.setup(),
        ];

        for (const action of actions) {
            $container.appendChild(action);
        }

        $gameBar.addEventListener('click', e => {
            if (e.target === $gameBar) {
                $container.classList.toggle('bx-gone');
                if (!$container.classList.contains('bx-gone')) {
                    GameBar.#beginHideTimeout();
                }
            }
        });

        window.addEventListener(BxEvent.GAME_BAR_ACTION_ACTIVATED, e => {
            $container.classList.toggle('bx-gone');
            GameBar.#clearHideTimeout();
        });

        $container.addEventListener('pointerover', GameBar.#clearHideTimeout);
        $container.addEventListener('pointerout', GameBar.#beginHideTimeout);

        document.documentElement.appendChild($gameBar);
        GameBar.#$gameBar = $gameBar;
        GameBar.#$container = $container;
    }
}
