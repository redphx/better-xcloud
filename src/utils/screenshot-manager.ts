import { StreamPlayerType } from "@enums/stream-player";
import { AppInterface, STATES } from "./global";
import { CE } from "./html";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";
import { BxLogger } from "./bx-logger";


export class ScreenshotManager {
    private static instance: ScreenshotManager;
    public static getInstance = () => ScreenshotManager.instance ?? (ScreenshotManager.instance = new ScreenshotManager());
    private readonly LOG_TAG = 'ScreenshotManager';

    private $download: HTMLAnchorElement;
    private $canvas: HTMLCanvasElement;
    private canvasContext: CanvasRenderingContext2D;

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.$download = CE<HTMLAnchorElement>('a');

        this.$canvas = CE<HTMLCanvasElement>('canvas', {'class': 'bx-gone'});
        this.canvasContext = this.$canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false,
        })!;
    }

    updateCanvasSize(width: number, height: number) {
        this.$canvas.width = width;
        this.$canvas.height = height;
    }

    updateCanvasFilters(filters: string) {
        this.canvasContext.filter = filters;
    }

    private onAnimationEnd(e: Event) {
        (e.target as HTMLElement).classList.remove('bx-taking-screenshot');
    }

    takeScreenshot(callback?: any) {
        const currentStream = STATES.currentStream;
        const streamPlayer = currentStream.streamPlayer;
        const $canvas = this.$canvas;
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

        $player.parentElement!.addEventListener('animationend', this.onAnimationEnd, { once: true });
        $player.parentElement!.classList.add('bx-taking-screenshot');

        const canvasContext = this.canvasContext;

        if ($player instanceof HTMLCanvasElement) {
            streamPlayer.getWebGL2Player().drawFrame(true);
        }
        canvasContext.drawImage($player, 0, 0, $canvas.width, $canvas.height);

        // Get data URL and pass to parent app
        if (AppInterface) {
            const data = $canvas.toDataURL('image/png').split(';base64,')[1];
            AppInterface.saveScreenshot(currentStream.titleSlug, data);

            // Free screenshot from memory
            canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);

            callback && callback();
            return;
        }

        $canvas.toBlob(blob => {
            if (!blob) {
                return;
            }

            // Download screenshot
            const now = +new Date;
            const $download = this.$download;
            $download.download = `${currentStream.titleSlug}-${now}.png`;
            $download.href = URL.createObjectURL(blob);
            $download.click();

            // Free screenshot from memory
            URL.revokeObjectURL($download.href);
            $download.href = '';
            $download.download = '';
            canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);

            callback && callback();
        }, 'image/png');
    }
}
