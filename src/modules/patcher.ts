import { STATES } from "../utils/global";
import { BX_FLAGS } from "../utils/bx-flags";
import { getPref, PrefKey } from "../utils/preferences";
import { VibrationManager } from "./vibration-manager";

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
        const text = 'async addLog(e,t=1e4){';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, text + 'return;');
    },

    // Set TV layout
    tvLayout(str: string) {
        const text = '?"tv":"default"';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, '?"tv":"tv"');
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

    // Fix the Guide/Nexus button not working in Remote Play
    remotePlayGuideWorkaround(str: string) {
        const text = 'nexusButtonHandler:this.featureGates.EnableClientGuideInStream';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, `nexusButtonHandler: !window.BX_REMOTE_PLAY_CONFIG && this.featureGates.EnableClientGuideInStream`);
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
        const text = 'Symbol("ChatSocketPlugin")';
        if (!str.includes(text)) {
            return false;
        }

        console.log('[Better xCloud] Remaining patches:', PATCH_ORDERS);
        PATCH_ORDERS = PATCH_ORDERS.concat(PLAYING_PATCH_ORDERS);
        Patcher.cleanupPatches();

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
    console.log('[Better xCloud] ✅ Successfully patched local co-op support');
} else {
    console.log('[Better xCloud] ❌ Unable to patch local co-op support');
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

        const newCode = `
const titleInfo = window.BX_EXPOSED.getTitleInfo();
if (!titleInfo.details.hasTouchSupport) {
    return;
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
console.log(${titleInfoVar});
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
console.log(${configsVar});
`;

        str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1);
        return str;

    },
};

let PATCH_ORDERS = [
    getPref(PrefKey.BLOCK_TRACKING) && [
        'disableAiTrack',
        'disableTelemetry',
    ],

    ['disableStreamGate'],

    ['broadcastPollingMode'],

    getPref(PrefKey.UI_LAYOUT) === 'tv' && ['tvLayout'],

    BX_FLAGS.EnableXcloudLogging && [
        'enableConsoleLogging',
        'enableXcloudLogger',
    ],

    getPref(PrefKey.LOCAL_CO_OP_ENABLED) && ['supportLocalCoOp'],

    getPref(PrefKey.BLOCK_TRACKING) && [
        'blockWebRtcStatsCollector',
        'disableIndexDbLogging',
    ],

    getPref(PrefKey.BLOCK_TRACKING) && [
        'disableTelemetryProvider',
        'disableTrackEvent',
    ],

    getPref(PrefKey.REMOTE_PLAY_ENABLED) && ['remotePlayKeepAlive'],
    getPref(PrefKey.REMOTE_PLAY_ENABLED) && ['remotePlayDirectConnectUrl'],

    [
        'overrideSettings',
    ],

    getPref(PrefKey.REMOTE_PLAY_ENABLED) && STATES.hasTouchSupport && ['patchUpdateInputConfigurationAsync'],

    getPref(PrefKey.GAME_FORTNITE_FORCE_CONSOLE) && ['forceFortniteConsole'],
];


// Only when playing
const PLAYING_PATCH_ORDERS = [
    ['patchXcloudTitleInfo'],
    getPref(PrefKey.REMOTE_PLAY_ENABLED) && ['patchRemotePlayMkb'],

    getPref(PrefKey.REMOTE_PLAY_ENABLED) && ['remotePlayConnectMode'],
    getPref(PrefKey.REMOTE_PLAY_ENABLED) && ['remotePlayGuideWorkaround'],

    ['patchStreamHud'],

    ['playVibration'],
    STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all' && ['exposeTouchLayoutManager'],
    STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'off' && ['disableTakRenderer'],

    BX_FLAGS.EnableXcloudLogging && ['enableConsoleLogging'],

    getPref(PrefKey.BLOCK_TRACKING) && ['blockGamepadStatsCollector'],

    [
        'disableGamepadDisconnectedScreen',
    ],

    getPref(PrefKey.STREAM_COMBINE_SOURCES) && ['streamCombineSources'],
];

export class Patcher {
    static #patchFunctionBind() {
        const nativeBind = Function.prototype.bind;
        Function.prototype.bind = function() {
            let valid = false;
            if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
                if (arguments[1] === 0 || (typeof arguments[1] === 'function')) {
                    valid = true;
                }
            }

            if (!valid) {
                // @ts-ignore
                return nativeBind.apply(this, arguments);
            }

            if (typeof arguments[1] === 'function') {
                console.log('[Better xCloud] Restored Function.prototype.bind()');
                Function.prototype.bind = nativeBind;
            }

            const orgFunc = this;
            const newFunc = (a: any, item: any) => {
                if (Patcher.length() === 0) {
                    orgFunc(a, item);
                    return;
                }

                Patcher.patch(item);
                orgFunc(a, item);
            }

            // @ts-ignore
            return nativeBind.apply(newFunc, arguments);
        };
    }

    static length() { return PATCH_ORDERS.length; };

    static patch(item: any) {
        // console.log('patch', '-----');
        let appliedPatches;

        for (let id in item[1]) {
            if (PATCH_ORDERS.length <= 0) {
                return;
            }

            appliedPatches = [];
            const func = item[1][id];
            let str = func.toString();

            for (let groupIndex = 0; groupIndex < PATCH_ORDERS.length; groupIndex++) {
                const group = PATCH_ORDERS[groupIndex];
                let modified = false;

                for (let patchIndex = 0; patchIndex < group.length; patchIndex++) {
                    const patchName = group[patchIndex] as keyof typeof PATCHES;
                    if (appliedPatches.indexOf(patchName) > -1) {
                        continue;
                    }

                    const patchedstr = PATCHES[patchName].call(null, str);
                    if (!patchedstr) {
                        // Only stop if the first patch is failed
                        if (patchIndex === 0) {
                            break;
                        } else {
                            continue;
                        }
                    }

                    modified = true;
                    str = patchedstr;

                    console.log(`[Better xCloud] Applied "${patchName}" patch`);
                    appliedPatches.push(patchName);

                    // Remove patch from group
                    group.splice(patchIndex, 1);
                    patchIndex--;
                }

                // Apply patched functions
                if (modified) {
                    item[1][id] = eval(str);
                }

                // Remove empty group
                if (!group.length) {
                    PATCH_ORDERS.splice(groupIndex, 1);
                    groupIndex--;
                }
            }
        }
    }

    // Remove disabled patches
    static cleanupPatches() {
        for (let groupIndex = PATCH_ORDERS.length - 1; groupIndex >= 0; groupIndex--) {
            const group = PATCH_ORDERS[groupIndex];
            if (group === false) {
                PATCH_ORDERS.splice(groupIndex, 1);
                continue;
            }

            for (let patchIndex = group.length - 1; patchIndex >= 0; patchIndex--) {
                const patchName = group[patchIndex] as keyof typeof PATCHES;
                if (!PATCHES[patchName]) {
                    // Remove disabled patch
                    group.splice(patchIndex, 1);
                }
            }

            // Remove empty group
            if (!group.length) {
                PATCH_ORDERS.splice(groupIndex, 1);
            }
        }
    }

    static initialize() {
        if (window.location.pathname.includes('/play/')) {
            PATCH_ORDERS = PATCH_ORDERS.concat(PLAYING_PATCH_ORDERS);
        } else {
            PATCH_ORDERS.push(['loadingEndingChunks']);
        }

        Patcher.cleanupPatches();
        Patcher.#patchFunctionBind();
    }
}
