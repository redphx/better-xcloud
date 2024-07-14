import { BxEvent } from "@/utils/bx-event";
import { BxIcon } from "@/utils/bx-icon";
import { CE, createSvgIcon, getReactProps } from "@/utils/html";
import { XcloudApi } from "@/utils/xcloud-api";

export class GameTile {
    static #timeout: number | null;

    static #secondsToHms(seconds: number) {
        let h = Math.floor(seconds / 3600);
        seconds %= 3600;
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;

        const output = [];
        h > 0 && output.push(`${h}h`);
        m > 0 && output.push(`${m}m`);
        if (s > 0 || output.length === 0) {
            output.push(`${s}s`);
        }

        return output.join(' ');
    }

    static async #showWaitTime($elm: HTMLElement, productId: string) {
        let totalWaitTime;

        const api = XcloudApi.getInstance();
        const info = await api.getTitleInfo(productId);
        if (info) {
            const waitTime = await api.getWaitTime(info.titleId);
            if (waitTime) {
                totalWaitTime = waitTime.estimatedAllocationTimeInSeconds;
            }
        }

        if (typeof totalWaitTime === 'number' && $elm.isConnected) {
            const $div = CE('div', {'class': 'bx-game-tile-wait-time'},
                createSvgIcon(BxIcon.PLAYTIME),
                CE('span', {}, GameTile.#secondsToHms(totalWaitTime)),
            );
            $elm.insertAdjacentElement('afterbegin', $div);
        }
    }

    static requestWaitTime($elm: HTMLElement, productId: string) {
        GameTile.#timeout && clearTimeout(GameTile.#timeout);
        GameTile.#timeout = window.setTimeout(async () => {
            if (!($elm as any).hasWaitTime) {
                ($elm as any).hasWaitTime = true;
                GameTile.#showWaitTime($elm, productId);
            }
        }, 1000);
    }

    static setup() {
        window.addEventListener(BxEvent.NAVIGATION_FOCUS_CHANGED, e => {
            let productId;
            const $elm = (e as any).element;
            try {
                if (($elm.tagName === 'BUTTON' && $elm.className.includes('MruGameCard')) || (($elm.tagName === 'A' && $elm.className.includes('GameCard')))) {
                    let props = getReactProps($elm.parentElement);

                    // When context menu is enabled
                    if (Array.isArray(props.children)) {
                        productId = props.children[0].props.productId;
                    } else {
                        productId = props.children.props.productId;
                    }
                } else if ($elm.tagName === 'A' && $elm.className.includes('GameItem'))  {
                    let props = getReactProps($elm.parentElement);
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

            productId && GameTile.requestWaitTime($elm, productId);
        });
    }
}
