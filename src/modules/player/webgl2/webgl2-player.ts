import { compressCodeFile } from "@macros/build" with { type: "macro" };

import { StreamPref } from "@/enums/pref-keys";
import { getStreamPref } from "@/utils/pref-utils";
import { BaseCanvasPlayer } from "../base-canvas-player";
import { StreamPlayerType, StreamVideoProcessingMode } from "@/enums/pref-values";

const UNIFORM_NAMES = [
    'data',
    'iResolution',
    'texelSize',
    'filterId',
    'qualityMode',
    'sharpenFactor',
    'brightness',
    'contrast',
    'saturation',
] as const;

type UniformName = typeof UNIFORM_NAMES[number];


export class WebGL2Player extends BaseCanvasPlayer {
    private gl: WebGL2RenderingContext | null = null;
    private resources: Array<WebGLTexture | WebGLProgram> = [];
    private program: WebGLProgram | null = null;
    private uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;

    constructor($video: HTMLVideoElement) {
        super(StreamPlayerType.WEBGL2, $video, 'WebGL2Player');
    }

    private updateCanvas() {
        const gl = this.gl!;
        const u = this.uniforms;

        const width = this.$canvas.width;
        const height = this.$canvas.height;
        const isQuality = this.options.processingMode === StreamVideoProcessingMode.QUALITY;

        // Viewport does not follow canvas resizes, so set it here
        gl.viewport(0, 0, width, height);

        gl.uniform2f(u.iResolution, width, height);
        gl.uniform2f(u.texelSize, 1 / width, 1 / height);

        gl.uniform1i(u.filterId, this.toFilterId(this.options.processing));
        gl.uniform1i(u.qualityMode, isQuality ? 1 : 0);
        gl.uniform1f(u.sharpenFactor, this.options.sharpness / (isQuality ? 1 : 1.2));
        gl.uniform1f(u.brightness, this.options.brightness / 100);
        gl.uniform1f(u.contrast, this.options.contrast / 100);
        gl.uniform1f(u.saturation, this.options.saturation / 100);
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
            desynchronized: true,
            preserveDrawingBuffer: false,
            stencil: false,
            powerPreference: getStreamPref(StreamPref.VIDEO_POWER_PREFERENCE),
        } as WebGLContextAttributes) as WebGL2RenderingContext;
        this.gl = gl;

        const compile = (type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        // Vertex shader: fullscreen triangle from gl_VertexID, no vertex buffer
        const vShader = compile(gl.VERTEX_SHADER, compressCodeFile('./src/modules/player/webgl2/shaders/clarity-boost.vert') as any as string);
        const fShader = compile(gl.FRAGMENT_SHADER, compressCodeFile('./src/modules/player/webgl2/shaders/clarity-boost.fs') as any as string);

        // Create and link program
        const program = gl.createProgram()!;
        this.program = program;
        this.resources.push(program);

        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Link failed: ${gl.getProgramInfoLog(program)}`);
            console.error(`vs info-log: ${gl.getShaderInfoLog(vShader)}`);
            console.error(`fs info-log: ${gl.getShaderInfoLog(fShader)}`);
        }

        // Shaders are no longer needed once linked
        gl.detachShader(program, vShader);
        gl.detachShader(program, fShader);
        gl.deleteShader(vShader);
        gl.deleteShader(fShader);

        gl.useProgram(program);

        // Cache uniform locations
        for (const name of UNIFORM_NAMES) {
            this.uniforms[name] = gl.getUniformLocation(program, name);
        }

        // Texture to contain the video data
        gl.activeTexture(gl.TEXTURE0);

        const texture = gl.createTexture()!;
        this.resources.push(texture);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        // No UNPACK_FLIP_Y: the fragment shader flips Y instead
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Bind texture unit 0 to the "data" sampler
        gl.uniform1i(this.uniforms.data, 0);

        this.updateCanvas();
    }

    destroy() {
        super.destroy();

        const gl = this.gl;
        if (!gl) {
            return;
        }

        gl.useProgram(null);

        // Delete first, then lose the context
        for (const resource of this.resources) {
            if (resource instanceof WebGLProgram) {
                gl.deleteProgram(resource);
            } else if (resource instanceof WebGLTexture) {
                gl.deleteTexture(resource);
            }
        }

        gl.getExtension('WEBGL_lose_context')?.loseContext();

        this.resources = [];
        this.program = null;
        this.gl = null;
    }

    refreshPlayer(): void {
        this.updateCanvas();
    }
}
