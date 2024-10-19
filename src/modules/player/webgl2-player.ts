import vertClarityBoost from "./shaders/clarity_boost.vert" with { type: "text" };
import fsClarityBoost from "./shaders/clarity_boost.fs" with { type: "text" };
import { BxLogger } from "@/utils/bx-logger";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";


export class WebGL2Player {
    private readonly LOG_TAG = 'WebGL2Player';

    private $video: HTMLVideoElement;
    private $canvas: HTMLCanvasElement;

    private gl: WebGL2RenderingContext | null = null;
    private resources: Array<any> = [];
    private program: WebGLProgram | null = null;

    private stopped: boolean = false;

    private options = {
        filterId: 1,
        sharpenFactor: 0,
        brightness: 0.0,
        contrast: 0.0,
        saturation: 0.0,
    };

    private targetFps = 60;
    private frameInterval = 0;
    private lastFrameTime = 0;

    private animFrameId: number | null = null;

    constructor($video: HTMLVideoElement) {
        BxLogger.info(this.LOG_TAG, 'Initialize');
        this.$video = $video;

        const $canvas = document.createElement('canvas');
        $canvas.width = $video.videoWidth;
        $canvas.height = $video.videoHeight;
        this.$canvas = $canvas;

        this.setupShaders();
        this.setupRendering();

        $video.insertAdjacentElement('afterend', $canvas);
    }

    setFilter(filterId: number, update = true) {
        this.options.filterId = filterId;
        update && this.updateCanvas();
    }

    setSharpness(sharpness: number, update = true) {
        this.options.sharpenFactor = sharpness;
        update && this.updateCanvas();
    }

    setBrightness(brightness: number, update = true) {
        this.options.brightness = 1 + (brightness - 100) / 100;
        update && this.updateCanvas();
    }

    setContrast(contrast: number, update = true) {
        this.options.contrast = 1 + (contrast - 100) / 100;
        update && this.updateCanvas();
    }

    setSaturation(saturation: number, update = true) {
        this.options.saturation = 1 + (saturation - 100) / 100;
        update && this.updateCanvas();
    }

    setTargetFps(target: number) {
        this.targetFps = target;
        this.lastFrameTime = 0;
        this.frameInterval = target ? Math.floor(1000 / target) : 0;
    }

    getCanvas() {
        return this.$canvas;
    }

    updateCanvas() {
        const gl = this.gl!;
        const program = this.program!;

        gl.uniform2f(gl.getUniformLocation(program, 'iResolution'), this.$canvas.width, this.$canvas.height);

        gl.uniform1i(gl.getUniformLocation(program, 'filterId'), this.options.filterId);
        gl.uniform1f(gl.getUniformLocation(program, 'sharpenFactor'), this.options.sharpenFactor);
        gl.uniform1f(gl.getUniformLocation(program, 'brightness'), this.options.brightness);
        gl.uniform1f(gl.getUniformLocation(program, 'contrast'), this.options.contrast);
        gl.uniform1f(gl.getUniformLocation(program, 'saturation'), this.options.saturation);
    }

    drawFrame(force=false) {
        if (!force) {
            // Don't draw when FPS is 0
            if (this.targetFps === 0) {
                return;
            }

            // Limit FPS
            if (this.targetFps < 60) {
                const currentTime = performance.now();
                const timeSinceLastFrame = currentTime - this.lastFrameTime;
                if (timeSinceLastFrame < this.frameInterval) {
                    return;
                }
                this.lastFrameTime = currentTime;
            }
        }

        const gl = this.gl!;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.$video);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private setupRendering() {
        let animate: any;

        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
            const $video = this.$video;
            animate = () => {
                if (!this.stopped) {
                    this.drawFrame();
                    this.animFrameId = $video.requestVideoFrameCallback(animate);
                }
            }

            this.animFrameId = $video.requestVideoFrameCallback(animate);
        } else {
            animate = () => {
                if (!this.stopped) {
                    this.drawFrame();
                    this.animFrameId = requestAnimationFrame(animate);
                }
            }

            this.animFrameId = requestAnimationFrame(animate);
        }
    }

    private setupShaders() {
        BxLogger.info(this.LOG_TAG, 'Setting up', getPref(PrefKey.VIDEO_POWER_PREFERENCE));

        const gl = this.$canvas.getContext('webgl2', {
            isBx: true,
            antialias: true,
            alpha: false,
            powerPreference: getPref(PrefKey.VIDEO_POWER_PREFERENCE),
        }) as WebGL2RenderingContext;
        this.gl = gl;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferWidth);

        // Vertex shader: Identity map
        const vShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vShader, vertClarityBoost);
        gl.compileShader(vShader);

        const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fShader, fsClarityBoost);
        gl.compileShader(fShader);

        // Create and link program
        const program = gl.createProgram()!;
        this.program = program;

        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Link failed: ${gl.getProgramInfoLog(program)}`);
            console.error(`vs info-log: ${gl.getShaderInfoLog(vShader)}`);
            console.error(`fs info-log: ${gl.getShaderInfoLog(fShader)}`);
        }

        this.updateCanvas();

        // Vertices: A screen-filling quad made from two triangles
        const buffer = gl.createBuffer();
        this.resources.push(buffer);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1,  1, -1,  1, 1, -1, 1,  1]), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // Texture to contain the video data
        const texture = gl.createTexture();
        this.resources.push(texture);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Bind texture to the "data" argument to the fragment shader
        gl.uniform1i(gl.getUniformLocation(program, 'data'), 0);

        gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    resume() {
        this.stop();
        this.stopped = false;
        BxLogger.info(this.LOG_TAG, 'Resume');

        this.$canvas.classList.remove('bx-gone');
        this.setupRendering();
    }

    stop() {
        BxLogger.info(this.LOG_TAG, 'Stop');
        this.$canvas.classList.add('bx-gone');

        this.stopped = true;
        if (this.animFrameId) {
            if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
                this.$video.cancelVideoFrameCallback(this.animFrameId);
            } else {
                cancelAnimationFrame(this.animFrameId);
            }

            this.animFrameId = null;
        }
    }

    destroy() {
        BxLogger.info(this.LOG_TAG, 'Destroy');
        this.stop();

        const gl = this.gl;
        if (gl) {
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            gl.useProgram(null);

            for (const resource of this.resources) {
                if (resource instanceof WebGLProgram) {
                    gl.deleteProgram(resource);
                } else if (resource instanceof WebGLShader) {
                    gl.deleteShader(resource);
                } else if (resource instanceof WebGLTexture) {
                    gl.deleteTexture(resource);
                } else if (resource instanceof WebGLBuffer) {
                    gl.deleteBuffer(resource);
                }
            }

            this.gl = null;
        }

        if (this.$canvas.isConnected) {
            this.$canvas.parentElement?.removeChild(this.$canvas);
        }

        this.$canvas.width = 1;
        this.$canvas.height = 1;
    }
}
