import { SCRIPT_VERSION, STATES } from "@utils/global";
import { BX_FLAGS } from "@utils/bx-flags";
import { getPref, PrefKey } from "@utils/preferences";
import { VibrationManager } from "@modules/vibration-manager";
import { BxLogger } from "@utils/bx-logger";
import { hashCode, renderString } from "@utils/utils";
import { BxEvent } from "@/utils/bx-event";

import codeControllerShortcuts from "./patches/controller-shortcuts.js" with { type: "text" };
import codeExposeStreamSession from "./patches/expose-stream-session.js" with { type: "text" };
import codeLocalCoOpEnable from "./patches/local-co-op-enable.js" with { type: "text" };
import codeRemotePlayEnable from "./patches/remote-play-enable.js" with { type: "text" };
import codeRemotePlayKeepAlive from "./patches/remote-play-keep-alive.js" with { type: "text" };
import codeVibrationAdjust from "./patches/vibration-adjust.js" with { type: "text" };
import { FeatureGates } from "@/utils/feature-gates.js";

type PatchArray = (keyof typeof PATCHES)[];

const ENDING_CHUNKS_PATCH_NAME = 'loadingEndingChunks';

const LOG_TAG = 'Patcher';

const PATCHES = {
    // Disable ApplicationInsights.track() function
    disableAiTrack(str: string) {
        const text = '.track=function(';
        const index = str.indexOf(text);
        if (index === -1) {
            return false;
        }

        if (str.substring(0, index + 200).includes('"AppInsightsCore')) {
            return false;
        }

        return str.substring(0, index) + '.track=function(e){},!!function(' + str.substring(index + text.length);
    },

    // Set disableTelemetry() to true
    disableTelemetry(str: string) {
        const text = '.disableTelemetry=function(){return!1}';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, '.disableTelemetry=function(){return!0}');
    },

    disableTelemetryProvider(str: string) {
        const text = 'this.enableLightweightTelemetry=!';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = [
            'this.trackEvent',
            'this.trackPageView',
            'this.trackHttpCompleted',
            'this.trackHttpFailed',
            'this.trackError',
            'this.trackErrorLike',
            'this.onTrackEvent',
            '()=>{}',
        ].join('=');

        return str.replace(text, newCode + ';' + text);
    },

    // Disable IndexDB logging
    disableIndexDbLogging(str: string) {
        const text = ',this.logsDb=new';
        if (!str.includes(text)) {
            return false;
        }

        // Replace log() with an empty function
        let newCode = ',this.log=()=>{}';
        return str.replace(text, newCode + text);
    },

    // Set custom website layout
    websiteLayout(str: string) {
        const text = '?"tv":"default"';
        if (!str.includes(text)) {
            return false;
        }

        const layout = getPref(PrefKey.UI_LAYOUT) === 'tv' ? 'tv' : 'default';
        return str.replace(text, `?"${layout}":"${layout}"`);
    },

    // Replace "/direct-connect" with "/play"
    remotePlayDirectConnectUrl(str: string) {
        const index = str.indexOf('/direct-connect');
        if (index === -1) {
            return false;
        }

        return str.replace(str.substring(index - 9, index + 15), 'https://www.xbox.com/play');
    },

    remotePlayKeepAlive(str: string) {
        const text = 'onServerDisconnectMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + codeRemotePlayKeepAlive);

        return str;
    },

    // Enable Remote Play feature
    remotePlayConnectMode(str: string) {
        const text = 'connectMode:"cloud-connect",';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, codeRemotePlayEnable);
    },

    // Disable achievement toast in Remote Play
    remotePlayDisableAchievementToast(str: string) {
        const text = '.AchievementUnlock:{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
if (!!window.BX_REMOTE_PLAY_CONFIG) {
    return;
}
`;

        return str.replace(text, text + newCode);
    },

    // Disable trackEvent() function
    disableTrackEvent(str: string) {
        const text = 'this.trackEvent=';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, 'this.trackEvent=e=>{},this.uwuwu=');
    },

    // Block WebRTC stats collector
    blockWebRtcStatsCollector(str: string) {
        const text = 'this.shouldCollectStats=!0';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, 'this.shouldCollectStats=!1');
    },

    patchPollGamepads(str: string) {
        const index = str.indexOf('},this.pollGamepads=()=>{');
        if (index === -1) {
            return false;
        }

        const nextIndex = str.indexOf('setTimeout(this.pollGamepads', index);
        if (nextIndex === -1) {
            return false;
        }

        let codeBlock = str.substring(index, nextIndex);

        // Block gamepad stats collecting
        if (getPref(PrefKey.BLOCK_TRACKING)) {
            codeBlock = codeBlock.replaceAll('this.inputPollingIntervalStats.addValue', '');
        }

        // Map the Share button on Xbox Series controller with the capturing screenshot feature
        const match = codeBlock.match(/this\.gamepadTimestamps\.set\((\w+)\.index/);
        if (match) {
            const gamepadVar = match[1];
            const newCode = renderString(codeControllerShortcuts, {
                    gamepadVar,
                });

            codeBlock = codeBlock.replace('this.gamepadTimestamps.set', newCode + 'this.gamepadTimestamps.set');
        }

        return str.substring(0, index) + codeBlock + str.substring(nextIndex);
    },

    enableXcloudLogger(str: string) {
        const text = 'this.telemetryProvider=e}log(e,t,r){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replaceAll(text, text + 'console.log(Array.from(arguments));');
        return str;
    },

    enableConsoleLogging(str: string) {
        const text = 'static isConsoleLoggingAllowed(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replaceAll(text, text + 'return true;');
        return str;
    },

    // Control controller vibration
    playVibration(str: string) {
        const text = '}playVibration(e){';
        if (!str.includes(text)) {
            return false;
        }

        VibrationManager.updateGlobalVars();
        str = str.replaceAll(text, text + codeVibrationAdjust);
        return str;
    },

    // Override website's settings
    overrideSettings(str: string) {
        const index = str.indexOf(',EnableStreamGate:');
        if (index === -1) {
            return false;
        }

        // Find the next "},"
        const endIndex = str.indexOf('},', index);

        let newSettings = JSON.stringify(FeatureGates);
        newSettings = newSettings.substring(1, newSettings.length - 1);

        const newCode = newSettings;

        str = str.substring(0, endIndex) + ',' + newCode + str.substring(endIndex);
        return str;
    },

    disableGamepadDisconnectedScreen(str: string) {
        const index = str.indexOf('"GamepadDisconnected_Title",');
        if (index === -1) {
            return false;
        }

        const constIndex = str.indexOf('const', index - 30);
        str = str.substring(0, constIndex) + 'e.onClose();return null;' + str.substring(constIndex);
        return str;
    },

    patchUpdateInputConfigurationAsync(str: string) {
        const text = 'async updateInputConfigurationAsync(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = 'e.enableTouchInput = true;';

        str = str.replace(text, text + newCode);
        return str;
    },

    // Add patches that are only needed when start playing
    loadingEndingChunks(str: string) {
        const text = '"FamilySagaManager"';
        if (!str.includes(text)) {
            return false;
        }

        BxLogger.info(LOG_TAG, 'Remaining patches:', PATCH_ORDERS);
        PATCH_ORDERS = PATCH_ORDERS.concat(PLAYING_PATCH_ORDERS);

        return str;
    },

    // Disable StreamGate
    disableStreamGate(str: string) {
        const index = str.indexOf('case"partially-ready":');
        if (index === -1) {
            return false;
        }

        const bracketIndex = str.indexOf('=>{', index - 150) + 3;

        str = str.substring(0, bracketIndex) + 'return 0;' + str.substring(bracketIndex);
        return str;
    },

    exposeTouchLayoutManager(str: string) {
        const text = 'this._perScopeLayoutsStream=new';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
true;
window.BX_EXPOSED["touchLayoutManager"] = this;
window.dispatchEvent(new Event("${BxEvent.TOUCH_LAYOUT_MANAGER_READY}"));
`;

        str = str.replace(text, newCode + text);
        return str;
    },


    patchBabylonRendererClass(str: string) {
        // ()=>{a.current.render(),h.current=window.requestAnimationFrame(l)
        let index = str.indexOf('.current.render(),');
        if (index === -1) {
            return false;
        }

        // Move back a character
        index -= 1;

        // Get variable of the "BabylonRendererClass" object
        const rendererVar = str[index];

        const newCode = `
if (window.BX_EXPOSED.stopTakRendering) {
    try {
        document.getElementById('BabylonCanvasContainer-main')?.parentElement.classList.add('bx-offscreen');

        ${rendererVar}.current.dispose();
    } catch (e) {}

    window.BX_EXPOSED.stopTakRendering = false;
    return;
}
`;

        str = str.substring(0, index) + newCode + str.substring(index);
        return str;
    },

    supportLocalCoOp(str: string) {
        const text = 'this.gamepadMappingsToSend=[],';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `true; ${codeLocalCoOpEnable}; true,`;

        str = str.replace(text, text + newCode);
        return str;
    },

    forceFortniteConsole(str: string) {
        const text = 'sendTouchInputEnabledMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `window.location.pathname.includes('/launch/fortnite/') && (e = false);`;

        str = str.replace(text, text + newCode);
        return str;
    },

    disableTakRenderer(str: string) {
        const text = 'const{TakRenderer:';
        if (!str.includes(text)) {
            return false;
        }

        let remotePlayCode = '';
        if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== 'off' && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) {
            remotePlayCode = `
const gamepads = window.navigator.getGamepads();
let gamepadFound = false;

for (let gamepad of gamepads) {
    if (gamepad && gamepad.connected) {
        gamepadFound = true;
        break;
    }
}

if (gamepadFound) {
    return;
}
`;
        }

        const newCode = `
if (!!window.BX_REMOTE_PLAY_CONFIG) {
    ${remotePlayCode}
} else {
    const titleInfo = window.BX_EXPOSED.getTitleInfo();
    if (titleInfo && !titleInfo.details.hasTouchSupport && !titleInfo.details.hasFakeTouchSupport) {
        return;
    }
}
`;

        str = str.replace(text, newCode + text);
        return str;
    },

    streamCombineSources(str: string) {
        const text = 'this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'this.useCombinedAudioVideoStream=true');
        return str;
    },

    patchStreamHud(str: string) {
        const text = 'let{onCollapse';
        if (!str.includes(text)) {
            return false;
        }

        let newCode = `
// Expose onShowStreamMenu
window.BX_EXPOSED.showStreamMenu = e.onShowStreamMenu;
// Restore the "..." button
e.guideUI = null;
`;

        // Remove the TAK Edit button when the touch controller is disabled
        if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'off') {
            newCode += 'e.canShowTakHUD = false;';
        }

        str = str.replace(text, newCode + text);
        return str;
    },

    broadcastPollingMode(str: string) {
        const text = '.setPollingMode=e=>{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
BxEvent.dispatch(window, BxEvent.XCLOUD_POLLING_MODE_CHANGED, {mode: e});
`;
        str = str.replace(text, text + newCode);
        return str;
    },

    patchXcloudTitleInfo(str: string) {
        const text = 'async cloudConnect';
        let index = str.indexOf(text);
        if (index === -1) {
            return false;
        }

        // Find the next "{" backet
        let backetIndex = str.indexOf('{', index);

        // Get param name
        const params = str.substring(index, backetIndex).match(/\(([^)]+)\)/)![1];
        const titleInfoVar = params.split(',')[0];

        const newCode = `
${titleInfoVar} = window.BX_EXPOSED.modifyTitleInfo(${titleInfoVar});
BxLogger.info('patchXcloudTitleInfo', ${titleInfoVar});
`;
        str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1);
        return str;
    },

    patchRemotePlayMkb(str: string) {
        const text = 'async homeConsoleConnect';
        let index = str.indexOf(text);
        if (index === -1) {
            return false;
        }

        // Find the next "{" backet
        let backetIndex = str.indexOf('{', index);

        // Get param name
        const params = str.substring(index, backetIndex).match(/\(([^)]+)\)/)![1];
        const configsVar = params.split(',')[1];

        const newCode = `
Object.assign(${configsVar}.inputConfiguration, {
    enableMouseInput: false,
    enableKeyboardInput: false,
    enableAbsoluteMouse: false,
});
BxLogger.info('patchRemotePlayMkb', ${configsVar});
`;

        str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1);
        return str;

    },

    patchAudioMediaStream(str: string) {
        const text = '.srcObject=this.audioMediaStream,';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `window.BX_EXPOSED.setupGainNode(arguments[1], this.audioMediaStream),`;

        str = str.replace(text, text + newCode);
        return str;
    },

    patchCombinedAudioVideoMediaStream(str: string) {
        const text = '.srcObject=this.combinedAudioVideoStream';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `,window.BX_EXPOSED.setupGainNode(arguments[0], this.combinedAudioVideoStream)`;
        str = str.replace(text, text + newCode);
        return str;
    },

    patchTouchControlDefaultOpacity(str: string) {
        const text = 'opacityMultiplier:1';
        if (!str.includes(text)) {
            return false;
        }

        const opacity = (getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) / 100).toFixed(1);
        const newCode = `opacityMultiplier: ${opacity}`;
        str = str.replace(text, newCode);
        return str;
    },

    patchShowSensorControls(str: string) {
        const text = '{shouldShowSensorControls:';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `{shouldShowSensorControls: (window.BX_EXPOSED && window.BX_EXPOSED.shouldShowSensorControls) ||`;

        str = str.replace(text, newCode);
        return str;
    },

    /*
    exposeEventTarget(str: string) {
        const text ='this._eventTarget=new EventTarget';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
window.BX_EXPOSED.eventTarget = ${text},
window.dispatchEvent(new Event('${BxEvent.STREAM_EVENT_TARGET_READY}'))
`;

        str = str.replace(text, newCode);
        return str;
    },
    //*/

    // Class with: connectAsync(), doConnectAsync(), setPlayClient()
    exposeStreamSession(str: string) {
        const text =',this._connectionType=';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `;
${codeExposeStreamSession}
true` + text;

        str = str.replace(text, newCode);
        return str;
    },

    skipFeedbackDialog(str: string) {
        const text = '&&this.shouldTransitionToFeedback(';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, '&& false ' + text);
        return str;
    },

    enableNativeMkb(str: string) {
        const text = 'e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;';
        if ((!str.includes(text))) {
            return false;
        }

        str = str.replace(text, text + 'return true;');
        return str;
    },

    patchMouseAndKeyboardEnabled(str: string) {
        const text = 'get mouseAndKeyboardEnabled(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return true;');
        return str;
    },

    exposeInputSink(str: string) {
        const text = 'this.controlChannel=null,this.inputChannel=null';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = 'window.BX_EXPOSED.inputSink = this;';

        str = str.replace(text, newCode + text);
        return str;
    },

    disableNativeRequestPointerLock(str: string) {
        const text = 'async requestPointerLock(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return;');
        return str;
    },

    // Fix crashing when RequestInfo.origin is empty
    patchRequestInfoCrash(str: string) {
        const text = 'if(!e)throw new Error("RequestInfo.origin is falsy");';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'if (!e) e = "https://www.xbox.com";');
        return str;
    },

    exposeDialogRoutes(str: string) {
        const text = 'return{goBack:function(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'return window.BX_EXPOSED.dialogRoutes = {goBack:function(){');
        return str;
    },

    /*
    (x.AW, {
        path: V.LoginDeviceCode.path,
        exact: !0,
        render: () => (0, n.jsx)(qe, {
            children: (0, n.jsx)(Et.R, {})
        })
    }, V.LoginDeviceCode.name),

    const qe = e => {
        let {
            children: t
        } = e;
        const {
            isTV: a,
            isSupportedTVBrowser: r
        } = (0, T.d)();
        return a && r ? (0, n.jsx)(n.Fragment, {
            children: t
        }) : (0, n.jsx)(x.l_, {
            to: V.Home.getLink()
        })
    };
    */
    enableTvRoutes(str: string) {
        let index = str.indexOf('.LoginDeviceCode.path,');
        if (index < 0) {
            return false;
        }

        // Find *qe* name
        const match = /render:.*?jsx\)\(([^,]+),/.exec(str.substring(index, index + 100));
        if (!match) {
            return false;
        }

        const funcName = match[1];

        // Replace *qe*'s return value
        // `return a && r ?` => `return a && r || true ?`
        index = str.indexOf(`const ${funcName}=e=>{`);
        index > -1 && (index = str.indexOf('return ', index));
        index > -1 && (index = str.indexOf('?', index));

        if (index === -1) {
            return false;
        }

        str = str.substring(0, index) + '|| true' + str.substring(index);
        return str;
    },
};

let PATCH_ORDERS: PatchArray = [
    ...(getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' ? [
        'enableNativeMkb',
        'patchMouseAndKeyboardEnabled',
        'disableNativeRequestPointerLock',
        'exposeInputSink',
    ] : []),

    'patchRequestInfoCrash',

    'disableStreamGate',
    'overrideSettings',
    'broadcastPollingMode',

    'exposeStreamSession',
    'exposeDialogRoutes',

    'enableTvRoutes',

    getPref(PrefKey.UI_LAYOUT) !== 'default' && 'websiteLayout',
    getPref(PrefKey.LOCAL_CO_OP_ENABLED) && 'supportLocalCoOp',
    getPref(PrefKey.GAME_FORTNITE_FORCE_CONSOLE) && 'forceFortniteConsole',

    ...(getPref(PrefKey.BLOCK_TRACKING) ? [
        'disableAiTrack',
        'disableTelemetry',

        'blockWebRtcStatsCollector',
        'disableIndexDbLogging',

        'disableTelemetryProvider',
        'disableTrackEvent',
    ] : []),

    ...(getPref(PrefKey.REMOTE_PLAY_ENABLED) ? [
        'remotePlayKeepAlive',
        'remotePlayDirectConnectUrl',
        'remotePlayDisableAchievementToast',
        STATES.userAgent.capabilities.touch && 'patchUpdateInputConfigurationAsync',
    ] : []),

    ...(BX_FLAGS.EnableXcloudLogging ? [
        'enableConsoleLogging',
        'enableXcloudLogger',
    ] : []),
].filter(item => !!item);

