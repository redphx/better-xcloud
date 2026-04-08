import { AppInterface, SCRIPT_VERSION, STATES } from "@utils/global";
import { BX_FLAGS } from "@utils/bx-flags";
import { BxLogger } from "@utils/bx-logger";
import { blockSomeNotifications, hashCode, renderString } from "@utils/utils";
import { BxEvent } from "@/utils/bx-event";

import codeControllerCustomization from "./patches/controller-customization.js" with { type: "text" };
import codePollGamepad from "./patches/poll-gamepad.js" with { type: "text" };
import codeExposeStreamSession from "./patches/expose-stream-session.js" with { type: "text" };
import codeGameCardIcons from "./patches/game-card-icons.js" with { type: "text" };
import codeLocalCoOpEnable from "./patches/local-co-op-enable.js" with { type: "text" };
import codeRemotePlayKeepAlive from "./patches/remote-play-keep-alive.js" with { type: "text" };
import codeVibrationAdjust from "./patches/vibration-adjust.js" with { type: "text" };
import codeStreamHud from "./patches/stream-hud.js" with { type: "text" };
import codeCreatePortal from "./patches/create-portal.js" with { type: "text" };
import { GlobalPref, StorageKey } from "@/enums/pref-keys.js";
import { getGlobalPref } from "@/utils/pref-utils.js";
import { GamePassCloudGallery } from "@/enums/game-pass-gallery";
import { BlockFeature, NativeMkbMode, TouchControllerMode, UiLayout, UiSection } from "@/enums/pref-values";
import { PatcherUtils } from "./patcher-utils.js";

export type PatchName = keyof typeof PATCHES;
export type PatchArray = PatchName[];
export type PatchPage = 'home' | 'stream' | 'remote-play-stream';
type PatchFunction = (str: string) => string | false;

const LOG_TAG = 'Patcher';

