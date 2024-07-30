import { BxEvent } from "@utils/bx-event";
import { BX_FLAGS, NATIVE_FETCH } from "@utils/bx-flags";
import { TouchController } from "@modules/touch-controller";
import { STATES } from "@utils/global";
import { GamePassCloudGallery } from "../enums/game-pass-gallery";
import { FeatureGates } from "./feature-gates";
import { BxLogger } from "./bx-logger";
import { XhomeInterceptor } from "./xhome-interceptor";
import { XcloudInterceptor } from "./xcloud-interceptor";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";
import type { RemotePlayConsoleAddresses } from "@/types/network";

type RequestType = 'xcloud' | 'xhome';

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

function updateIceCandidates(candidates: any, options: {preferIpv6Server: boolean, consoleAddrs?: RemotePlayConsoleAddresses}) {
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
            for (const port of options.consoleAddrs[ip]) {
                newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
            }
        }
    }

    newCandidates.push(newCandidate('a=end-of-candidates'));

    BxLogger.info('ICE Candidates', newCandidates);
    return newCandidates;
}


export async function patchIceCandidates(request: Request, consoleAddrs?: RemotePlayConsoleAddresses) {
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

                if (json && json.exp && json.exp.treatments) {
                    for (const key in FeatureGates) {
                        json.exp.treatments[key] = FeatureGates[key]
                    }
                }

                response.json = () => Promise.resolve(json);
                return response;
            } catch (e) {
                console.log(e);
            }
        }

        // Add list of games with custom layouts to the official list
        if (STATES.userAgent.capabilities.touch && url.includes('catalog.gamepass.com/sigls/')) {
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
            requestType = 'xhome';
        } else {
            requestType = 'xcloud';
        }

        if (requestType === 'xhome') {
            return XhomeInterceptor.handle(request as Request);
        }

        return XcloudInterceptor.handle(request, init);
    }
}
