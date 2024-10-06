import { BxEvent } from "@/utils/bx-event";
import { BxIcon } from "@/utils/bx-icon";
import { CE, createSvgIcon, getReactProps, isElementVisible, secondsToHms } from "@/utils/html";
import { XcloudApi } from "@/utils/xcloud-api";

export class GameTile {
    static #timeout: number | null;

    static async #showWaitTime($elm: HTMLElement, productId: string) {
        if (($elm as any).hasWaitTime) {
            return;
        }
        ($elm as any).hasWaitTime = true;

        let totalWaitTime;

        const api = XcloudApi.getInstance();
        const info = await api.getTitleInfo(productId);
        if (info) {
            const waitTime = await api.getWaitTime(info.titleId);
            if (waitTime) {
                totalWaitTime = waitTime.estimatedAllocationTimeInSeconds;
            }
        }

        if (typeof totalWaitTime === 'number' && isElementVisible($elm)) {
            const $div = CE('div', {'class': 'bx-game-tile-wait-time'},
                createSvgIcon(BxIcon.PLAYTIME),
                CE('span', {}, secondsToHms(totalWaitTime)),
            );
            $elm.insertAdjacentElement('afterbegin', $div);
        }
    }

    static #requestWaitTime($elm: HTMLElement, productId: string) {
        GameTile.#timeout && clearTimeout(GameTile.#timeout);
        GameTile.#timeout = window.setTimeout(async () => {
            GameTile.#showWaitTime($elm, productId);
        }, 500);
    }

    static #findProductId($elm: HTMLElement): string | null {
        let productId = null;

        try {
            if (($elm.tagName === 'BUTTON' && $elm.className.includes('MruGameCard')) || (($elm.tagName === 'A' && $elm.className.includes('GameCard')))) {
                let props = getReactProps($elm.parentElement!);

                // When context menu is enabled
                if (Array.isArray(props.children)) {
                    productId = props.children[0].props.productId;
                } else {
                    productId = props.children.props.productId;
                }
            } else if ($elm.tagName === 'A' && $elm.className.includes('GameItem'))  {
                let props = getReactProps($elm.parentElement!);
                props = props.children.props;
                if (props.location !== 'NonStreamableGameItem') {
                    if ('productId' in props) {
                        productId = props.productId;
                    } else {
                        // Search page
                        productId = props.children.props.productId;
                    }
                }
            }
        } catch (e) {}

        return productId;
    }

    static setup() {
        window.addEventListener(BxEvent.NAVIGATION_FOCUS_CHANGED, e => {
            const $elm = (e as any).element;
            const className = $elm.className || '';
            if (className.includes('MruGameCard')) {
                // Show the wait time of every games in the "Jump back in" section all at once
                const $ol = $elm.closest('ol');
                if ($ol && !($ol as any).hasWaitTime) {
                    ($ol as any).hasWaitTime = true;
                    $ol.querySelectorAll('button[class*=MruGameCard]').forEach(($elm: HTMLElement) => {
                        const productId = GameTile.#findProductId($elm);
                        productId && GameTile.#showWaitTime($elm, productId);
                    });
                }
            } else {
                const productId = GameTile.#findProductId($elm);
                productId && GameTile.#requestWaitTime($elm, productId);
            }
        });
    }
}