const PATCHES = {
    // Disable ApplicationInsights.track() function
    disableAiTrack(str: string) {
        let text = '.track=function(';
        let index = str.indexOf('"AppInsightsCore.initialize"');
        (index > -1) && (index = PatcherUtils.indexOf(str, '"AppInsightsCore.track"', index));
        (index > -1) && (index = PatcherUtils.lastIndexOf(str, text, index, 300));
        if (index < 0) {
            return false;
        }

        return PatcherUtils.replaceWith(str, index, text, '.track=function(e){},!!function(');
    },

    // Set disableTelemetry() to true
    /*
    disableTelemetry(str: string) {
        let text = '.disableTelemetry=function(){return!1}';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, '.disableTelemetry=function(){return!0}');
    },
    */

    disableTelemetryProvider(str: string) {
        let text = 'this.enableLightweightTelemetry=!';
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
        let text = ',this.logsDb=new';
        if (!str.includes(text)) {
            return false;
        }

        // Replace log() with an empty function
        let newCode = ',this.log=()=>{}';
        return str.replace(text, newCode + text);
    },

    // Set custom website layout
    websiteLayout(str: string) {
        let text = '?"tv":"default"';
        if (!str.includes(text)) {
            return false;
        }

        const layout = getGlobalPref(GlobalPref.UI_LAYOUT) === UiLayout.TV ? UiLayout.TV : UiLayout.DEFAULT;
        return str.replace(text, `?"${layout}":"${layout}"`);
    },

    remotePlayPostStreamRedirectUrl(str: string) {
        let text = '.RemotePlayRoot.getLink()):';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, '.Home.getLink()):');
        return str;
    },

    remotePlayKeepAlive(str: string) {
        let text = 'onServerDisconnectMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + codeRemotePlayKeepAlive);

        return str;
    },

    // Remote Play: Disable achievement toast
    remotePlayDisableAchievementToast(str: string) {
        let text = '.AchievementUnlock:{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `if (window.location.pathname.includes('/play/consoles/launch/')) return;`;
        return str.replace(text, text + newCode);
    },

    // Block WebRTC stats collector
    blockWebRtcStatsCollector(str: string) {
        let text = 'this.shouldCollectStats=!0';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, 'this.shouldCollectStats=!1');
    },

    patchPollGamepads(str: string) {
        const index = str.indexOf('()(this,"pollGamepads",');
        if (index < 0) {
            return false;
        }

        const setTimeoutIndex = str.indexOf('setTimeout(this.pollGamepads', index);
        if (setTimeoutIndex < 0) {
            return false;
        }

        let codeBlock = str.substring(index, setTimeoutIndex);

        // Patch polling rate
        const tmp = str.substring(setTimeoutIndex, setTimeoutIndex + 150);
        const tmpPatched = tmp.replaceAll('Math.max(0,4-', 'Math.max(0,window.BX_STREAM_SETTINGS.controllerPollingRate - ');
        str = PatcherUtils.replaceWith(str, setTimeoutIndex, tmp, tmpPatched);

        // Block gamepad stats collecting
        if (getGlobalPref(GlobalPref.BLOCK_TRACKING)) {
            codeBlock = codeBlock.replace('this.inputPollingIntervalStats.addValue', '');
            codeBlock = codeBlock.replace('this.inputPollingDurationStats.addValue', '');
        }

        // Controller shortcuts
        let match = codeBlock.match(/this\.gamepadTimestamps\.set\(([A-Za-z0-9_$]+)\.index/);
        if (!match) {
            return false;
        }

        let newCode = renderString(codePollGamepad, {
            gamepadVar: match[1],
        });
        codeBlock = codeBlock.replace('this.gamepadTimestamps.set', newCode + 'this.gamepadTimestamps.set');

        // Controller customization
        match = codeBlock.match(/let ([A-Za-z0-9_$]+)=this\.gamepadMappings\.find/);
        if (!match) {
            return false;
        }

        const xCloudGamepadVar = match[1];
        const gamepadVar = codeBlock.match(/this\.gamepadTimestamps\.set\(([A-Za-z0-9_$]+)\.index/)![1];

        const inputFeedbackManager = PatcherUtils.indexOf(codeBlock, 'this.inputFeedbackManager.onGamepadConnected(', 0, 10000);
        const backetIndex = PatcherUtils.indexOf(codeBlock, '}', inputFeedbackManager, 100);
        if (backetIndex < 0) {
            return false;
        }

        // Local co-op: ensure each physical gamepad gets its own xCloud mapping
        // with the correct GamepadIndex. Must run BEFORE button values are mapped
        // to xCloudGamepad, otherwise the 2nd controller overwrites the 1st's values
        // in the shared mapping object.
        // Strategy: find the end of the find() call by counting parentheses,
        // then inject right after the full statement.
        const findCallStart = codeBlock.indexOf('this.gamepadMappings.find');
        if (findCallStart > -1) {
            const findOpenParen = codeBlock.indexOf('(', findCallStart + 'this.gamepadMappings.find'.length);
            let parenDepth = 1;
            let pos = findOpenParen + 1;
            while (parenDepth > 0 && pos < codeBlock.length) {
                if (codeBlock[pos] === '(') parenDepth++;
                else if (codeBlock[pos] === ')') parenDepth--;
                pos++;
            }
            // pos is right after the closing ) of find(...)
            // Skip past any trailing ; or whitespace
            while (pos < codeBlock.length && (codeBlock[pos] === ';' || codeBlock[pos] === ' ')) pos++;

            let coOpCode = `
if(window.BX_EXPOSED.localCoOpEnabled&&${xCloudGamepadVar}&&${xCloudGamepadVar}.GamepadIndex!==${gamepadVar}.index){let _bxCoopM=this.gamepadMappings.find(_m=>_m.GamepadIndex===${gamepadVar}.index);if(!_bxCoopM){_bxCoopM=Object.assign({},${xCloudGamepadVar},{GamepadIndex:${gamepadVar}.index,Dirty:!0});this.gamepadMappings.push(_bxCoopM);if(this.gamepadStates&&this.gamepadStates.has(${xCloudGamepadVar}.GamepadIndex)){this.gamepadStates.set(${gamepadVar}.index,structuredClone(this.gamepadStates.get(${xCloudGamepadVar}.GamepadIndex)))}}${xCloudGamepadVar}=_bxCoopM}`;

            codeBlock = PatcherUtils.insertAt(codeBlock, pos, coOpCode);
        }

        // Recalculate positions since codeBlock was modified by co-op insertion
        const newInputFeedbackManager = PatcherUtils.indexOf(codeBlock, 'this.inputFeedbackManager.onGamepadConnected(', 0, 15000);
        const newBacketIndex = PatcherUtils.indexOf(codeBlock, '}', newInputFeedbackManager, 100);

        let customizationCode = ';';  // End previous code line
        customizationCode += renderString(codeControllerCustomization, { xCloudGamepadVar });
        codeBlock = PatcherUtils.insertAt(codeBlock, newBacketIndex, customizationCode);

        str = str.substring(0, index) + codeBlock + str.substring(setTimeoutIndex);
        return str;
    },

    enableXcloudLogger(str: string) {
        let index = str.indexOf('this.telemetryProvider.trackErrorLike');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, '}log(', index, 1500));
        index > -1 && (index = PatcherUtils.indexOf(str, '{', index, 30, true));

        if (index < 0) {
            return false;
        }

        const newCode = `
const [logTag, logLevel, logMessage] = Array.from(arguments);
const logFunc = [console.debug, console.log, console.warn, console.error][logLevel];
logFunc(logTag, '//', logMessage);
`;

        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    enableConsoleLogging(str: string) {
        let text = 'static isConsoleLoggingAllowed(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replaceAll(text, text + 'return true;');
        return str;
    },

    // Control controller vibration
    playVibration(str: string) {
        let text = '}playVibration(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replaceAll(text, text + codeVibrationAdjust);
        return str;
    },

    disableGamepadDisconnectedScreen(str: string) {
        const index = str.indexOf('"GamepadDisconnected_Title",');
        if (index < 0) {
            return false;
        }

        const constIndex = PatcherUtils.lastIndexOf(str, 'const[', index, 100);
        if (constIndex < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, constIndex, 'e();return null;');
        return str;
    },

    patchUpdateInputConfigurationAsync(str: string) {
        let text = 'async updateInputConfigurationAsync(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = 'e.enableTouchInput = true;';

        str = str.replace(text, text + newCode);
        return str;
    },

    // Disable StreamGate
    disableStreamGate(str: string) {
        const index = str.indexOf('case"partially-ready":');
        if (index < 0) {
            return false;
        }

        const bracketIndex = str.indexOf('=>{', index - 150) + 3;

        str = str.substring(0, bracketIndex) + 'return 0;' + str.substring(bracketIndex);
        return str;
    },

    exposeTouchLayoutManager(str: string) {
        let text = 'this._perScopeLayoutsStream=new';
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
        if (index < 0) {
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
        // Try multiple patterns to find the gamepad manager constructor
        const patterns = [
            'this.gamepadMappingsToSend=[],',
            'this.gamepadMappingsToSend=[]',
        ];

        let text = '';
        for (const pattern of patterns) {
            if (str.includes(pattern)) {
                text = pattern;
                break;
            }
        }

        if (!text) {
            return false;
        }

        const newCode = `true; ${codeLocalCoOpEnable}; true,`;

        str = str.replace(text, text + newCode);
        return str;
    },

    forceFortniteConsole(str: string) {
        let text = 'sendTouchInputEnabledMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `window.location.pathname.includes('/launch/fortnite/') && (e = false);`;

        str = str.replace(text, text + newCode);
        return str;
    },

    disableTakRenderer(str: string) {
        let text = 'const{TakRenderer:';
        if (!str.includes(text)) {
            return false;
        }

        let autoOffCode = '';
        if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.OFF) {
            autoOffCode = 'return;';
        } else if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_AUTO_OFF)) {
            autoOffCode = `
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
${autoOffCode}

const titleInfo = window.BX_EXPOSED.getTitleInfo();
if (titleInfo && !titleInfo.details.hasTouchSupport && !titleInfo.details.hasFakeTouchSupport) {
    return;
}
`;

        str = str.replace(text, newCode + text);
        return str;
    },

    streamCombineSources(str: string) {
        let text = 'this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'this.useCombinedAudioVideoStream=true');
        return str;
    },

    patchStreamHud(str: string) {
        let index = str.indexOf('({onCollapse:');
        if (index < 0) {
            return false;
        }

        try {
            const params = PatcherUtils.findAndParseParams(str, index, 1000);
            if (!params) {
                return false;
            }

            const canShowTakHUDVar = PatcherUtils.getVariableNameAfter(str, PatcherUtils.indexOf(str, 'canShowTakHUD', index, 500, true) + 1);
            const guideUIVar = PatcherUtils.getVariableNameAfter(str, PatcherUtils.indexOf(str, 'guideUI', index, 500, true) + 1);
            const onShowStreamMenuVar = PatcherUtils.getVariableNameAfter(str, PatcherUtils.indexOf(str, 'onShowStreamMenu', index, 500, true) + 1);
            const offsetVar = PatcherUtils.getVariableNameAfter(str, PatcherUtils.indexOf(str, 'offset', index, 500, true) + 1);

            let newCode = renderString(codeStreamHud, {
                guideUI: guideUIVar,
                onShowStreamMenu: onShowStreamMenuVar,
                offset: offsetVar,
            });

            // Remove the TAK Edit button when the touch controller is disabled
            if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.OFF) {
                newCode += `${canShowTakHUDVar} = false;`;
            }

            const bracketIndex = PatcherUtils.indexOf(str, '}){', index, 500, true);
            str = PatcherUtils.insertAt(str, bracketIndex, newCode);
            return str;

        } catch (e) {
            return false;
        }
    },

    broadcastPollingMode(str: string) {
        let text = '.setPollingMode=e=>{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
window.BX_STREAM_SETTINGS.xCloudPollingMode = e.toLowerCase();
BxEvent.dispatch(window, BxEvent.XCLOUD_POLLING_MODE_CHANGED);
`;
        str = str.replace(text, text + newCode);
        return str;
    },

    patchGamepadPolling(str: string) {
        let index = str.indexOf('.shouldHandleGamepadInput)())return void');
        if (index < 0) {
            return false;
        }

        index = str.indexOf('{', index - 20) + 1;
        str = str.substring(0, index) + 'if (window.BX_EXPOSED.disableGamepadPolling) return;' + str.substring(index);
        return str;
    },

    patchXcloudTitleInfo(str: string) {
        let text = 'async cloudConnect';
        let index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        // Find the next "{" backet
        let backetIndex = str.indexOf('{', index);

        // Get param name
        const params = str.substring(index, backetIndex).match(/\(([^)]+)\)/)![1];
        if (!params) {
            return false;
        }

        const titleInfoVar = params.split(',')[0];

        const newCode = `
${titleInfoVar} = window.BX_EXPOSED.modifyTitleInfo(${titleInfoVar});
BxLogger.info('patchXcloudTitleInfo', ${titleInfoVar});
`;
        str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1);
        return str;
    },

    patchRemotePlayMkb(str: string) {
        let text = 'async homeConsoleConnect';
        let index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        // Find the next "{" backet
        let backetIndex = str.indexOf('{', index);

        // Get param name
        const params = str.substring(index, backetIndex).match(/\(([^)]+)\)/)![1];
        if (!params) {
            return false;
        }

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
        let text = '.srcObject=this.audioMediaStream,';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `window.BX_EXPOSED.setupGainNode(arguments[1], this.audioMediaStream),`;

        str = str.replace(text, text + newCode);
        return str;
    },

    patchCombinedAudioVideoMediaStream(str: string) {
        let text = '.srcObject=this.combinedAudioVideoStream';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `,window.BX_EXPOSED.setupGainNode(arguments[0], this.combinedAudioVideoStream)`;
        str = str.replace(text, text + newCode);
        return str;
    },

    patchTouchControlDefaultOpacity(str: string) {
        let text = 'opacityMultiplier:1';
        if (!str.includes(text)) {
            return false;
        }

        const opacity = (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_DEFAULT_OPACITY) / 100).toFixed(1);
        const newCode = `opacityMultiplier: ${opacity}`;
        str = str.replace(text, newCode);
        return str;
    },

    patchShowSensorControls(str: string) {
        let text = ',{shouldShowSensorControls:';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `,{shouldShowSensorControls: (window.BX_EXPOSED && window.BX_EXPOSED.shouldShowSensorControls) ||`;

        str = str.replace(text, newCode);
        return str;
    },

    /*
    exposeEventTarget(str: string) {
        let text ='this._eventTarget=new EventTarget';
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
        let text =',this._connectionType=';
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
        let index = str.indexOf('}shouldTransitionToFeedback(');
        index >= 0 && (index = PatcherUtils.indexOf(str, '}){', index, 200, true));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'return !1;');
        return str;
    },

    enableNativeMkb(str: string) {
        // l = t.mouseSupported && t.keyboardSupported && t.fullscreenSupported;
        let index = str.indexOf('.mouseSupported&&');
        if (index < 0) {
            return false;
        }

        // Get the variable name "t"
        const varName = str.charAt(index - 1);
        // Find the full text
        let text = `${varName}.mouseSupported&&${varName}.keyboardSupported&&${varName}.fullscreenSupported;`;
        if ((!str.includes(text))) {
            return false;
        }

        str = str.replace(text, text + 'return true;');
        return str;
    },

    patchMouseAndKeyboardEnabled(str: string) {
        let text = 'get mouseAndKeyboardEnabled(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return true;');
        return str;
    },

    exposeInputChannelV1(str: string) {
        let text = '()(this,"flushData",(';
        if (!str.includes(text)) {
            return false;
        }

        // ChannelProtocolV1
        str = str.replace(text, '()(window.BX_EXPOSED.inputChannel = this, "flushData", (');
        return str;
    },

    exposeInputChannelV2(str: string) {
        let text = '()(this,"reliableChannel",void';
        if (!str.includes(text)) {
            return false;
        }

        // ChannelProtocolV2
        str = str.replace(text, '()(window.BX_EXPOSED.inputChannel = this, "reliableChannel",void');
        return str;
    },

    disableNativeRequestPointerLock(str: string) {
        let text = 'async requestPointerLock(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return;');
        return str;
    },

    // Fix crashing when RequestInfo.origin is empty
    patchRequestInfoCrash(str: string) {
        let text = 'if(!e)throw new Error("RequestInfo.origin is falsy");';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'if (!e) e = "https://www.xbox.com";');
        return str;
    },

    /**
     * Expose dialogRoutes, patch getIsAnyDialogOpen()
     * to make it dispatch "dialog.shown" and "dialog.dismissed" events
     */
    exposeDialogRoutes(str: string) {
        /*
        getIsAnyDialogOpen: function() {
            const t = l();
            return e.length > 1 || t.index > 0
        },
        */
        let index = str.indexOf('return{goBack:function(){');
        const firstIndex = index;

        (index >= 0) && (index = PatcherUtils.indexOf(str, 'getIsAnyDialogOpen', index, 2000));
        // Find "return" statement
        (index >= 0) && (index = PatcherUtils.indexOf(str, 'return ', index, 300));
        if (index < 0) {
            return false;
        }

        // Check return value and dispatch events
        const endBracketIndex = PatcherUtils.indexOf(str, '}', index, 50);
        const oldCode = str.substring(index, endBracketIndex);
        let newCode = str.substring(index, endBracketIndex).replace('return', 'const result=') + ';';
        newCode += 'window.BxEventBus.Script.emit(result ? "dialog.shown" : "dialog.dismissed", {});'
        newCode += 'return result;'
        str = PatcherUtils.replaceWith(str, index, oldCode, newCode);

        // Expose dialogRoutes
        str = PatcherUtils.insertAt(str, firstIndex + 6, ' window.BX_EXPOSED.dialogRoutes = ');
        return str;
    },

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
        index = str.indexOf(`const ${funcName}=({children`);
        index > -1 && (index = PatcherUtils.indexOf(str, 'return ', 300));
        index > -1 && (index = PatcherUtils.indexOf(str, '?', 100));

        if (index < 0) {
            return false;
        }

        str = str.substring(0, index) + '|| true' + str.substring(index);
        return str;
    },

    // Don't render News section
    ignoreNewsSection(str: string) {
        let index = str.indexOf('("CarouselRow"))');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'const ', index, 200));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'return null;');
        return str;
    },

    // Don't render "Play With Friends" sections
    ignorePlayWithFriendsSection(str: string) {
        let index = str.indexOf('location:"PlayWithFriendsRow",');
        if (index < 0) {
            return false;
        }

        index = PatcherUtils.lastIndexOf(str, '=>', index, 50);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, '=>', '=> true ? null :');
        return str;
    },

    // Don't render "All Games" sections
    ignoreAllGamesSection(str: string) {
        let index = str.indexOf('className:"AllGamesRow-module__allGamesRowContainer');
        index > -1 && (index = PatcherUtils.indexOf(str, 'grid:!0,', index, 1500));
        index > -1 && (index = PatcherUtils.lastIndexOf(str, '(0,', index, 70));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'true ? null :');
        return str;
    },

    ignoreByogSection(str: string) {
        let index = str.indexOf('"ShowcaseRow-module__container');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, ')=>(', index, 200));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index + 3, 'null && ');
        return str;
    },

    // home-page.js
    ignorePlayWithTouchSection(str: string) {
        let index = str.indexOf('("Play_With_Touch"),');
        if (index < 0) {
            return false;
        }

        index = PatcherUtils.lastIndexOf(str, 'const ', index, 30);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'return null;');
        return str;
    },

    // home-page.js
    ignoreSiglSections(str: string) {
        let index = str.indexOf('SiglRow requires either id');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, '})=>{', index, 300, true));
        if (index < 0) {
            return false;
        }

        const params = PatcherUtils.findAndParseParams(str, PatcherUtils.lastIndexOf(str, 'const', index, 1000), 1000);
        if (!params || !params.id) {
            return false;
        }

        const PREF_HIDE_SECTIONS = getGlobalPref(GlobalPref.UI_HIDE_SECTIONS);
        const siglIds: GamePassCloudGallery[] = [];

        const sections: PartialRecord<UiSection, GamePassCloudGallery> = {
            [UiSection.NATIVE_MKB]: GamePassCloudGallery.NATIVE_MKB,
            [UiSection.MOST_POPULAR]: GamePassCloudGallery.MOST_POPULAR,
            [UiSection.LEAVING_SOON]: GamePassCloudGallery.LEAVING_SOON,
            [UiSection.RECENTLY_ADDED]: GamePassCloudGallery.RECENTLY_ADDED,
        };

        for (const section of PREF_HIDE_SECTIONS) {
            const galleryId = sections[section];
            galleryId && siglIds.push(galleryId);
        };

        const checkSyntax = siglIds.map(item => `${params.id} === "${item}"`).join(' || ');
        const newCode = `if (${params.id} && (${checkSyntax})) return null;`;

        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    ignoreGenresSection(str: string) {
        let index = str.indexOf('="GenresRow"');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, '{', index));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index + 1, 'return null;');
        return str;
    },

    // Override Storage.getSettings()
    overrideStorageGetSettings(str: string) {
        let text = '}getSetting(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
// console.log('setting', this.baseStorageKey, e);
if (this.baseStorageKey in window.BX_EXPOSED.overrideSettings) {
    const settings = window.BX_EXPOSED.overrideSettings[this.baseStorageKey];
    if (e in settings) {
        return settings[e];
    }
}
`;
        str = str.replace(text, text + newCode);
        return str;
    },

    // game-stream.js   24.16.4
    alwaysShowStreamHud(str: string) {
        let index = str.indexOf(',{onShowStreamMenu:');
        if (index < 0) {
            return false;
        }

        index = str.indexOf('&&(0,', index - 100);
        if (index < 0) {
            return false;
        }

        const commaIndex = str.indexOf(',', index - 10);
        str = str.substring(0, commaIndex) + ',true' + str.substring(index);
        return str;
    },

    // 49851.js#4083, 27.0.4
    patchSetCurrentFocus(str: string) {
        let index = str.indexOf('.setCurrentFocus=(');
        if (index < 0) {
            return false;
        }

        index = str.indexOf('{', index) + 1;
        str = PatcherUtils.insertAt(str, index, 'e && BxEvent.dispatch(window, BxEvent.NAVIGATION_FOCUS_CHANGED, { element: e });');
        return str;
    },

    detectProductDetailPage(str: string) {
        let index = str.indexOf('{location:"ProductDetailPage",');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 200));

        if (index < 0) {
            return false;
        }

        str = str.substring(0, index) + 'BxEvent.dispatch(window, BxEvent.XCLOUD_RENDERING_COMPONENT, { component: "product-detail" });' + str.substring(index);
        return str;
    },

    detectBrowserRouterReady(str: string) {
        let index = str.indexOf('{history:this.history,');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 100));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'window.BxEvent.dispatch(window, window.BxEvent.XCLOUD_ROUTER_HISTORY_READY, {history: this.history});');
        return str;
    },

    // Set Achievements list's filter default to "Locked"
    guideAchievementsDefaultLocked(str: string) {
        let index = str.indexOf('FilterButton-module__container');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, '"All"', index, 150));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, '"All"', '"Locked"');

        index = str.indexOf('"Guide_Achievements_Unlocked_Empty","Guide_Achievements_Locked_Empty"');
        index >= 0 && (index = PatcherUtils.indexOf(str, '"All"', index, 250));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, '"All"', '"Locked"');
        return str;
    },

    // Disable long touch activating context menu
    disableTouchContextMenu(str: string) {
        let index = str.indexOf('.addEventListener("touchstart",');
        index >= 0 && (index = PatcherUtils.indexOf(str, '.addEventListener("touchend"', index, 200));
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, 'return ', index, 50));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, 'return', 'return () => {};');
        return str;
    },

    modifyPreloadedState(str: string) {
        let text = '=window.__PRELOADED_STATE__;';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, '=window.BX_EXPOSED.modifyPreloadedState(window.__PRELOADED_STATE__);');
        return str;
    },

    homePageBeforeLoad(str: string) {
        return PatcherUtils.patchBeforePageLoad(str, 'home');
    },

    streamPageBeforeLoad(str: string) {
        return PatcherUtils.patchBeforePageLoad(str, 'stream');
    },

    remotePlayStreamPageBeforeLoad(str: string) {
        return PatcherUtils.patchBeforePageLoad(str, 'remote-play-stream');
    },

    disableAbsoluteMouse(str: string) {
        let text = 'sendAbsoluteMouseCapableMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return;');
        return str;
    },

    changeNotificationsSubscription(str: string) {
        let text = ';buildSubscriptionQueryParamsForNotifications(';
        let index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        index += text.length;
        // Get parameter name
        const subsVar = str[index];

        // Find index after {
        index = str.indexOf('{', index) + 1;
        const blockFeatures = getGlobalPref(GlobalPref.BLOCK_FEATURES);
        const filters = [];
        if (blockFeatures.includes(BlockFeature.NOTIFICATIONS_INVITES)) {
            filters.push('GameInvite', 'PartyInvite');
        }

        if (blockFeatures.includes(BlockFeature.FRIENDS)) {
            filters.push('Follower');
        }

        if (blockFeatures.includes(BlockFeature.NOTIFICATIONS_ACHIEVEMENTS)) {
            filters.push('AchievementUnlock');
        }

        const newCode = `
let subs = ${subsVar};
subs = subs.filter(val => !${JSON.stringify(filters)}.includes(val));
${subsVar} = subs;
`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    exposeReactCreateComponent(str: string) {
        let index = str.indexOf('.prototype.isReactComponent={}');

        index > -1 && (index = PatcherUtils.indexOf(str, '.createElement=', index));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index - 1, 'window.BX_EXPOSED.reactCreateElement=');

        index = PatcherUtils.indexOf(str, '.useEffect=', index);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index - 1, 'window.BX_EXPOSED.reactUseEffect=');
        return str;
    },

    // 27.0.6-hotfix.1, 73704.js
    gameCardCustomIcons(str: string) {
        let initialIndex = str.indexOf('const{supportedInputIcons:');
        if (initialIndex < 0) {
            return false;
        }

        const returnIndex = PatcherUtils.lastIndexOf(str, 'return ', str.indexOf('SupportedInputsBadge'));
        if (returnIndex < 0) {
            return false;
        }

        // Find function's parameter
        const productIdIndex = PatcherUtils.lastIndexOf(str, ',productId:', initialIndex, 300);
        if (productIdIndex < 0) {
            return false;
        }

        const params = PatcherUtils.findAndParseParams(str, productIdIndex - 200, 400);
        if (!params || !params.productId) {
            return false;
        }

        const productIdVar = params.productId;

        // Find supportedInputIcons and title var names
        const supportedInputIconsVar = PatcherUtils.getVariableNameAfter(str, PatcherUtils.indexOf(str, 'supportedInputIcons:', initialIndex, 100, true));
        if (!supportedInputIconsVar) {
            return false;
        }

        const newCode = renderString(codeGameCardIcons, {
            productId: productIdVar,
            supportedInputIcons: supportedInputIconsVar,
        });

        str = PatcherUtils.insertAt(str, returnIndex, newCode);
        return str;
    },

    /*
    // 27.0.6-hotfix.1, 28444.js
    gameCardPassTitle(str: string) {
        // Pass gameTitle info to gameCardCustomIcons()
        let index = str.indexOf('=["productId","showInputBadges","ownershipBadgeType"');
        index > -1 && (index = PatcherUtils.indexOf(str, ',gameTitle:', index, 500, true));
        if (index < 0) {
            return false;
        }

        const gameTitleVar = PatcherUtils.getVariableNameAfter(str, index);
        if (!gameTitleVar) {
            return false;
        }

        index = PatcherUtils.indexOf(str, 'return', index);
        index = PatcherUtils.indexOf(str, 'productId:', index);
        if (index < 0) {
            return false;
        }

        const newCode = `gameTitle: ${gameTitleVar},`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },
    */

    // 27.0.6-hotfix.1, 78831.js
    setImageQuality(str: string) {
        let index = str.indexOf('const{size:{width:');
        index > -1 && (index = PatcherUtils.indexOf(str, '=new URLSearchParams', index, 500));
        if (index < 0) {
            return false;
        }

        const paramVar = PatcherUtils.getVariableNameBefore(str, index);
        if (!paramVar) {
            return false;
        }

        // Find "return" keyword
        index = PatcherUtils.indexOf(str, 'return', index, 200);

        const newCode = `${paramVar}.set('q', ${getGlobalPref(GlobalPref.UI_IMAGE_QUALITY)});`;
        str = PatcherUtils.insertAt(str, index, newCode);

        return str;
    },

    setBackgroundImageQuality(str: string) {
        let index = str.indexOf('}?w=${');
        index > -1 && (index = PatcherUtils.indexOf(str, '}', index + 1, 10, true));

        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, `&q=${getGlobalPref(GlobalPref.UI_IMAGE_QUALITY)}`);
        return str;
    },

    injectHeaderUseEffect(str: string) {
        let index = str.indexOf('className:"Header-module__header');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 300));
        if (index < 0) {
            return false;
        }

        return PatcherUtils.injectUseEffect(str, index, 'Script', 'ui.header.rendered');
    },

    injectErrorPageUseEffect(str: string) {
        let index = str.indexOf('"PureErrorPage-module__container');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, '})=>(0,', index, 200));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index + 4, '{return ');
        str = PatcherUtils.injectUseEffect(str, index + 5, 'Script', 'ui.error.rendered');
        str += '}';
        return str;
    },

    injectStreamMenuUseEffect(str: string) {
        let index = str.indexOf('"StreamMenu-module__container');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 200));
        if (index < 0) {
            return false;
        }

        return PatcherUtils.injectUseEffect(str, index, 'Stream', 'ui.streamMenu.rendered');
    },

    injectGuideHomeUseEffect(str: string) {
        let index = str.indexOf('"HomeLandingPage-module__authenticatedContentContainer');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 200));
        if (index < 0) {
            return false;
        }

        return PatcherUtils.injectUseEffect(str, index, 'Script', 'ui.guideHome.rendered');
    },

    injectCreatePortal(str: string) {
        let index = str.indexOf('.createPortal=function');
        index > -1 && (index = PatcherUtils.indexOf(str, '{', index, 50, true));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, codeCreatePortal);
        return str;
    },

    injectAchievementsProgressUseEffect(str: string) {
        let index = str.indexOf('"AchievementsButton-module__progressBarContainer');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 200));
        if (index < 0) {
            return false;
        }

        return PatcherUtils.injectUseEffect(str, index, 'Script', 'ui.guideAchievementProgress.rendered');
    },

    injectAchievementsDetailUseEffect(str: string) {
        let index = str.indexOf('GuideAchievementDetail.useParams()');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'const', index, 200));
        if (index < 0) {
            return false;
        }

        return PatcherUtils.injectUseEffect(str, index, 'Script', 'ui.guideAchievementDetail.rendered');
    },

    patchCustomInputIcon(str: string) {
        let index = str.indexOf('.MouseAndKeyboard="MouseAndKeyboard"');
        if (index < 0) {
            return false;
        }

        // Get productId
        const productIdMatch = /const (\w+)=(\w+)=>{/.exec(str.substring(index, index + 200));
        if (!productIdMatch) {
            return false;
        }

        // Define productId variable
        str = str.replace(productIdMatch[0], productIdMatch[0] + `const productId = ${productIdMatch[2]};`);

        let match = /(\w+)&&(\w+\.push\(\w+\.Touch\))/.exec(str);
        if (!match) {
            return false;
        }

        str = str.replace(match[0], `(${match[1]} || window.BX_EXPOSED.hasCustomTouchControl(productId)) && ${match[2]}`);

        match = /(\w+)&&(\w+\.push\(\w+\.MouseAndKeyboard\))/.exec(str);
        if (match) {
            str = str.replace(match[0], `(${match[1]} || window.BX_EXPOSED.hasCustomNativeMkb(productId)) && ${match[2]}`);
        }

        return str;
    },

    /**
     * Modify "metadataToSend" value, prevent dropping resolution when Decode Time is high
     * https://github.com/redphx/better-xcloud/issues/791
     */
    patchStreamMetadata(str: string) {
        let index = str.indexOf('}onVideoFrame(');
        (index >= 0) && (index = PatcherUtils.indexOf(str, '){', index, 30, true));
        if (index < 0) {
            return false;
        }

        const maxDt = 10;
        const code = `
try {
    const obj = arguments[0];
    if (true || obj.frameDecodedTimeMs - obj.frameSubmittedTimeMs > ${maxDt}) {
        const baseMs = obj.frameSubmittedTimeMs;
        const renderMs = obj.frameRenderedTimeMs - obj.frameDecodedTimeMs;
        obj.frameDecodedTimeMs = baseMs + ${maxDt};
        obj.frameRenderedTimeMs = obj.frameDecodedTimeMs + renderMs;
        obj.expectedDisplayTime = obj.frameRenderedTimeMs;
        arguments[0] = obj;
    }
} catch (e) { alert(e) }
`;
        str = PatcherUtils.insertAt(str, index, code);
        return str;
    },

    /**
     * Disable pausing the stream when the window loses focus
     */
    disablePauseOnWindowBlur(str: string) {
        let index = str.indexOf('},this.onFocusChanged=');
        (index >= 0) && (index = PatcherUtils.indexOf(str, '=>{', index, 30));
        if (index < 0) {
            return false;
        }

        const varName = PatcherUtils.getVariableNameBefore(str, index);
        if (!varName) {
            return false;
        }

        // Set varName to "focus"
        str = PatcherUtils.insertAt(str, index + 3, `try { ${varName} = "focus"; } catch (xxx) {}`);
        return str;
    },

    /*
    patchBasicGameInfo(str: string) {
        let index = str.indexOf('.ChildXboxTitleIds,offerings');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return{', index, 1000));
        if (index < 0) {
            return false;
        }

        const varName = PatcherUtils.getVariableNameBefore(str, PatcherUtils.lastIndexOf(str, '=>{', index));
        if (!varName) {
            return false;
        }

        const newCode = `
const info = ${varName};
if (info.ProductTitle.includes('Xbox One')) {
    return {};
}
`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },
    */
} as const satisfies { [key: string]: PatchFunction };