// Only when playing
let PLAYING_PATCH_ORDERS: PatchArray = [
    'patchXcloudTitleInfo',
    'disableGamepadDisconnectedScreen',
    'patchStreamHud',
    'playVibration',

    // 'exposeEventTarget',

    // Patch volume control for normal stream
    getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && !getPref(PrefKey.STREAM_COMBINE_SOURCES) && 'patchAudioMediaStream',
    // Patch volume control for combined audio+video stream
    getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && getPref(PrefKey.STREAM_COMBINE_SOURCES) && 'patchCombinedAudioVideoMediaStream',

    // Skip feedback dialog
    getPref(PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG) && 'skipFeedbackDialog',

    ...(STATES.userAgent.capabilities.touch ? [
        getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all' && 'patchShowSensorControls',
        getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all' && 'exposeTouchLayoutManager',
        (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'off' || getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) && 'disableTakRenderer',
        getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) !== 100 && 'patchTouchControlDefaultOpacity',
        'patchBabylonRendererClass',
    ] : []),

    BX_FLAGS.EnableXcloudLogging && 'enableConsoleLogging',

    'patchPollGamepads',

    getPref(PrefKey.STREAM_COMBINE_SOURCES) && 'streamCombineSources',

    ...(getPref(PrefKey.REMOTE_PLAY_ENABLED) ? [
        'patchRemotePlayMkb',
        'remotePlayConnectMode',
    ] : []),
].filter(item => !!item);

