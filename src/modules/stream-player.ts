import { CE } from "@/utils/html";
import { WebGL2Player } from "./player/webgl2-player";
import { getPref, PrefKey } from "@/utils/preferences";
import { Screenshot } from "@/utils/screenshot";
import { StreamPlayerType, StreamVideoProcessing } from "@enums/stream-player";
import { STATES } from "@/utils/global";

export type StreamPlayerOptions = Partial<{
    processing: string,
    sharpness: number,
    saturation: number,
    contrast: number,
    brightness: number,
}>;

export class StreamPlayer {
    #$video: HTMLVideoElement;
    #playerType: StreamPlayerType = StreamPlayerType.VIDEO;

    #options: StreamPlayerOptions = {};

    #webGL2Player: WebGL2Player | null = null;

    #$videoCss: HTMLStyleElement | null = null;
    #$usmMatrix: SVGFEConvolveMatrixElement | null = null;

    constructor($video: HTMLVideoElement, type: StreamPlayerType, options: StreamPlayerOptions) {
        this.#setupVideoElements();

        this.#$video = $video;
        this.#options = options || {};
        this.setPlayerType(type);
    }

    #setupVideoElements() {
        this.#$videoCss = document.getElementById('bx-video-css') as HTMLStyleElement;
        if (this.#$videoCss) {
            this.#$usmMatrix = this.#$videoCss.querySelector('#bx-filter-usm-matrix') as any;
            return;
        }

        const $fragment = document.createDocumentFragment();