let PATCH_ORDERS = PatcherUtils.filterPatches([
    ...(AppInterface && getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON ? [
        'enableNativeMkb',
        'disableAbsoluteMouse',
    ] : []) as PatchArray,

    'exposeReactCreateComponent',

    'injectCreatePortal',

    'broadcastPollingMode',

    getGlobalPref(GlobalPref.UI_GAME_CARD_SHOW_WAIT_TIME) && 'patchSetCurrentFocus',

    'patchGamepadPolling',

    'modifyPreloadedState',

    'detectBrowserRouterReady',

    'exposeStreamSession',
    'supportLocalCoOp',

    'disableStreamGate',

    'exposeDialogRoutes',

    ...(getGlobalPref(GlobalPref.UI_IMAGE_QUALITY) < 90 ? [
        'setImageQuality',
    ] : []) as PatchArray,

    'patchRequestInfoCrash',

    'injectErrorPageUseEffect',

    'streamPageBeforeLoad',
    'remotePlayStreamPageBeforeLoad',

    'injectGuideHomeUseEffect',
    'injectAchievementsProgressUseEffect',
    'injectAchievementsDetailUseEffect',
    'guideAchievementsDefaultLocked',

    'injectHeaderUseEffect',

    'homePageBeforeLoad',

    'patchCustomInputIcon',

    'gameCardCustomIcons',
    // 'gameCardPassTitle',

    'enableTvRoutes',

    'overrideStorageGetSettings',

    'detectProductDetailPage',

    getGlobalPref(GlobalPref.UI_LAYOUT) !== UiLayout.DEFAULT && 'websiteLayout',
    getGlobalPref(GlobalPref.GAME_FORTNITE_FORCE_CONSOLE) && 'forceFortniteConsole',

    ...(STATES.userAgent.capabilities.touch ? [
        'disableTouchContextMenu',
    ] : []) as PatchArray,

    ...(getGlobalPref(GlobalPref.BLOCK_TRACKING) ? [
        'disableAiTrack',
        // 'disableTelemetry',

        'blockWebRtcStatsCollector',
        'disableIndexDbLogging',

        'disableTelemetryProvider',
    ] : []) as PatchArray,

    ...(!getGlobalPref(GlobalPref.BLOCK_FEATURES).includes(BlockFeature.REMOTE_PLAY) ? [
        'remotePlayKeepAlive',
        'remotePlayDisableAchievementToast',
        STATES.userAgent.capabilities.touch && 'patchUpdateInputConfigurationAsync',
    ] : []) as PatchArray,

    ...(BX_FLAGS.EnableXcloudLogging ? [
        'enableConsoleLogging',
        'enableXcloudLogger',
    ] : []) as PatchArray,
]);

