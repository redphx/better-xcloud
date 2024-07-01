import { BxEvent } from "@utils/bx-event";
import { BX_FLAGS, NATIVE_FETCH } from "@utils/bx-flags";
import { LoadingScreen } from "@modules/loading-screen";
import { PrefKey, getPref } from "@utils/preferences";
import { RemotePlay } from "@modules/remote-play";
import { StreamBadges } from "@modules/stream/stream-badges";
import { TouchController } from "@modules/touch-controller";
import { STATES } from "@utils/global";
import { getPreferredServerRegion } from "@utils/region";
import { GamePassCloudGallery } from "../enums/game-pass-gallery";
import { InputType } from "./bx-exposed";
import { FeatureGates } from "./feature-gates";

enum RequestType {
    XCLOUD = 'xcloud',
    XHOME = 'xhome',
};

function clearApplicationInsightsBuffers() {
    window.sessionStorage.removeItem('AI_buffer');
    window.sessionStorage.removeItem('AI_sentBuffer');
}

function clearDbLogs(dbName: string, table: string) {
    const request = window.indexedDB.open(dbName);
    request.onsuccess = e => {
        const db = (e.target as any).result;

        try {
            const objectStore = db.transaction(table, 'readwrite').objectStore(table);
            const objectStoreRequest = objectStore.clear();

            objectStoreRequest.onsuccess = function() {
                console.log(`[Better xCloud] Cleared ${dbName}.${table}`);
            };
        } catch (ex) {}
    }
}

function clearAllLogs() {
    clearApplicationInsightsBuffers();
    clearDbLogs('StreamClientLogHandler', 'logs');
    clearDbLogs('XCloudAppLogs', 'logs');
}

function updateIceCandidates(candidates: any, options: any) {
    const pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<port>\d+) (?<the_rest>.*)/);

    const lst = [];
    for (let item of candidates) {
        if (item.candidate == 'a=end-of-candidates') {
            continue;
        }

        const groups: {[index: string]: string | number} = pattern.exec(item.candidate)!.groups!;
        lst.push(groups);
    }

    if (options.preferIpv6Server) {
        lst.sort((a, b) => {
            const firstIp = a.ip as string;
            const secondIp = b.ip as string;

            return (!firstIp.includes(':') && secondIp.includes(':')) ? 1 : -1;
        });
    }

    const newCandidates = [];
    let foundation = 1;

    const newCandidate = (candidate: string) => {
        return {
            'candidate': candidate,
            'messageType': 'iceCandidate',
            'sdpMLineIndex': '0',
            'sdpMid': '0',
        };
    };

    lst.forEach(item => {
        item.foundation = foundation;
        item.priority = (foundation == 1) ? 2130706431 : 1;

        newCandidates.push(newCandidate(`a=candidate:${item.foundation} 1 UDP ${item.priority} ${item.ip} ${item.port} ${item.the_rest}`));
        ++foundation;
    });

    if (options.consoleAddrs) {
        for (const ip in options.consoleAddrs) {
            const port = options.consoleAddrs[ip];

            newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
        }
    }

    newCandidates.push(newCandidate('a=end-of-candidates'));

    console.log(newCandidates);
    return newCandidates;
}


async function patchIceCandidates(request: Request, consoleAddrs?: {[index: string]: number}) {
    const response = await NATIVE_FETCH(request);
    const text = await response.clone().text();

    if (!text.length) {
        return response;
    }

    const options = {
        preferIpv6Server: getPref(PrefKey.PREFER_IPV6_SERVER),
        consoleAddrs: consoleAddrs,
    };

    const obj = JSON.parse(text);
    let exchangeResponse = JSON.parse(obj.exchangeResponse);
    exchangeResponse = updateIceCandidates(exchangeResponse, options)
    obj.exchangeResponse = JSON.stringify(exchangeResponse);

    response.json = () => Promise.resolve(obj);
    response.text = () => Promise.resolve(JSON.stringify(obj));

    return response;
}


class XhomeInterceptor {
    static #consoleAddrs: {[index: string]: number} = {};

