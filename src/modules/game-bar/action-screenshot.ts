import { BxEvent } from "@utils/bx-event";
import { AppInterface, STATES } from "@utils/global";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";

export class ActionScreenshot {
    static takeScreenshot(callback?: any) {
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

    static setup() {
        const currentStream = STATES.currentStream;
        currentStream.$screenshotCanvas = CE('canvas', {'class': 'bx-gone'});
        document.documentElement.appendChild(currentStream.$screenshotCanvas!);

        const onClick = (e: Event) => {
                BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
                ActionScreenshot.takeScreenshot();
            };

        const $button = createButton({
                style: ButtonStyle.GHOST,
                icon: BxIcon.SCREENSHOT,
                title: 'Take screenshot',
                onClick: onClick,
            });

        return $button;
    }
}
