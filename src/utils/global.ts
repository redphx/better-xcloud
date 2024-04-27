export const SCRIPT_VERSION = Bun.env.SCRIPT_VERSION;
export const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

export const AppInterface = window.AppInterface;
export const NATIVE_FETCH = window.fetch;
export const STATES: BxStates = {
    isPlaying: false,
    appContext: {},
    serverRegions: {},
    hasTouchSupport: ('ontouchstart' in window || navigator.maxTouchPoints > 0),

    currentStream: {},
    remotePlay: {},
};