    static async #handleLogin(request: Request) {
        try {
            const clone = (request as Request).clone();

            const obj = await clone.json();
            obj.offeringId = 'xhome';

            request = new Request('https://xhome.gssv-play-prod.xboxlive.com/v2/login/user', {
                method: 'POST',
                body: JSON.stringify(obj),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (e) {
            alert(e);
            console.log(e);
        }

        return NATIVE_FETCH(request);
    }

    static async #handleConfiguration(request: Request | URL) {
        const response = await NATIVE_FETCH(request);

        const obj = await response.clone().json()
        console.log(obj);

        const serverDetails = obj.serverDetails;
        if (serverDetails.ipV4Address) {
            XhomeInterceptor.#consoleAddrs[serverDetails.ipV4Address] = serverDetails.ipV4Port;
        }

        if (serverDetails.ipV6Address) {
            XhomeInterceptor.#consoleAddrs[serverDetails.ipV6Address] = serverDetails.ipV6Port;
        }

        response.json = () => Promise.resolve(obj);
        response.text = () => Promise.resolve(JSON.stringify(obj));

        return response;
    }

    static async #handleInputConfigs(request: Request | URL, opts: {[index: string]: any}) {
        const response = await NATIVE_FETCH(request);

        if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== 'all') {
            return response;
        }

        const obj = await response.clone().json() as any;

        const xboxTitleId = JSON.parse(opts.body).titleIds[0];
        STATES.currentStream.xboxTitleId = xboxTitleId;

        const inputConfigs = obj[0];

        let hasTouchSupport = inputConfigs.supportedTabs.length > 0;
        if (!hasTouchSupport) {
            const supportedInputTypes = inputConfigs.supportedInputTypes;
            hasTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH) || supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY);
        }

        if (hasTouchSupport) {
            TouchController.disable();

            BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
                data: null,
            });
        } else {
            TouchController.enable();
            TouchController.getCustomLayouts(xboxTitleId);
        }

        response.json = () => Promise.resolve(obj);
        response.text = () => Promise.resolve(JSON.stringify(obj));

        return response;
    }

    static async #handleTitles(request: Request) {
        const clone = request.clone();

        const headers: {[index: string]: any} = {};
        for (const pair of (clone.headers as any).entries()) {
            headers[pair[0]] = pair[1];
        }
        headers.authorization = `Bearer ${RemotePlay.XCLOUD_TOKEN}`;

        const index = request.url.indexOf('.xboxlive.com');
        request = new Request('https://wus.core.gssv-play-prod' + request.url.substring(index), {
            method: clone.method,
            body: await clone.text(),
            headers: headers,
        });

        return NATIVE_FETCH(request);
    }

    static async #handlePlay(request: RequestInfo | URL) {
        const clone = (request as Request).clone();
        const body = await clone.json();

        // body.settings.useIceConnection = true;

        const newRequest = new Request(request, {
            body: JSON.stringify(body),
        });

        return NATIVE_FETCH(newRequest);
    }

    static async handle(request: Request) {
        TouchController.disable();

        const clone = request.clone();

        const headers: {[index: string]: string} = {};
        for (const pair of (clone.headers as any).entries()) {
            headers[pair[0]] = pair[1];
        }
        // Add xHome token to headers
        headers.authorization = `Bearer ${RemotePlay.XHOME_TOKEN}`;

        // Patch resolution
        const deviceInfo = RemotePlay.BASE_DEVICE_INFO;
        if (getPref(PrefKey.REMOTE_PLAY_RESOLUTION) === '720p') {
            deviceInfo.dev.os.name = 'android';
        }

        headers['x-ms-device-info'] = JSON.stringify(deviceInfo);

        const opts: {[index: string]: any} = {
            method: clone.method,
            headers: headers,
        };

        if (clone.method === 'POST') {
            opts.body = await clone.text();
        }

        let newUrl = request.url;
        if (!newUrl.includes('/servers/home')) {
            const index = request.url.indexOf('.xboxlive.com');
            newUrl = STATES.remotePlay.server + request.url.substring(index + 13);
        }

        request = new Request(newUrl, opts);
        let url = (typeof request === 'string') ? request : request.url;

        // Get console IP
        if (url.includes('/configuration')) {
            return XhomeInterceptor.#handleConfiguration(request);
        } else if (url.endsWith('/sessions/home/play')) {
            return XhomeInterceptor.#handlePlay(request);
        } else if (url.includes('inputconfigs')) {
            return XhomeInterceptor.#handleInputConfigs(request, opts);
        } else if (url.includes('/login/user')) {
            return XhomeInterceptor.#handleLogin(request);
        } else if (url.endsWith('/titles')) {
            return XhomeInterceptor.#handleTitles(request);
        } else if (url && url.endsWith('/ice') && url.includes('/sessions/') && (request as Request).method === 'GET') {
            return patchIceCandidates(request, XhomeInterceptor.#consoleAddrs);
        }

        return await NATIVE_FETCH(request);
    }
}


