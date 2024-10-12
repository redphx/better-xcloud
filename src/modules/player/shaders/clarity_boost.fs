#version 300 es

precision mediump float;
uniform sampler2D data;
uniform vec2 iResolution;

const int FILTER_UNSHARP_MASKING = 1;
// const int FILTER_CAS = 2;

// constrast = 0.8
const float CAS_CONTRAST_PEAK = 0.8 * -3.0 + 8.0;

// Luminosity factor
const vec3 LUMINOSITY_FACTOR = vec3(0.2126, 0.7152, 0.0722);

uniform int filterId;
uniform float sharpenFactor;
uniform float brightness;
uniform float contrast;
uniform float saturation;

out vec4 fragColor;

vec3 clarityBoost(sampler2D tex, vec2 coord, vec3 e) {
    vec2 texelSize = 1.0 / iResolution.xy;

    // Load a collection of samples in a 3x3 neighorhood, where e is the current pixel.
    // a b c
    // d e f
    // g h i
    vec3 a = texture(tex, coord + texelSize * vec2(-1, 1)).rgb;
    vec3 b = texture(tex, coord + texelSize * vec2(0, 1)).rgb;
    vec3 c = texture(tex, coord + texelSize * vec2(1, 1)).rgb;

    vec3 d = texture(tex, coord + texelSize * vec2(-1, 0)).rgb;
    vec3 f = texture(tex, coord + texelSize * vec2(1, 0)).rgb;

    vec3 g = texture(tex, coord + texelSize * vec2(-1, -1)).rgb;
    vec3 h = texture(tex, coord + texelSize * vec2(0, -1)).rgb;
    vec3 i = texture(tex, coord + texelSize * vec2(1, -1)).rgb;

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
    // These are 2.0x bigger (factored out the extra multiply).
    vec3 minRgb = min(min(min(d, e), min(f, b)), h);
    minRgb += min(min(a, c), min(g, i));

    vec3 maxRgb = max(max(max(d, e), max(f, b)), h);
    maxRgb += max(max(a, c), max(g, i));

    // Smooth minimum distance to signal limit divided by smooth max.
    vec3 reciprocalMaxRgb = 1.0 / maxRgb;
    vec3 amplifyRgb = clamp(min(minRgb, 2.0 - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);

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
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    // Get current pixel
    vec3 color = texture(data, uv).rgb;

    // Clarity boost
    color = sharpenFactor > 0.0 ? clarityBoost(data, uv, color) : color;

    // Saturation
    color = saturation != 1.0 ? mix(vec3(dot(color, LUMINOSITY_FACTOR)), color, saturation) : color;

    // Contrast
    color = contrast * (color - 0.5) + 0.5;

    // Brightness
    color = brightness * color;

    fragColor = vec4(color, 1.0);
}
