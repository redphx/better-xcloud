import { BxEvent } from "@utils/bx-event";
import { AppInterface, STATES } from "@utils/global";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BaseGameBarAction } from "./action-base";

export class ScreenshotAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const currentStream = STATES.currentStream;
        currentStream.$screenshotCanvas = CE('canvas', {'class': 'bx-gone'});
        document.documentElement.appendChild(currentStream.$screenshotCanvas!);

        const onClick = (e: Event) => {
                BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
                this.takeScreenshot();
            };

        this.$content = createButton({
                style: ButtonStyle.GHOST,
                icon: BxIcon.SCREENSHOT,
                title: 'Take screenshot',
                onClick: onClick,
            });
    }

    render(): HTMLElement {
        return this.$content;
    }

    takeScreenshot(callback?: any) {
        const currentStream = STATES.currentStream;
        const $video = currentStream.$video;
        const $canvas = currentStream.$screenshotCanvas;
        if (!$video || !$canvas) {
            return;
        }

        const $canvasContext = $canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: false,
            })!;

        $canvasContext.drawImage($video, 0, 0, $canvas.width, $canvas.height);

        // Get data URL and pass to parent app
        if (AppInterface) {
            const data = $canvas.toDataURL('image/png').split(';base64,')[1];
            AppInterface.saveScreenshot(currentStream.titleId, data);

            // Free screenshot from memory
            $canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);

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
                $canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);

                callback && callback();
            }, 'image/png');
    }
}