const hideSections = getGlobalPref(GlobalPref.UI_HIDE_SECTIONS);
let HOME_PAGE_PATCH_ORDERS = PatcherUtils.filterPatches([
    hideSections.includes(UiSection.GENRES) && 'ignoreGenresSection',
    hideSections.includes(UiSection.BOYG) && 'ignoreByogSection',

    STATES.browser.capabilities.touch && hideSections.includes(UiSection.TOUCH) && 'ignorePlayWithTouchSection',

    getGlobalPref(GlobalPref.UI_IMAGE_QUALITY) < 90 && 'setBackgroundImageQuality',

    hideSections.some(value => [UiSection.NATIVE_MKB, UiSection.MOST_POPULAR].includes(value)) && 'ignoreSiglSections',

    hideSections.includes(UiSection.NEWS) && 'ignoreNewsSection',
    (getGlobalPref(GlobalPref.BLOCK_FEATURES).includes(BlockFeature.FRIENDS) || hideSections.includes(UiSection.FRIENDS)) && 'ignorePlayWithFriendsSection',
    hideSections.includes(UiSection.ALL_GAMES) && 'ignoreAllGamesSection',

    ...(blockSomeNotifications() ? [
        'changeNotificationsSubscription',
    ] : []) as PatchArray,
]);

