import { CE } from "../utils/html";

export function takeScreenshot(callback: any) {
    const currentStream = States.currentStream!;
    const $video = currentStream.$video;
    const $canvas = currentStream.$screenshotCanvas;
    if (!$video || !$canvas) {
        return;
    }

    const $canvasContext = $canvas.getContext('2d')!;

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


export function setupScreenshotButton() {
    const currentStream = States.currentStream!
    currentStream.$screenshotCanvas = CE('canvas', {'class': 'bx-screenshot-canvas'});
    document.documentElement.appendChild(currentStream.$screenshotCanvas!);

    const delay = 2000;
    const $btn = CE('div', {'class': 'bx-screenshot-button', 'data-showing': false});

    let timeout: number | null;
    const detectDbClick = (e: MouseEvent) => {
        if (!currentStream.$video) {
            timeout = null;
            $btn.style.display = 'none';
            return;
        }

        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            $btn.setAttribute('data-capturing', 'true');

            takeScreenshot(() => {
                // Hide button
                $btn.setAttribute('data-showing', 'false');
                setTimeout(() => {
                    if (!timeout) {
                        $btn.setAttribute('data-capturing', 'false');
                    }
                }, 100);
            });

            return;
        }

        const isShowing = $btn.getAttribute('data-showing') === 'true';
        if (!isShowing) {
            // Show button
            $btn.setAttribute('data-showing', 'true');
            $btn.setAttribute('data-capturing', 'false');

            timeout && clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                $btn.setAttribute('data-showing', 'false');
                $btn.setAttribute('data-capturing', 'false');
            }, delay);
        }
    }

    $btn.addEventListener('mousedown', detectDbClick);
    document.documentElement.appendChild($btn);
}
