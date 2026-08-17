import { compressCodeFile } from "@macros/build" with { type: "macro" };

import { StreamPref } from "@/enums/pref-keys";
import { getStreamPref } from "@/utils/pref-utils";
import type { StreamPlayerOptions } from "@/types/stream";
import { BaseCanvasPlayer } from "../base-canvas-player";
import { StreamPlayerType, StreamVideoProcessingMode } from "@/enums/pref-values";


export class WebGL2Player extends BaseCanvasPlayer {
    private gl: WebGL2RenderingContext | null = null;
    private resources: Array<WebGLBuffer | WebGLTexture | WebGLProgram | WebGLShader> = [];
    private program: WebGLProgram | null = null;

    // Dirty flag: updateCanvas() only recomputes the uniforms when
    // updateOptions()/refreshPlayer() invalidated it. Options/canvas unchanged
    // = 1 read + branch (steady 60 Hz path) instead of 7 gl.uniform* calls.
    private _uniformsDirty = true;

    constructor($video: HTMLVideoElement) {
        super(StreamPlayerType.WEBGL2, $video, 'WebGL2Player');
    }

    private updateCanvas() {
        if (!this._uniformsDirty) return;
        this._uniformsDirty = false;

        const gl = this.gl!;
        const program = this.program!;
        const filterId = this.toFilterId(this.options.processing);

        gl.uniform2f(gl.getUniformLocation(program, 'iResolution'), this.$canvas.width, this.$canvas.height);

        gl.uniform1i(gl.getUniformLocation(program, 'filterId'), filterId);
        gl.uniform1i(gl.getUniformLocation(program, 'qualityMode'), this.options.processingMode === StreamVideoProcessingMode.QUALITY ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(program, 'sharpenFactor'), this.options.sharpness / (this.options.processingMode === StreamVideoProcessingMode.QUALITY ? 1 : 1.2));
        gl.uniform1f(gl.getUniformLocation(program, 'brightness'), this.options.brightness / 100);
        gl.uniform1f(gl.getUniformLocation(program, 'contrast'), this.options.contrast / 100);
        gl.uniform1f(gl.getUniformLocation(program, 'saturation'), this.options.saturation / 100);
    }

    override updateOptions(newOptions: Partial<StreamPlayerOptions>, refresh = false) {
        this.options = Object.assign(this.options, newOptions);
        this._uniformsDirty = true;
        refresh && this.refreshPlayer();
    }

    updateFrame() {
        const gl = this.gl!;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.$video);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    protected async setupShaders(): Promise<void> {
        const gl = this.$canvas.getContext('webgl2', {
            isBx: true,
            antialias: true,
            alpha: false,
            depth: false,
            preserveDrawingBuffer: false,
            stencil: false,
            powerPreference: getStreamPref(StreamPref.VIDEO_POWER_PREFERENCE),
        } as WebGLContextAttributes) as WebGL2RenderingContext;
        this.gl = gl;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferWidth);

        // Vertex shader: Identity map
        const vShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vShader, compressCodeFile('./src/modules/player/webgl2/shaders/clarity-boost.vert') as any as string);
        gl.compileShader(vShader);

        const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fShader, compressCodeFile('./src/modules/player/webgl2/shaders/clarity-boost.fs') as any as string);
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
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0, // Bottom-left
            3.0, -1.0,  // Bottom-right
            -1.0, 3.0,  // Top-left
        ]), gl.STATIC_DRAW);

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

    destroy() {
        super.destroy();

        const gl = this.gl;
        if (!gl) {
            return;
        }

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

    refreshPlayer(): void {
        this._uniformsDirty = true;
        this.updateCanvas();
    }
}