class XcloudInterceptor {
    static async #handleLogin(request: RequestInfo | URL, init?: RequestInit) {
        const response = await NATIVE_FETCH(request, init);
        const obj = await response.clone().json();

        // Preload Remote Play
        getPref(PrefKey.REMOTE_PLAY_ENABLED) && BX_FLAGS.PreloadRemotePlay && RemotePlay.preload();

        // Store xCloud token
        RemotePlay.XCLOUD_TOKEN = obj.gsToken;

        // Get server list
        const serverEmojis = {
            AustraliaEast: '🇦🇺',
            AustraliaSouthEast: '🇦🇺',
            BrazilSouth: '🇧🇷',
            EastUS: '🇺🇸',
            EastUS2: '🇺🇸',
            JapanEast: '🇯🇵',
            KoreaCentral: '🇰🇷',
            MexicoCentral: '🇲🇽',
            NorthCentralUs: '🇺🇸',
            SouthCentralUS: '🇺🇸',
            UKSouth: '🇬🇧',
            WestEurope: '🇪🇺',
            WestUS: '🇺🇸',
            WestUS2: '🇺🇸',
        };

        const serverRegex = /\/\/(\w+)\./;

        for (let region of obj.offeringSettings.regions) {
            const regionName = region.name as keyof typeof serverEmojis;
            let shortName = region.name;

            let match = serverRegex.exec(region.baseUri);
            if (match) {
                shortName = match[1];
                if (serverEmojis[regionName]) {
                    shortName = serverEmojis[regionName] + ' ' + shortName;
                }
            }

            region.shortName = shortName.toUpperCase();
            STATES.serverRegions[region.name] = Object.assign({}, region);
        }

        BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_READY);

        const preferredRegion = getPreferredServerRegion();
        if (preferredRegion in STATES.serverRegions) {
            const tmp = Object.assign({}, STATES.serverRegions[preferredRegion]);
            tmp.isDefault = true;

            obj.offeringSettings.regions = [tmp];
        }

        response.json = () => Promise.resolve(obj);
        return response;
    }

    static async #handlePlay(request: RequestInfo | URL, init?: RequestInit) {
        const PREF_STREAM_TARGET_RESOLUTION = getPref(PrefKey.STREAM_TARGET_RESOLUTION);
        const PREF_STREAM_PREFERRED_LOCALE = getPref(PrefKey.STREAM_PREFERRED_LOCALE);

        const url = (typeof request === 'string') ? request : (request as Request).url;
        const parsedUrl = new URL(url);

        let badgeRegion: string = parsedUrl.host.split('.', 1)[0];
        for (let regionName in STATES.serverRegions) {
            const region = STATES.serverRegions[regionName];
            if (parsedUrl.origin == region.baseUri) {
                badgeRegion = regionName;
                break;
            }
        }
        StreamBadges.getInstance().setRegion(badgeRegion);

        const clone = (request as Request).clone();
        const body = await clone.json();

        // Force stream's resolution
        if (PREF_STREAM_TARGET_RESOLUTION !== 'auto') {
            const osName = (PREF_STREAM_TARGET_RESOLUTION === '720p') ? 'android' : 'windows';
            body.settings.osName = osName;
        }

        // Override "locale" value
        if (PREF_STREAM_PREFERRED_LOCALE !== 'default') {
            body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
        }

        const newRequest = new Request(request, {
            body: JSON.stringify(body),
        });

        return NATIVE_FETCH(newRequest);
    }

    static async #handleWaitTime(request: RequestInfo | URL, init?: RequestInit) {
        const response = await NATIVE_FETCH(request, init);

        if (getPref(PrefKey.UI_LOADING_SCREEN_WAIT_TIME)) {
            const json = await response.clone().json();
            if (json.estimatedAllocationTimeInSeconds > 0) {
                // Setup wait time overlay
                LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
            }
        }

        return response;
    }

    static async #handleConfiguration(request: RequestInfo | URL, init?: RequestInit) {
        if ((request as Request).method !== 'GET') {
            return NATIVE_FETCH(request, init);
        }

        // Touch controller for all games
        if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all') {
            const titleInfo = STATES.currentStream.titleInfo;
            if (titleInfo?.details.hasTouchSupport) {
                TouchController.disable();
            } else {
                TouchController.enable();
            }
        }

        // Intercept configurations
        const response = await NATIVE_FETCH(request, init);
        const text = await response.clone().text();
        if (!text.length) {
            return response;
        }

        const obj = JSON.parse(text);
        let overrides = JSON.parse(obj.clientStreamingConfigOverrides || '{}') || {};

        overrides.inputConfiguration = overrides.inputConfiguration || {};
        overrides.inputConfiguration.enableVibration = true;

        let overrideMkb: boolean | null = null;

        if (getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' || BX_FLAGS.ForceNativeMkbTitles?.includes(STATES.currentStream.titleInfo!.details.productId)) {
            overrideMkb = true;
        }

        if (getPref(PrefKey.NATIVE_MKB_ENABLED) === 'off') {
            overrideMkb = false;
        }

        if (overrideMkb !== null) {
            overrides.inputConfiguration = Object.assign(overrides.inputConfiguration, {
                enableMouseInput: overrideMkb,
                enableKeyboardInput: overrideMkb,
            });
        }

        // Enable touch controller
        if (TouchController.isEnabled()) {
            overrides.inputConfiguration.enableTouchInput = true;
            overrides.inputConfiguration.maxTouchPoints = 10;
        }

        // Enable mic
        if (getPref(PrefKey.AUDIO_MIC_ON_PLAYING)) {
            overrides.audioConfiguration = overrides.audioConfiguration || {};
            overrides.audioConfiguration.enableMicrophone = true;
        }

        obj.clientStreamingConfigOverrides = JSON.stringify(overrides);

        response.json = () => Promise.resolve(obj);
        response.text = () => Promise.resolve(JSON.stringify(obj));

        return response;
    }

    static async handle(request: RequestInfo | URL, init?: RequestInit) {
        let url = (typeof request === 'string') ? request : (request as Request).url;

        // Server list
        if (url.endsWith('/v2/login/user')) {
            return XcloudInterceptor.#handleLogin(request, init);
        } else if (url.endsWith('/sessions/cloud/play')) {  // Get session
            return XcloudInterceptor.#handlePlay(request, init);
        } else if (url.includes('xboxlive.com') && url.includes('/waittime/')) {
            return XcloudInterceptor.#handleWaitTime(request, init);
        } else if (url.endsWith('/configuration')) {
            return XcloudInterceptor.#handleConfiguration(request, init);
        } else if (url && url.endsWith('/ice') && url.includes('/sessions/') && (request as Request).method === 'GET') {
            return patchIceCandidates(request as Request);
        }

        return NATIVE_FETCH(request, init);
    }
}


