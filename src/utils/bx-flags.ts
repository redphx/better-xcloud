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
    PreloadUi: false,
    EnableXcloudLogging: false,
    SafariWorkaround: true,

    UseDevTouchLayout: false,
}

const BX_FLAGS = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
delete window.BX_FLAGS;

export { BX_FLAGS }
