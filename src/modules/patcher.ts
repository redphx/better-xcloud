import { SCRIPT_VERSION, STATES } from "@utils/global";
import { BX_FLAGS } from "@utils/bx-flags";
import { getPref, PrefKey } from "@utils/preferences";
import { VibrationManager } from "@modules/vibration-manager";
import { BxLogger } from "@utils/bx-logger";
import { hashCode } from "@/utils/utils";

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
        if (!str.includes('onServerDisconnectMessage(e){')) {
            return false;
        }

        str = str.replace('onServerDisconnectMessage(e){', `onServerDisconnectMessage(e) {
            const msg = JSON.parse(e);
            if (msg.reason === 'WarningForBeingIdle' && !window.location.pathname.includes('/launch/')) {
                try {
                    this.sendKeepAlive();
                    return;
                } catch (ex) { console.log(ex); }
            }
        `);

        return str;
    },

    // Enable Remote Play feature
    remotePlayConnectMode(str: string) {
        const text = 'connectMode:"cloud-connect"';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, `connectMode:window.BX_REMOTE_PLAY_CONFIG?"xhome-connect":"cloud-connect",remotePlayServerId:(window.BX_REMOTE_PLAY_CONFIG&&window.BX_REMOTE_PLAY_CONFIG.serverId)||''`);
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

    blockGamepadStatsCollector(str: string) {
        const text = 'this.inputPollingIntervalStats.addValue';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace('this.inputPollingIntervalStats.addValue', '');
        str = str.replace('this.inputPollingDurationStats.addValue', '');
        return str;
    },

    enableXcloudLogger(str: string) {
        const text = 'this.telemetryProvider=e}log(e,t,i){';
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

        const newCode = `
if (!window.BX_ENABLE_CONTROLLER_VIBRATION) {
    return void(0);
}
if (window.BX_VIBRATION_INTENSITY && window.BX_VIBRATION_INTENSITY < 1) {
    e.leftMotorPercent = e.leftMotorPercent * window.BX_VIBRATION_INTENSITY;
    e.rightMotorPercent = e.rightMotorPercent * window.BX_VIBRATION_INTENSITY;
    e.leftTriggerMotorPercent = e.leftTriggerMotorPercent * window.BX_VIBRATION_INTENSITY;
    e.rightTriggerMotorPercent = e.rightTriggerMotorPercent * window.BX_VIBRATION_INTENSITY;
}
`;

        VibrationManager.updateGlobalVars();
        str = str.replaceAll(text, text + newCode);
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

        const newSettings = [
            // 'EnableStreamGate: false',
            'PwaPrompt: false',
        ];

        const newCode = newSettings.join(',');

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

        str = str.replace(text, 'window.BX_EXPOSED["touch_layout_manager"] = this,' + text);
        return str;
    },

    supportLocalCoOp(str: string) {
        const text = 'this.gamepadMappingsToSend=[],';
        if (!str.includes(text)) {
            return false;
        }

        let patchstr = `
let match;
let onGamepadChangedStr = this.onGamepadChanged.toString();

onGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'arguments[1]');
eval(\`this.onGamepadChanged = function \${onGamepadChangedStr}\`);

let onGamepadInputStr = this.onGamepadInput.toString();

match = onGamepadInputStr.match(/(\\w+\\.GamepadIndex)/);
if (match) {
    const gamepadIndexVar = match[0];
    onGamepadInputStr = onGamepadInputStr.replace('this.gamepadStates.get(', \`this.gamepadStates.get(\${gamepadIndexVar},\`);
    eval(\`this.onGamepadInput = function \${onGamepadInputStr}\`);
    BxLogger.info('supportLocalCoOp', '✅ Successfully patched local co-op support');
} else {
    BxLogger.error('supportLocalCoOp', '❌ Unable to patch local co-op support');
}
`;

        const newCode = `true; ${patchstr}; true,`;

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

        // Restore the "..." button
        str = str.replace(text, 'e.guideUI = null;' + text);

        // Remove the TAK Edit button when the touch controller is disabled
        if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'off') {
            str = str.replace(text, 'e.canShowTakHUD = false;' + text);
        }
        return str;
    },

    broadcastPollingMode(str: string) {
        const text = '.setPollingMode=e=>{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
window.BX_EXPOSED.onPollingModeChanged && window.BX_EXPOSED.onPollingModeChanged(e);
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
};

let PATCH_ORDERS: PatchArray = [
    'disableStreamGate',
    'overrideSettings',
    'broadcastPollingMode',

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
        STATES.hasTouchSupport && 'patchUpdateInputConfigurationAsync',
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

    // Patch volume control for normal stream
    getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && !getPref(PrefKey.STREAM_COMBINE_SOURCES) && 'patchAudioMediaStream',
    // Patch volume control for combined audio+video stream
    getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && getPref(PrefKey.STREAM_COMBINE_SOURCES) && 'patchCombinedAudioVideoMediaStream',


    STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all' && 'exposeTouchLayoutManager',
    STATES.hasTouchSupport && (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'off' || getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) && 'disableTakRenderer',
    STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) !== 100 && 'patchTouchControlDefaultOpacity',

    BX_FLAGS.EnableXcloudLogging && 'enableConsoleLogging',

    getPref(PrefKey.BLOCK_TRACKING) && 'blockGamepadStatsCollector',

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
