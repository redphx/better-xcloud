import { BxLogger } from "@/utils/bx-logger";
import { BaseStreamPlayer, StreamPlayerElement, StreamPlayerFilter } from "./base-stream-player";
import { StreamVideoProcessing, type StreamPlayerType } from "@/enums/pref-values";

export abstract class BaseCanvasPlayer extends BaseStreamPlayer {
    protected $canvas: HTMLCanvasElement;

    protected targetFps = 60;
    protected frameInterval = 0;
    protected lastFrameTime = 0;
    protected animFrameId: number | null = null;
    protected frameCallback: any;
    private boundDrawFrame: () => void;

    constructor(playerType: StreamPlayerType, $video: HTMLVideoElement, logTag: string) {
        super(playerType, StreamPlayerElement.CANVAS, $video, logTag);

        const $canvas = document.createElement('canvas');
        $canvas.width = $video.videoWidth;
        $canvas.height = $video.videoHeight;
        this.$canvas = $canvas;

        $video.insertAdjacentElement('afterend', this.$canvas);

        let frameCallback: any;
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
            const $video = this.$video;
            frameCallback = $video.requestVideoFrameCallback.bind($video);
        } else {
            frameCallback = window.requestAnimationFrame.bind(window);
        }

        this.frameCallback = frameCallback;
        this.boundDrawFrame = this.drawFrame.bind(this);
    }

    async init(): Promise<void> {
        super.init();

        await this.setupShaders();
        this.setupRendering();
    }

    setTargetFps(target: number) {
        this.targetFps = target;
        this.lastFrameTime = 0;
        this.frameInterval = target ? Math.floor(1000 / target) : 0;
    }

    getCanvas() {
        return this.$canvas;
    }

    destroy() {
        BxLogger.info(this.logTag, 'Destroy');

        this.isStopped = true;
        if (this.animFrameId) {
            if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
                this.$video.cancelVideoFrameCallback(this.animFrameId);
            } else {
                cancelAnimationFrame(this.animFrameId);
            }

            this.animFrameId = null;
        }

        if (this.$canvas.isConnected) {
            this.$canvas.remove();
        }

        this.$canvas.width = 1;
        this.$canvas.height = 1;
    }

    toFilterId(processing: StreamVideoProcessing) {
        return processing === StreamVideoProcessing.CAS ? StreamPlayerFilter.CAS : StreamPlayerFilter.USM;
    }

    protected shouldDraw() {
        if (this.targetFps >= 60) {
            // Always draw
            return true;
        } else if (this.targetFps === 0) {
            // Don't draw when FPS is 0
            return false;
        }

        const currentTime = performance.now();
        const timeSinceLastFrame = currentTime - this.lastFrameTime;
        if (timeSinceLastFrame < this.frameInterval) {
            // Skip frame to limit FPS
            return false;
        }

        this.lastFrameTime = currentTime;
        return true;
    }

    private drawFrame() {
        if (this.isStopped) {
            return;
        }

        this.animFrameId = this.frameCallback(this.boundDrawFrame);
        if (!this.shouldDraw()) {
            return;
        }

        this.updateFrame();
    }

    protected setupRendering(): void {
        this.animFrameId = this.frameCallback(this.boundDrawFrame);
    }

    protected abstract setupShaders(): void;
    abstract updateFrame(): void;
}
