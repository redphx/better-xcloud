const int FILTER_UNSHARP_MASKING = 1;
const int FILTER_CAS = 2;

precision highp float;
uniform sampler2D data;
uniform vec2 iResolution;

uniform int filterId;
uniform float sharpenFactor;
uniform float brightness;
uniform float contrast;
uniform float saturation;

vec3 textureAt(sampler2D tex, vec2 coord) {
    return texture2D(tex, coord / iResolution.xy).rgb;
}

vec3 clarityBoost(sampler2D tex, vec2 coord)
{
    // Load a collection of samples in a 3x3 neighorhood, where e is the current pixel.
    // a b c
    // d e f
    // g h i
    vec3 a = textureAt(tex, coord + vec2(-1, 1));
    vec3 b = textureAt(tex, coord + vec2(0, 1));
    vec3 c = textureAt(tex, coord + vec2(1, 1));

    vec3 d = textureAt(tex, coord + vec2(-1, 0));
    vec3 e = textureAt(tex, coord);
    vec3 f = textureAt(tex, coord + vec2(1, 0));

    vec3 g = textureAt(tex, coord + vec2(-1, -1));
    vec3 h = textureAt(tex, coord + vec2(0, -1));
    vec3 i = textureAt(tex, coord + vec2(1, -1));

    if (filterId == FILTER_CAS) {
        // Soft min and max.
        //  a b c             b
        //  d e f * 0.5  +  d e f * 0.5
        //  g h i             h
        // These are 2.0x bigger (factored out the extra multiply).
        vec3 minRgb = min(min(min(d, e), min(f, b)), h);
        vec3 minRgb2 = min(min(a, c), min(g, i));
        minRgb += min(minRgb, minRgb2);

        vec3 maxRgb = max(max(max(d, e), max(f, b)), h);
        vec3 maxRgb2 = max(max(a, c), max(g, i));
        maxRgb += max(maxRgb, maxRgb2);

        // Smooth minimum distance to signal limit divided by smooth max.
        vec3 reciprocalMaxRgb = 1.0 / maxRgb;
        vec3 amplifyRgb = clamp(min(minRgb, 2.0 - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);

        // Shaping amount of sharpening.
        amplifyRgb = inversesqrt(amplifyRgb);

        float contrast = 0.8;
        float peak = -3.0 * contrast + 8.0;
        vec3 weightRgb = -(1.0 / (amplifyRgb * peak));

        vec3 reciprocalWeightRgb = 1.0 / (4.0 * weightRgb + 1.0);

        //                0 w 0
        // Filter shape:  w 1 w
        //                0 w 0
        vec3 window = (b + d) + (f + h);
        vec3 outColor = clamp((window * weightRgb + e) * reciprocalWeightRgb, 0.0, 1.0);

        outColor = mix(e, outColor, sharpenFactor / 2.0);

        return outColor;
    } else if (filterId == FILTER_UNSHARP_MASKING) {
        vec3 gaussianBlur = (a * 1.0 + b * 2.0 + c * 1.0 +
            d * 2.0 + e * 4.0 + f * 2.0 +
            g * 1.0 + h * 2.0 + i * 1.0) / 16.0;

        // Return edge detection
        return e + (e - gaussianBlur) * sharpenFactor / 3.0;
    }

    return e;
}

vec3 adjustBrightness(vec3 color) {
    return (1.0 + brightness) * color;
}

vec3 adjustContrast(vec3 color) {
    return 0.5 + (1.0 + contrast) * (color - 0.5);
}

vec3 adjustSaturation(vec3 color) {
    const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
    vec3 grayscale = vec3(dot(color, luminosityFactor));

    return mix(grayscale, color, 1.0 + saturation);
}

void main() {
    vec3 color;

    if (sharpenFactor > 0.0) {
        color = clarityBoost(data, gl_FragCoord.xy);
    } else {
        color = textureAt(data, gl_FragCoord.xy);
    }

    if (saturation != 0.0) {
        color = adjustSaturation(color);
    }

    if (contrast != 0.0) {
        color = adjustContrast(color);
    }

    if (brightness != 0.0) {
        color = adjustBrightness(color);
    }

    gl_FragColor = vec4(color, 1.0);
}
