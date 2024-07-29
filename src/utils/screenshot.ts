import { StreamPlayerType } from "@enums/stream-player";
import { AppInterface, STATES } from "./global";
import { CE } from "./html";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";


export class Screenshot {
    static #$canvas: HTMLCanvasElement;
    static #canvasContext: CanvasRenderingContext2D;

    static #mediaRecorder: MediaRecorder | null = null;
    static #recordedBlobs: Blob[] = [];
    static #isRecording: boolean = false;

    static get isRecording() {
        return this.#isRecording;
    }

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

    static async startRecording() {
        if (this.#isRecording) return;

        const $video = STATES.currentStream.streamPlayer?.getPlayerElement();
        if (!$video) return;

        // Capture video stream from the video element
        const videoStream = $video.captureStream();

        // Add audio track(s) from the video element to the video stream
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.warn("No audio tracks found in the video stream");
        }

        const options = {
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2500000,
            mimeType: "video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"",
          };

        this.#mediaRecorder = new MediaRecorder(videoStream, options);

        this.#mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.#recordedBlobs.push(event.data);
            }
        };
        this.#mediaRecorder.onstop = () => {
            const blob = new Blob(this.#recordedBlobs, { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            // Save the recorded video to a file or a designated location
            // For example, you can create a new anchor element and simulate a click to download the video
            const $anchor = CE('a', { download: 'recorded-video.mp4', href: url });
            $anchor.click();
            URL.revokeObjectURL(url);
        };
        this.#mediaRecorder.start();
        this.#isRecording = true;
    }

    static stopRecording() {
        if (!this.#isRecording) return;
    
        this.#mediaRecorder?.stop();
        this.#mediaRecorder = null; // Reset the MediaRecorder instance
        this.#recordedBlobs = []; // Reset the recorded blobs array
        this.#isRecording = false;
    }
}
