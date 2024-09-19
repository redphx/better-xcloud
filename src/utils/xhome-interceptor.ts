import { TouchController } from "@/modules/touch-controller";
import { BxEvent } from "./bx-event";
import { SupportedInputType } from "./bx-exposed";
import { NATIVE_FETCH } from "./bx-flags";
import { STATES } from "./global";
import { patchIceCandidates } from "./network";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, StreamResolution, StreamTouchController } from "./settings-storages/global-settings-storage";
import type { RemotePlayConsoleAddresses } from "@/types/network";
import { RemotePlayManager } from "@/modules/remote-play-manager";

export class XhomeInterceptor {
    static #consoleAddrs: RemotePlayConsoleAddresses = {};

    private static readonly BASE_DEVICE_INFO = {
        appInfo: {
            env: {
                clientAppId: window.location.host,
                clientAppType: 'browser',
                clientAppVersion: '24.17.36',
                clientSdkVersion: '10.1.14',
                httpEnvironment: 'prod',
                sdkInstallId: '',
            },
        },

        dev: {
            displayInfo: {
                dimensions: {
                    widthInPixels: 1920,
                    heightInPixels: 1080,
                },
                pixelDensity: {
                    dpiX: 1,
                    dpiY: 1,
                },
            },
            hw: {
                make: 'Microsoft',
                model: 'unknown',
                sdktype: 'web',
            },
            os: {
                name: 'windows',
                ver: '22631.2715',
                platform: 'desktop',
            },
            browser: {
                browserName: 'chrome',
                browserVersion: '125.0',
            },
        },
    };

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

        const processPorts = (port: number): number[] => {
            const ports = new Set<number>();
            port && ports.add(port);
            ports.add(9002);

            return Array.from(ports);
        };

        const serverDetails = obj.serverDetails;
        if (serverDetails.ipAddress) {
            XhomeInterceptor.#consoleAddrs[serverDetails.ipAddress] = processPorts(serverDetails.port);
        }

        if (serverDetails.ipV4Address) {
            XhomeInterceptor.#consoleAddrs[serverDetails.ipV4Address] = processPorts(serverDetails.ipV4Port);
        }

        if (serverDetails.ipV6Address) {
            XhomeInterceptor.#consoleAddrs[serverDetails.ipV6Address] = processPorts(serverDetails.ipV6Port);
        }

        response.json = () => Promise.resolve(obj);
        response.text = () => Promise.resolve(JSON.stringify(obj));

        return response;
    }

    static async #handleInputConfigs(request: Request | URL, opts: {[index: string]: any}) {
        const response = await NATIVE_FETCH(request);

        if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== StreamTouchController.ALL) {
            return response;
        }

        const obj = await response.clone().json() as any;

        const xboxTitleId = JSON.parse(opts.body).titleIds[0];
        TouchController.setXboxTitleId(xboxTitleId);

        const inputConfigs = obj[0];

        let hasTouchSupport = inputConfigs.supportedTabs.length > 0;
        if (!hasTouchSupport) {
            const supportedInputTypes = inputConfigs.supportedInputTypes;
            hasTouchSupport = supportedInputTypes.includes(SupportedInputType.NATIVE_TOUCH) || supportedInputTypes.includes(SupportedInputType.CUSTOM_TOUCH_OVERLAY);
        }

        if (hasTouchSupport) {
            TouchController.disable();

            BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
                data: null,
            });
        } else {
            TouchController.enable();
            TouchController.requestCustomLayouts(xboxTitleId);
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
        headers.authorization = `Bearer ${RemotePlayManager.getInstance().xcloudToken}`;

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
        headers.authorization = `Bearer ${RemotePlayManager.getInstance().xhomeToken}`;

        // Patch resolution
        const deviceInfo = XhomeInterceptor.BASE_DEVICE_INFO;
        if (getPref(PrefKey.REMOTE_PLAY_RESOLUTION) === StreamResolution.DIM_720P) {
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