export function interceptHttpRequests() {
    let BLOCKED_URLS: string[] = [];
    if (getPref(PrefKey.BLOCK_TRACKING)) {
        // Clear Applications Insight buffers
        clearAllLogs();

        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://arc.msn.com',
            'https://browser.events.data.microsoft.com',
            'https://dc.services.visualstudio.com',
            'https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io',
        ]);
    }

    if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://peoplehub.xboxlive.com/users/me/people/social',
            'https://peoplehub.xboxlive.com/users/me/people/recommendations',
            'https://xblmessaging.xboxlive.com/network/xbox/users/me/inbox',
            // 'https://notificationinbox.xboxlive.com',
            // 'https://accounts.xboxlive.com/family/memberXuid',
        ]);
    }

    const xhrPrototype = XMLHttpRequest.prototype;
    const nativeXhrOpen = xhrPrototype.open;
    const nativeXhrSend = xhrPrototype.send;

    xhrPrototype.open = function(method, url) {
        // Save URL to use it later in send()
        (this as any)._url = url;
        // @ts-ignore
        return nativeXhrOpen.apply(this, arguments);
    };

    xhrPrototype.send = function(...arg) {
        for (const blocked of BLOCKED_URLS) {
            if ((this as any)._url.startsWith(blocked)) {
                if (blocked === 'https://dc.services.visualstudio.com') {
                    window.setTimeout(clearAllLogs, 1000);
                }
                return false;
            }
        }
        // @ts-ignore
        return nativeXhrSend.apply(this, arguments);
    };

    let gamepassAllGames: string[] = [];

    (window as any).BX_FETCH = window.fetch = async (request: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url = (typeof request === 'string') ? request : (request as Request).url;

        // Check blocked URLs
        for (let blocked of BLOCKED_URLS) {
            if (!url.startsWith(blocked)) {
                continue;
            }

            return new Response('{"acc":1,"webResult":{}}', {
                status: 200,
                statusText: '200 OK',
            });
        }

        if (url.endsWith('/play')) {
            BxEvent.dispatch(window, BxEvent.STREAM_LOADING);
        }

        if (url.endsWith('/configuration')) {
            BxEvent.dispatch(window, BxEvent.STREAM_STARTING);
        }

        // Override experimentals
        if (url.startsWith('https://emerald.xboxservices.com/xboxcomfd/experimentation')) {
            try {
                const response = await NATIVE_FETCH(request, init);
                const json = await response.json();

                for (const key in FeatureGates) {
                    json.exp.treatments[key] = FeatureGates[key]
                }

                response.json = () => Promise.resolve(json);
                return response;
            } catch (e) {
                console.log(e);
            }
        }

        // Add list of games with custom layouts to the official list
        if (STATES.userAgentHasTouchSupport && url.includes('catalog.gamepass.com/sigls/')) {
            const response = await NATIVE_FETCH(request, init);
            const obj = await response.clone().json();

            if (url.includes(GamePassCloudGallery.ALL)) {
                for (let i = 1; i < obj.length; i++) {
                    gamepassAllGames.push(obj[i].id);
                }
            } else if (url.includes(GamePassCloudGallery.TOUCH)) {
                try {
                    let customList = TouchController.getCustomList();

                    // Remove non-cloud games from the list
                    customList = customList.filter(id => gamepassAllGames.includes(id));

                    const newCustomList = customList.map(item => ({ id: item }));
                    obj.push(...newCustomList);
                } catch (e) {
                    console.log(e);
                }
            }

            response.json = () => Promise.resolve(obj);
            return response;
        }

        if (BX_FLAGS.ForceNativeMkbTitles && url.includes('catalog.gamepass.com/sigls/') && url.includes(GamePassCloudGallery.NATIVE_MKB)) {
            const response = await NATIVE_FETCH(request, init);
            const obj = await response.clone().json();

            try {
                const newCustomList = BX_FLAGS.ForceNativeMkbTitles.map((item: string) => ({ id: item }));
                obj.push(...newCustomList);
            } catch (e) {
                console.log(e);
            }

            response.json = () => Promise.resolve(obj);
            return response;
        }

        let requestType: RequestType;
        if (url.includes('/sessions/home') || url.includes('xhome.') || (STATES.remotePlay.isPlaying && url.endsWith('/inputconfigs'))) {
            requestType = RequestType.XHOME;
        } else {
            requestType = RequestType.XCLOUD;
        }

        if (requestType === RequestType.XHOME) {
            return XhomeInterceptor.handle(request as Request);
        }

        return XcloudInterceptor.handle(request, init);
    }
}