// Only when playing
let STREAM_PAGE_PATCH_ORDERS = PatcherUtils.filterPatches([
    'exposeInputChannelV1',
    'exposeInputChannelV2',

    'patchXcloudTitleInfo',
    'disableGamepadDisconnectedScreen',
    'patchStreamHud',
    'playVibration',

    'alwaysShowStreamHud',

    'injectStreamMenuUseEffect',
    'disablePauseOnWindowBlur',

    getGlobalPref(GlobalPref.STREAM_PREVENT_RESOLUTION_DROPS) && 'patchStreamMetadata',

    // 'exposeEventTarget',

    // Patch volume control for normal stream
    getGlobalPref(GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED) && !getGlobalPref(GlobalPref.STREAM_COMBINE_SOURCES) && 'patchAudioMediaStream',
    // Patch volume control for combined audio+video stream
    getGlobalPref(GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED) && getGlobalPref(GlobalPref.STREAM_COMBINE_SOURCES) && 'patchCombinedAudioVideoMediaStream',

    // Skip feedback dialog
    getGlobalPref(GlobalPref.UI_DISABLE_FEEDBACK_DIALOG) && 'skipFeedbackDialog',

    ...(STATES.userAgent.capabilities.touch ? [
        getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.ALL && 'patchShowSensorControls',
        getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.ALL && 'exposeTouchLayoutManager',
        (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.OFF || getGlobalPref(GlobalPref.TOUCH_CONTROLLER_AUTO_OFF)) && 'disableTakRenderer',
        getGlobalPref(GlobalPref.TOUCH_CONTROLLER_DEFAULT_OPACITY) !== 100 && 'patchTouchControlDefaultOpacity',
        (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) !== TouchControllerMode.OFF && (getGlobalPref(GlobalPref.MKB_ENABLED) || getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON)) && 'patchBabylonRendererClass',
    ] : []) as PatchArray,

    'patchPollGamepads',

    getGlobalPref(GlobalPref.STREAM_COMBINE_SOURCES) && 'streamCombineSources',

    ...(!getGlobalPref(GlobalPref.BLOCK_FEATURES).includes(BlockFeature.REMOTE_PLAY) ? [
        'remotePlayPostStreamRedirectUrl',
        'patchRemotePlayMkb',
    ] : []) as PatchArray,

    // Native MKB
    ...(AppInterface && getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON ? [
        'patchMouseAndKeyboardEnabled',
        'disableNativeRequestPointerLock',
    ] : []) as PatchArray,
]);

