import { getLocale } from "../modules/translation";

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

export const SCRIPT_VERSION = '3.5.3';
export const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

export var LOCALE = getLocale();

export const refreshLocale = () => {
    LOCALE = getLocale();
}