const ALL_PATCHES = [...PATCH_ORDERS, ...PLAYING_PATCH_ORDERS];

export class Patcher {
    static #patchFunctionBind() {
        const nativeBind = Function.prototype.bind;
        Function.prototype.bind = function() {
            let valid = false;

            // Looking for these criteria:
            // - Variable name <= 2 characters
            // - Has 2 params:
            //     - The first one is null
            //     - The second one is either 0 or a function
            if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
                if (arguments[1] === 0 || (typeof arguments[1] === 'function')) {
                    valid = true;
                }
            }

            if (!valid) {
                // @ts-ignore
                return nativeBind.apply(this, arguments);
            }

            PatcherCache.init();

            if (typeof arguments[1] === 'function') {
                BxLogger.info(LOG_TAG, 'Restored Function.prototype.bind()');
                Function.prototype.bind = nativeBind;
            }

            const orgFunc = this;
            const newFunc = (a: any, item: any) => {
                Patcher.patch(item);
                orgFunc(a, item);
            }

            // @ts-ignore
            return nativeBind.apply(newFunc, arguments);
        };
    }

    static patch(item: [[number], { [key: string]: () => {} }]) {
        // !!! Use "caches" as variable name will break touch controller???
        // console.log('patch', '-----');
        let patchesToCheck: PatchArray;
        let appliedPatches: PatchArray;

        const patchesMap: Record<string, PatchArray> = {};

        for (let id in item[1]) {
            appliedPatches = [];

            const cachedPatches = PatcherCache.getPatches(id);
            if (cachedPatches) {
                patchesToCheck = cachedPatches.slice(0);
                patchesToCheck.push(...PATCH_ORDERS);
            } else {
                patchesToCheck = PATCH_ORDERS.slice(0);
            }

            // Empty patch list
            if (!patchesToCheck.length) {
                continue;
            }

            const func = item[1][id];
            let str = func.toString();

            let modified = false;

            for (let patchIndex = 0; patchIndex < patchesToCheck.length; patchIndex++) {
                const patchName = patchesToCheck[patchIndex];
                if (appliedPatches.indexOf(patchName) > -1) {
                    continue;
                }

                if (!PATCHES[patchName]) {
                    continue;
                }

                // Check function against patch
                const patchedStr = PATCHES[patchName].call(null, str);

                // Not patched
                if (!patchedStr) {
                    continue;
                }

                modified = true;
                str = patchedStr;

                BxLogger.info(LOG_TAG, `✅ ${patchName}`);
                appliedPatches.push(patchName);

                // Remove patch
                patchesToCheck.splice(patchIndex, 1);
                patchIndex--;
                PATCH_ORDERS = PATCH_ORDERS.filter(item => item != patchName);
            }

            // Apply patched functions
            if (modified) {
                item[1][id] = eval(str);
            }

            // Save to cache
            if (appliedPatches.length) {
                patchesMap[id] = appliedPatches;
            }
        }

        if (Object.keys(patchesMap).length) {
            PatcherCache.saveToCache(patchesMap);
        }
    }

    static init() {
        Patcher.#patchFunctionBind();
    }
}