const ALL_PATCHES = [...PATCH_ORDERS, ...HOME_PAGE_PATCH_ORDERS, ...STREAM_PAGE_PATCH_ORDERS];

export class Patcher {
    private static remainingPatches: { [key in PatchPage]: PatchArray } = {
        home: HOME_PAGE_PATCH_ORDERS,
        stream: STREAM_PAGE_PATCH_ORDERS,
        'remote-play-stream': STREAM_PAGE_PATCH_ORDERS,
    };

    static patchPage(page: PatchPage) {
        const remaining = Patcher.remainingPatches[page];
        if (!remaining) {
            return;
        }

        PATCH_ORDERS = PATCH_ORDERS.concat(remaining);
        delete Patcher.remainingPatches[page];
    }

    private static patchNativeBind() {
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

            if (typeof arguments[1] === 'function') {
                BxLogger.info(LOG_TAG, 'Restored Function.prototype.bind()');
                Function.prototype.bind = nativeBind;
            }

            const orgFunc = this;
            const newFunc = (a: any, item: any) => {
                Patcher.checkChunks(item);
                orgFunc(a, item);
            }

            // @ts-ignore
            return nativeBind.apply(newFunc, arguments);
        };
    }

    static checkChunks(item: [[number], { [key: string]: () => {} }]) {
        // !!! Use "caches" as variable name will break touch controller???
        // console.log('patch', '-----');
        let patchesToCheck: PatchArray;
        let appliedPatches: PatchArray;

        const chunkData = item[1];
        const patchesMap: Record<string, PatchArray> = {};
        const patcherCache = PatcherCache.getInstance();

        for (const chunkId in chunkData) {
            appliedPatches = [];

            const cachedPatches = patcherCache.getPatches(chunkId);
            if (cachedPatches) {
                // clone cachedPatches
                patchesToCheck = cachedPatches.slice(0);
                patchesToCheck.push(...PATCH_ORDERS);
            } else {
                patchesToCheck = PATCH_ORDERS.slice(0);
            }

            // Empty patch list
            if (!patchesToCheck.length) {
                continue;
            }

            const func = chunkData[chunkId];
            const funcStr = func.toString();
            let patchedFuncStr = funcStr;

            let modified = false;
            const chunkAppliedPatches = [];

            for (let patchIndex = 0; patchIndex < patchesToCheck.length; patchIndex++) {
                const patchName = patchesToCheck[patchIndex];
                if (appliedPatches.indexOf(patchName) > -1) {
                    continue;
                }

                if (!PATCHES[patchName]) {
                    continue;
                }

                // Check function against patch
                const tmpStr = PATCHES[patchName].call(null, patchedFuncStr);

                // Not patched
                if (!tmpStr) {
                    continue;
                }

                modified = true;
                patchedFuncStr = tmpStr;

                appliedPatches.push(patchName);
                chunkAppliedPatches.push(patchName);

                // Remove patch
                patchesToCheck.splice(patchIndex, 1);
                patchIndex--;
                PATCH_ORDERS = PATCH_ORDERS.filter(item => item != patchName);
            }

            // Apply patched functions
            if (modified) {
                BxLogger.info(LOG_TAG, `✅ [${chunkId}] ${chunkAppliedPatches.join(', ')}`);
                PATCH_ORDERS.length && BxLogger.info(LOG_TAG, 'Remaining patches', PATCH_ORDERS);

                BX_FLAGS.Debug && console.time(LOG_TAG);
                try {
                    chunkData[chunkId] = eval('(function ' + patchedFuncStr.replace(/^\d+/, '') + ')');
                } catch (e: unknown) {
                    if (e instanceof Error) {
                        BxLogger.error(LOG_TAG, 'Error', appliedPatches, e.message, patchedFuncStr);
                    }
                }
                BX_FLAGS.Debug && console.timeEnd(LOG_TAG);
            }

            // Save to cache
            if (appliedPatches.length) {
                patchesMap[chunkId] = appliedPatches;
            }
        }

        if (Object.keys(patchesMap).length) {
            patcherCache.saveToCache(patchesMap);
        }
    }

    static init() {
        Patcher.patchNativeBind();
    }
}