        this.#$videoCss = CE<HTMLStyleElement>('style', {id: 'bx-video-css'});
        $fragment.appendChild(this.#$videoCss);

        // Setup SVG filters
        const $svg = CE('svg', {
            id: 'bx-video-filters',
            xmlns: 'http://www.w3.org/2000/svg',
            class: 'bx-gone',
        }, CE('defs', {xmlns: 'http://www.w3.org/2000/svg'},
            CE('filter', {
                    id: 'bx-filter-usm',
                    xmlns: 'http://www.w3.org/2000/svg',
                }, this.#$usmMatrix = CE('feConvolveMatrix', {
                    id: 'bx-filter-usm-matrix',
                    order: '3',
                    xmlns: 'http://www.w3.org/2000/svg',
                })),
            ),
        );
        $fragment.appendChild($svg);
        document.documentElement.appendChild($fragment);
    }

    #getVideoPlayerFilterStyle() {
        const filters = [];

        const sharpness = this.#options.sharpness || 0;
        if (this.#options.processing === StreamVideoProcessing.USM && sharpness != 0) {
            const level = (7 - ((sharpness / 2) - 1) * 0.5).toFixed(1); // 5, 5.5, 6, 6.5, 7
            const matrix = `0 -1 0 -1 ${level} -1 0 -1 0`;
            this.#$usmMatrix?.setAttributeNS(null, 'kernelMatrix', matrix);

            filters.push(`url(#bx-filter-usm)`);
        }

        const saturation = this.#options.saturation || 100;
        if (saturation != 100) {
            filters.push(`saturate(${saturation}%)`);
        }

        const contrast =  this.#options.contrast || 100;
        if (contrast != 100) {
            filters.push(`contrast(${contrast}%)`);
        }

        const brightness = this.#options.brightness || 100;
        if (brightness != 100) {
            filters.push(`brightness(${brightness}%)`);
        }

        return filters.join(' ');
    }

    #resizePlayer() {
        const PREF_RATIO = getPref(PrefKey.VIDEO_RATIO);
        const $video = this.#$video;
        const isNativeTouchGame = STATES.currentStream.titleInfo?.details.hasNativeTouchSupport;

        let $webGL2Canvas;
        if (this.#playerType == StreamPlayerType.WEBGL2) {
            $webGL2Canvas = this.#webGL2Player?.getCanvas()!;
        }

        let targetWidth;
        let targetHeight;
        let targetObjectFit;

        if (PREF_RATIO.includes(':')) {
            const tmp = PREF_RATIO.split(':');

            // Get preferred ratio
            const videoRatio = parseFloat(tmp[0]) / parseFloat(tmp[1]);

            let width = 0;
            let height = 0;

            // Get parent's ratio
            const parentRect = $video.parentElement!.getBoundingClientRect();
            const parentRatio = parentRect.width / parentRect.height;

            // Get target width & height
            if (parentRatio > videoRatio) {
                height = parentRect.height;
                width = height * videoRatio;
            } else {
                width = parentRect.width;
                height = width / videoRatio;
            }

            // Prevent floating points
            width = Math.ceil(Math.min(parentRect.width, width));
            height = Math.ceil(Math.min(parentRect.height, height));

            $video.dataset.width = width.toString();
            $video.dataset.height = height.toString();

            // Update size
            targetWidth = `${width}px`;
            targetHeight = `${height}px`;
            targetObjectFit = PREF_RATIO === '16:9' ? 'contain' : 'fill';
        } else {
            targetWidth = '100%';
            targetHeight = '100%';
            targetObjectFit = PREF_RATIO;

            $video.dataset.width = window.innerWidth.toString();
            $video.dataset.height = window.innerHeight.toString();
        }

        $video.style.width = targetWidth;
        $video.style.height = targetHeight;
        $video.style.objectFit = targetObjectFit;

        // $video.style.padding = padding;

        if ($webGL2Canvas) {
            $webGL2Canvas.style.width = targetWidth;
            $webGL2Canvas.style.height = targetHeight;
            $webGL2Canvas.style.objectFit = targetObjectFit;
        }

        // Update video dimensions
        if (isNativeTouchGame && this.#playerType == StreamPlayerType.WEBGL2) {
            window.BX_EXPOSED.streamSession.updateDimensions();
        }
    }

    setPlayerType(type: StreamPlayerType, refreshPlayer: boolean = false) {
        if (this.#playerType !== type) {
            // Switch from Video -> WebGL2
            if (type === StreamPlayerType.WEBGL2) {
                // Initialize WebGL2 player
                if (!this.#webGL2Player) {
                    this.#webGL2Player = new WebGL2Player(this.#$video);
                } else {
                    this.#webGL2Player.resume();
                }

                this.#$videoCss!.textContent = '';

                this.#$video.classList.add('bx-pixel');
            } else {
                // Cleanup WebGL2 Player
                this.#webGL2Player?.stop();

                this.#$video.classList.remove('bx-pixel');
            }
        }

        this.#playerType = type;
        refreshPlayer && this.refreshPlayer();
    }

    setOptions(options: StreamPlayerOptions, refreshPlayer: boolean = false) {
        this.#options = options;
        refreshPlayer && this.refreshPlayer();
    }

    updateOptions(options: StreamPlayerOptions, refreshPlayer: boolean = false) {
        this.#options = Object.assign(this.#options, options);
        refreshPlayer && this.refreshPlayer();
    }

    getPlayerElement(playerType?: StreamPlayerType) {
        if (typeof playerType === 'undefined') {
            playerType = this.#playerType;
        }

        if (playerType === StreamPlayerType.WEBGL2) {
            return this.#webGL2Player?.getCanvas();
        }

        return this.#$video;
    }

    getWebGL2Player() {
        return this.#webGL2Player;
    }

    refreshPlayer() {
        if (this.#playerType === StreamPlayerType.WEBGL2) {
            const options = this.#options;
            const webGL2Player = this.#webGL2Player!;

            if (options.processing === StreamVideoProcessing.USM) {
                webGL2Player.setFilter(1);
            } else {
                webGL2Player.setFilter(2);
            }

            Screenshot.updateCanvasFilters('none');

            webGL2Player.setSharpness(options.sharpness || 0);
            webGL2Player.setSaturation(options.saturation || 100);
            webGL2Player.setContrast(options.contrast || 100);
            webGL2Player.setBrightness(options.brightness || 100);
        } else {
            let filters = this.#getVideoPlayerFilterStyle();
            let videoCss = '';
            if (filters) {
                videoCss += `filter: ${filters} !important;`;
            }

            // Apply video filters to screenshots
            if (getPref(PrefKey.SCREENSHOT_APPLY_FILTERS)) {
                Screenshot.updateCanvasFilters(filters);
            }

            let css = '';
            if (videoCss) {
                css = `#game-stream video { ${videoCss} }`;
            }

            this.#$videoCss!.textContent = css;
        }

        this.#resizePlayer();
    }

    reloadPlayer() {
        this.#cleanUpWebGL2Player();

        this.#playerType = StreamPlayerType.VIDEO;
        this.setPlayerType(StreamPlayerType.WEBGL2, false);
    }

    #cleanUpWebGL2Player() {
        // Clean up WebGL2 Player
        this.#webGL2Player?.destroy();
        this.#webGL2Player = null;
    }

    destroy() {
        this.#cleanUpWebGL2Player();
    }
}
