#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D data;
uniform vec2 iResolution;
// texelSize = 1.0 / iResolution, computed on the CPU
uniform vec2 texelSize;

const int FILTER_UNSHARP_MASKING = 1;
const int FILTER_CAS = 2;

// contrast = 0.8
const float CAS_CONTRAST_PEAK = 0.8 * -3.0 + 8.0;

// Rec. 709 luma. The browser converts video to sRGB/709 RGB before upload.
const vec3 LUMA709 = vec3(0.2126, 0.7152, 0.0722);

uniform int filterId;
uniform bool qualityMode;
uniform float sharpenFactor;
uniform float brightness;
uniform float contrast;
uniform float saturation;

out vec4 fragColor;

vec3 clarityBoost(sampler2D tex, vec2 coord, vec3 e) {
    // Load a collection of samples in a 3x3 neighborhood, where e is the current pixel.
    // a b c
    // d e f
    // g h i
    vec3 b = texture(tex, coord + texelSize * vec2(0, 1)).rgb;
    vec3 d = texture(tex, coord + texelSize * vec2(-1, 0)).rgb;
    vec3 f = texture(tex, coord + texelSize * vec2(1, 0)).rgb;
    vec3 h = texture(tex, coord + texelSize * vec2(0, -1)).rgb;

    vec3 a;
    vec3 c;
    vec3 g;
    vec3 i;

    if (filterId == FILTER_UNSHARP_MASKING || qualityMode) {
        a = texture(tex, coord + texelSize * vec2(-1, 1)).rgb;
        c = texture(tex, coord + texelSize * vec2(1, 1)).rgb;
        g = texture(tex, coord + texelSize * vec2(-1, -1)).rgb;
        i = texture(tex, coord + texelSize * vec2(1, -1)).rgb;
    }

    // USM
    if (filterId == FILTER_UNSHARP_MASKING) {
        vec3 gaussianBlur = (a + c + g + i) * 1.0 + (b + d + f + h) * 2.0 + e * 4.0;
        gaussianBlur /= 16.0;

        // Return edge detection
        return e + (e - gaussianBlur) * sharpenFactor / 3.0;
    }

    // CAS
    // Soft min and max.
    //  a b c             b
    //  d e f * 0.5  +  d e f * 0.5
    //  g h i             h
    // In quality mode these are 2.0x bigger (factored out the extra multiply).
    vec3 minRgb = min(min(min(d, e), min(f, b)), h);
    vec3 maxRgb = max(max(max(d, e), max(f, b)), h);

    // Distance to the signal limit: 2.0 when min/max are sums of two samples, else 1.0.
    float headroom = 1.0;

    if (qualityMode) {
        minRgb += min(min(a, c), min(g, i));
        maxRgb += max(max(a, c), max(g, i));
        headroom = 2.0;
    }

    // Smooth minimum distance to signal limit divided by smooth max.
    // max() avoids 0 * inf = NaN on black pixels.
    vec3 reciprocalMaxRgb = 1.0 / max(maxRgb, 1e-4);
    vec3 amplifyRgb = clamp(min(minRgb, headroom - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);

    // Shaping amount of sharpening.
    amplifyRgb = inversesqrt(amplifyRgb);

    vec3 weightRgb = -(1.0 / (amplifyRgb * CAS_CONTRAST_PEAK));
    vec3 reciprocalWeightRgb = 1.0 / (4.0 * weightRgb + 1.0);

    //                0 w 0
    // Filter shape:  w 1 w
    //                0 w 0
    vec3 window = b + d + f + h;
    vec3 outColor = clamp((window * weightRgb + e) * reciprocalWeightRgb, 0.0, 1.0);

    return mix(e, outColor, sharpenFactor / 2.0);
}

void main() {
    // Texture is uploaded without Y flip, so flip here.
    vec2 uv = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y) * texelSize;

    // Get current pixel
    vec3 color = texture(data, uv).rgb;

    // Clarity boost
    if (sharpenFactor > 0.0) {
        color = clarityBoost(data, uv, color);
    }

    // Saturation
    color = mix(vec3(dot(color, LUMA709)), color, saturation);

    // Contrast
    color = contrast * (color - 0.5) + 0.5;

    // Brightness
    color = brightness * color;

    fragColor = vec4(color, 1.0);
}
