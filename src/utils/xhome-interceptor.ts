import { TouchController } from "@/modules/touch-controller";
import { BxEvent } from "./bx-event";
import { SupportedInputType } from "./bx-exposed";
import { NATIVE_FETCH } from "./bx-flags";
import { STATES } from "./global";
import { generateMsDeviceInfo, getOsNameFromResolution, patchIceCandidates } from "./network";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";
import type { RemotePlayConsoleAddresses } from "@/types/network";
import { RemotePlayManager } from "@/modules/remote-play-manager";
import { StreamResolution, TouchControllerMode } from "@/enums/pref-values";
import { EventBus } from "./event-bus";

export class XhomeInterceptor {
    private static consoleAddrs: RemotePlayConsoleAddresses = {};

    private static async handleLogin(request: Request) {
        try {
            const clone = request.clone();
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

    private static async handleConfiguration(request: Request | URL) {
        EventBus.Stream.emit('stateStarting', {});

        const response = await NATIVE_FETCH(request);
        const obj = await response.clone().json();

        const serverDetails = obj.serverDetails;
        const pairs = [
            ['ipAddress', 'port'],
            ['ipV4Address', 'ipV4Port'],
            ['ipV6Address', 'ipV6Port'],
        ];

        XhomeInterceptor.consoleAddrs = {};
        for (const pair of pairs) {
            const [keyAddr, keyPort] = pair;
            if (keyAddr && keyPort && serverDetails[keyAddr]) {
                const port = serverDetails[keyPort];
                // Add port 9002 to the list of ports
                const ports = new Set<number>();
                port && ports.add(port);
                ports.add(9002);
                // Save it
                XhomeInterceptor.consoleAddrs[serverDetails[keyAddr]] = Array.from(ports);
            }
        }

        response.json = () => Promise.resolve(obj);
        response.text = () => Promise.resolve(JSON.stringify(obj));

        return response;
    }

    private static async handleInputConfigs(request: Request | URL, opts: { [index: string]: any }) {
        const response = await NATIVE_FETCH(request);

        if (getPref<TouchControllerMode>(PrefKey.TOUCH_CONTROLLER_MODE) !== TouchControllerMode.ALL) {
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

    private static async handleTitles(request: Request) {
        const clone = request.clone();

        const headers: { [index: string]: any } = {};
        for (const pair of (clone.headers as any).entries()) {
            headers[pair[0]] = pair[1];
        }
        headers.authorization = `Bearer ${RemotePlayManager.getInstance()!.getXcloudToken()}`;

        const index = request.url.indexOf('.xboxlive.com');
        request = new Request('https://wus.core.gssv-play-prod' + request.url.substring(index), {
            method: clone.method,
            body: await clone.text(),
            headers: headers,
        });

        return NATIVE_FETCH(request);
    }

    private static async handlePlay(request: RequestInfo | URL) {
        EventBus.Stream.emit('stateLoading', {});

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

        const headers: { [index: string]: string } = {};
        for (const pair of (clone.headers as any).entries()) {
            headers[pair[0]] = pair[1];
        }
        // Add xHome token to headers
        headers.authorization = `Bearer ${RemotePlayManager.getInstance()!.getXhomeToken()}`;

        // Patch resolution
        const osName = getOsNameFromResolution(getPref<StreamResolution>(PrefKey.REMOTE_PLAY_STREAM_RESOLUTION));
        headers['x-ms-device-info'] = JSON.stringify(generateMsDeviceInfo(osName));

        const opts: Record<string, any> = {
            method: clone.method,
            headers: headers,
        };

        // Copy body
        if (clone.method === 'POST') {
            opts.body = await clone.text();
        }

        // Replace xCloud domain with xHome domain
        let url = request.url;
        if (!url.includes('/servers/home')) {
            const parsed = new URL(url);
            url = STATES.remotePlay.server + parsed.pathname;
        }

        // Create new Request instance
        request = new Request(url, opts);

        // Get console IP
        if (url.includes('/configuration')) {
            return XhomeInterceptor.handleConfiguration(request);
        } else if (url.endsWith('/sessions/home/play')) {
            return XhomeInterceptor.handlePlay(request);
        } else if (url.includes('inputconfigs')) {
            return XhomeInterceptor.handleInputConfigs(request, opts);
        } else if (url.includes('/login/user')) {
            return XhomeInterceptor.handleLogin(request);
        } else if (url.endsWith('/titles')) {
            return XhomeInterceptor.handleTitles(request);
        } else if (url && url.endsWith('/ice') && url.includes('/sessions/') && request.method === 'GET') {
            return patchIceCandidates(request, XhomeInterceptor.consoleAddrs);
        }

        return await NATIVE_FETCH(request);
    }
}