export class PatcherCache {
    static #KEY_CACHE = 'better_xcloud_patches_cache';
    static #KEY_SIGNATURE = 'better_xcloud_patches_cache_signature';

    static #CACHE: any;

    static #isInitialized = false;

    /**
     * Get patch's signature
     */
    static #getSignature(): number {
        const scriptVersion = SCRIPT_VERSION;
        const webVersion = (document.querySelector('meta[name=gamepass-app-version]') as HTMLMetaElement)?.content;
        const patches = JSON.stringify(ALL_PATCHES);

        // Calculate signature
        const sig = hashCode(scriptVersion + webVersion + patches)
        return sig;
    }

    static clear() {
        // Clear cache
        window.localStorage.removeItem(PatcherCache.#KEY_CACHE);
        PatcherCache.#CACHE = {};
    }

    static checkSignature() {
        const storedSig = window.localStorage.getItem(PatcherCache.#KEY_SIGNATURE) || 0;
        const currentSig = PatcherCache.#getSignature();

        if (currentSig !== parseInt(storedSig as string)) {
            // Save new signature
            BxLogger.warning(LOG_TAG, 'Signature changed');
            window.localStorage.setItem(PatcherCache.#KEY_SIGNATURE, currentSig.toString());

            PatcherCache.clear();
        } else {
            BxLogger.info(LOG_TAG, 'Signature unchanged');
        }
    }

    static #cleanupPatches(patches: PatchArray): PatchArray {
        return patches.filter(item => {
            for (const id in PatcherCache.#CACHE) {
                const cached = PatcherCache.#CACHE[id];

                if (cached.includes(item)) {
                    return false;
                }
            }

            return true;
        });
    }

    static getPatches(id: string): PatchArray {
        return PatcherCache.#CACHE[id];
    }

    static saveToCache(subCache: Record<string, PatchArray>) {
        for (const id in subCache) {
            const patchNames = subCache[id];

            let data = PatcherCache.#CACHE[id];
            if (!data) {
                PatcherCache.#CACHE[id] = patchNames;
            } else {
                for (const patchName of patchNames) {
                    if (!data.includes(patchName)) {
                        data.push(patchName);
                    }
                }
            }
        }

        // Save to storage
        window.localStorage.setItem(PatcherCache.#KEY_CACHE, JSON.stringify(PatcherCache.#CACHE));
    }

    static init() {
        if (PatcherCache.#isInitialized) {
            return;
        }
        PatcherCache.#isInitialized = true;

        PatcherCache.checkSignature();

        // Read cache from storage
        PatcherCache.#CACHE = JSON.parse(window.localStorage.getItem(PatcherCache.#KEY_CACHE) || '{}');
        BxLogger.info(LOG_TAG, PatcherCache.#CACHE);

        if (window.location.pathname.includes('/play/')) {
            PATCH_ORDERS.push(...PLAYING_PATCH_ORDERS);
        } else {
            PATCH_ORDERS.push(ENDING_CHUNKS_PATCH_NAME);
        }

        // Remove cached patches from PATCH_ORDERS & PLAYING_PATCH_ORDERS
        PATCH_ORDERS = PatcherCache.#cleanupPatches(PATCH_ORDERS);
        PLAYING_PATCH_ORDERS = PatcherCache.#cleanupPatches(PLAYING_PATCH_ORDERS);

        BxLogger.info(LOG_TAG, PATCH_ORDERS.slice(0));
        BxLogger.info(LOG_TAG, PLAYING_PATCH_ORDERS.slice(0));
    }
}