export class PatcherCache {
    private static instance: PatcherCache;
    public static getInstance = () => PatcherCache.instance ?? (PatcherCache.instance = new PatcherCache());

    private readonly KEY_CACHE = StorageKey.PATCHES_CACHE;
    private readonly KEY_SIGNATURE = StorageKey.PATCHES_SIGNATURE;

    private CACHE!: { [key: string]: PatchArray };

    private constructor() {
        this.checkSignature();

        // Read cache from storage
        this.CACHE = JSON.parse(window.localStorage.getItem(this.KEY_CACHE) || '{}');
        BxLogger.info(LOG_TAG, 'Cache', this.CACHE);

        const pathName = window.location.pathname;
        if (pathName.includes('/play/consoles/launch/')) {
            Patcher.patchPage('remote-play-stream');
        } else if (pathName.includes('/play/launch/')) {
            Patcher.patchPage('stream');
        } else if (pathName.endsWith('/play') || pathName.endsWith('/play/')) {
            Patcher.patchPage('home');
        }

        // Remove cached patches from PATCH_ORDERS & PLAYING_PATCH_ORDERS
        PATCH_ORDERS = this.cleanupPatches(PATCH_ORDERS);
        STREAM_PAGE_PATCH_ORDERS = this.cleanupPatches(STREAM_PAGE_PATCH_ORDERS);

        BxLogger.info(LOG_TAG, 'PATCH_ORDERS', PATCH_ORDERS.slice(0));
    }

