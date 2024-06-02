type BxFlags = Partial<{
    CheckForUpdate: boolean;
    PreloadRemotePlay: boolean;
    PreloadUi: boolean;
    EnableXcloudLogging: boolean;
    SafariWorkaround: boolean;

    UseDevTouchLayout: boolean;

    ForceNativeMkbTitles: string[];
}>

// Setup flags
const DEFAULT_FLAGS: BxFlags = {
    CheckForUpdate: true,
    PreloadRemotePlay: true,
    PreloadUi: false,
    EnableXcloudLogging: false,
    SafariWorkaround: true,

    UseDevTouchLayout: false,

    ForceNativeMkbTitles: [],
}

export const BX_FLAGS = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
try {
    delete window.BX_FLAGS;
} catch (e) {}

export const NATIVE_FETCH = window.fetch;
