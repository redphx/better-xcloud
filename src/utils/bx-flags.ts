import { BxLogger } from "./bx-logger";

// Setup flags
const DEFAULT_FLAGS: BxFlags = {
    Debug: false,

    CheckForUpdate: true,
    EnableXcloudLogging: false,
    SafariWorkaround: true,

    EnableWebGPURenderer: false,
    WebGL2NoColorConversion: false,

    ForceNativeMkbTitles: [],
    FeatureGates: null,

    DeviceInfo: {
        deviceType: 'unknown',
    },
}

export const BX_FLAGS: BxFlags = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
try {
    delete window.BX_FLAGS;
} catch (e) {}

if (!BX_FLAGS.DeviceInfo.userAgent) {
    BX_FLAGS.DeviceInfo.userAgent = window.navigator.userAgent;
}

BxLogger.info('BxFlags', BX_FLAGS);

export const NATIVE_FETCH = window.fetch;