    /**
     * Get patch's signature
     */
    private getSignature(): string {
        const scriptVersion = SCRIPT_VERSION;
        const patches = JSON.stringify(ALL_PATCHES);

        // Get client.js's hash
        let clientHash = '';
        const $link = document.querySelector<HTMLLinkElement>('link[data-chunk="client"][as="script"][href*="/client."]');
        if ($link) {
            const match = /\/client\.([^\.]+)\.js/.exec($link.href);
            match && (clientHash = match[1]);
        }

        // Get version from <meta>
        // Sometimes this value is missing
        const webVersion = (document.querySelector<HTMLMetaElement>('meta[name=gamepass-app-version]'))?.content ?? '';
        const webVersionDate = (document.querySelector<HTMLMetaElement>('meta[name=gamepass-app-date]'))?.content ?? '';

        // Calculate signature
        const sig = `${scriptVersion}:${clientHash}:${webVersion}:${webVersionDate}:${hashCode(patches)}`;
        return sig;
    }

    clear() {
        // Clear cache
        window.localStorage.removeItem(this.KEY_CACHE);
        this.CACHE = {};
    }

    private checkSignature() {
        const storedSig = window.localStorage.getItem(this.KEY_SIGNATURE) || 0;
        const currentSig = this.getSignature();

        if (currentSig !== storedSig) {
            // Save new signature
            BxLogger.warning(LOG_TAG, 'Signature changed');
            window.localStorage.setItem(this.KEY_SIGNATURE, currentSig.toString());

            this.clear();
        } else {
            BxLogger.info(LOG_TAG, 'Signature unchanged');
        }
    }

    private cleanupPatches(patches: PatchArray): PatchArray {
        return patches.filter(item => {
            for (const id in this.CACHE) {
                const cached = this.CACHE[id];

                if (cached.includes(item)) {
                    return false;
                }
            }

            return true;
        });
    }

    getPatches(id: string): PatchArray {
        return this.CACHE[id];
    }

    saveToCache(subCache: Record<string, PatchArray>) {
        for (const id in subCache) {
            const patchNames = subCache[id];

            let data = this.CACHE[id];
            if (!data) {
                this.CACHE[id] = patchNames;
            } else {
                for (const patchName of patchNames) {
                    if (!data.includes(patchName)) {
                        data.push(patchName);
                    }
                }
            }
        }

        // Save to storage
        window.localStorage.setItem(this.KEY_CACHE, JSON.stringify(this.CACHE));
    }
}
