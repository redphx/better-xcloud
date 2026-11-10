import type { BxExposed } from "@/utils/bx-exposed";
import type { AllPresets, ControllerShortcutPresetRecord } from "./presets";
import type { GlobalPref } from "@/enums/pref-keys";
import type { StreamSettings, type StreamSettingsData } from "@/utils/stream-settings";
import type { BxEvent } from "@/utils/bx-event";
import type { BxEventBus } from "@/utils/bx-event-bus";
import type { BxLogger } from "@/utils/bx-logger";
import type { XcloudInputChannel } from "@/utils/gamepad";

export {};

declare global {
    interface Window {
        AppInterface: {
            startPointerServer(),
            requestPointerCapture(),
            releasePointerCapture(),

            runShortcut?(action: string),
            saveScreenshot(name: string | undefined, data: string),
            vibrate(dataJson: string, intensity: number),
            openTrueAchievementsLink(override: boolean, xboxTitleId?: string | undefined, id?: string | undefined),

            openAppSettings?(),
            updateLatestScript(),
            closeApp(),
            getDeepLinkData(): string,

            createShortcut(path: string),
            createConsoleShortcut(serverId: string, deviceName: string, optionsJson: string),
            downloadWallpapers(titleSlug: string | undefined, productId: string | undefined),

            onEvent(event: String),
            onEventBus(event: String),
        };
        BX_FLAGS?: BxFlags;
        BX_CE: (elmName: string, props: { [index: string]: any }={}) => HTMLElement;
        BX_EXPOSED: typeof BxExposed & Partial<{
            shouldShowSensorControls: boolean;
            stopTakRendering: boolean;
            localCoOpEnabled: boolean;
            dialogRoutes: {
                closeAll: () => void;
            };
            showStreamMenu: () => void;
            inputChannel: XcloudInputChannel | undefined;
            streamSession: any;
            touchLayoutManager: any;
        }>;

        BX_STREAM_SETTINGS: StreamSettingsData;

        BX_FETCH: typeof window['fetch'];

        BxEvent: typeof BxEvent;
        BxEventBus: typeof BxEventBus;
        BxLogger: typeof BxLogger;
        localRedirect: (path: stringn) => void;
        testTouchLayout: (layout: any) => void;

        chrome?: any;

        // xCloud properties
        xbcUser?: {
            isSignedIn: boolean;
        };
        MSA: any;
        MeControl: any;
        adobe: any;
    }

    interface Navigator {
        orgUserAgent?: string;
        orgUserAgentData?: any;
    }
}
