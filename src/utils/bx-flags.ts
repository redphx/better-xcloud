type BxFlags = {
    CheckForUpdate?: boolean;
    PreloadRemotePlay?: boolean;
    PreloadUi?: boolean;
    EnableXcloudLogging?: boolean;
    SafariWorkaround?: boolean;

    UseDevTouchLayout?: boolean;
}

// Setup flags
const DEFAULT_FLAGS: BxFlags = {
    CheckForUpdate: true,
    PreloadRemotePlay: true,
    PreloadUi: true,
    EnableXcloudLogging: false,
    SafariWorkaround: true,

    UseDevTouchLayout: false,
}

export const BX_FLAGS = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
try {
    delete window.BX_FLAGS;
} catch (e) {}
