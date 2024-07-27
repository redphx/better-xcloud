import { StreamPlayerType } from "@enums/stream-player";
import { AppInterface, STATES } from "./global";
import { CE } from "./html";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";


export class Screenshot {
    static #$canvas: HTMLCanvasElement;
    static #canvasContext: CanvasRenderingContext2D;

    static setup() {
        if (Screenshot.#$canvas) {
            return;
        }

        Screenshot.#$canvas = CE<HTMLCanvasElement>('canvas', {'class': 'bx-gone'});

        Screenshot.#canvasContext = Screenshot.#$canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false,
        })!;
    }

    static updateCanvasSize(width: number, height: number) {
        const $canvas = Screenshot.#$canvas;
        if ($canvas) {
            $canvas.width = width;
            $canvas.height = height;
        }
    }

    static updateCanvasFilters(filters: string) {
        Screenshot.#canvasContext.filter = filters;
    }

    static #onAnimationEnd(e: Event) {
        const $target = e.target as HTMLElement;
        $target.classList.remove('bx-taking-screenshot');
    }

    static takeScreenshot(callback?: any) {
        const currentStream = STATES.currentStream;
        const streamPlayer = currentStream.streamPlayer;
        const $canvas = Screenshot.#$canvas;
        if (!streamPlayer || !$canvas) {
            return;
        }

        let $player;
        if (getPref(PrefKey.SCREENSHOT_APPLY_FILTERS)) {
            $player = streamPlayer.getPlayerElement();
        } else {
            $player = streamPlayer.getPlayerElement(StreamPlayerType.VIDEO);
        }

        if (!$player || !$player.isConnected) {
            return;
        }

        $player.parentElement!.addEventListener('animationend', this.#onAnimationEnd, { once: true });
        $player.parentElement!.classList.add('bx-taking-screenshot');

        const canvasContext = Screenshot.#canvasContext;

        if ($player instanceof HTMLCanvasElement) {
            streamPlayer.getWebGL2Player().drawFrame();
        }
        canvasContext.drawImage($player, 0, 0, $canvas.width, $canvas.height);

        // Get data URL and pass to parent app
        if (AppInterface) {
            const data = $canvas.toDataURL('image/png').split(';base64,')[1];
            AppInterface.saveScreenshot(currentStream.titleId, data);

            // Free screenshot from memory
            canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);

            callback && callback();
            return;
        }

        $canvas && $canvas.toBlob(blob => {
                // Download screenshot
                const now = +new Date;
                const $anchor = CE<HTMLAnchorElement>('a', {
                        'download': `${currentStream.titleId}-${now}.png`,
                        'href': URL.createObjectURL(blob!),
                    });
                $anchor.click();

                // Free screenshot from memory
                URL.revokeObjectURL($anchor.href);
                canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);

                callback && callback();
            }, 'image/png');
    }
}
