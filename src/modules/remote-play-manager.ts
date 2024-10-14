import { STATES, AppInterface } from "@utils/global";
import { Toast } from "@utils/toast";
import { BxEvent } from "@utils/bx-event";
import { t } from "@utils/translation";
import { localRedirect } from "@modules/ui/ui";
import { BxLogger } from "@utils/bx-logger";
import { HeaderSection } from "./ui/header";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";
import { RemotePlayNavigationDialog } from "./ui/dialog/remote-play-dialog";

const LOG_TAG = 'RemotePlay';

export const enum RemotePlayConsoleState {
    ON = 'On',
    OFF = 'Off',
    STANDBY = 'ConnectedStandby',
    UNKNOWN = 'Unknown',
}

type RemotePlayRegion = {
    name: string;
    baseUri: string;
    isDefault: boolean;
};

type RemotePlayConsole = {
    deviceName: string;
    serverId: string;
    powerState: RemotePlayConsoleState;
    consoleType: string;
    // playPath: string;
    // outOfHomeWarning: string;
    // wirelessWarning: string;
    // isDevKit: string;
};

export class RemotePlayManager {
    private static instance: RemotePlayManager;
    public static getInstance = () => RemotePlayManager.instance ?? (RemotePlayManager.instance = new RemotePlayManager());

    private isInitialized = false;

    private XCLOUD_TOKEN!: string;
    private XHOME_TOKEN!: string;

    private consoles!: Array<RemotePlayConsole>;
    private regions: Array<RemotePlayRegion> = [];

    initialize() {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;

        this.getXhomeToken(() => {
            this.getConsolesList(() => {
                BxLogger.info(LOG_TAG, 'Consoles', this.consoles);

                STATES.supportedRegion && HeaderSection.showRemotePlayButton();
                BxEvent.dispatch(window, BxEvent.REMOTE_PLAY_READY);
            });
        });
    }

    get xcloudToken() {
        return this.XCLOUD_TOKEN;
    }

    set xcloudToken(token: string) {
        this.XCLOUD_TOKEN = token;
    }

    get xhomeToken() {
        return this.XHOME_TOKEN;
    }

    getConsoles() {
        return this.consoles;
    }


    private getXhomeToken(callback: any) {
        if (this.XHOME_TOKEN) {
            callback();
            return;
        }

        let GSSV_TOKEN;
        try {
            GSSV_TOKEN = JSON.parse(localStorage.getItem('xboxcom_xbl_user_info')!).tokens['http://gssv.xboxlive.com/'].token;
        } catch (e) {
            for (let i = 0; i < localStorage.length; i++){
                const key = localStorage.key(i)!;
                if (!key.startsWith('Auth.User.')) {
                    continue;
                }

                const json = JSON.parse(localStorage.getItem(key)!);
                for (const token of json.tokens) {
                    if (!token.relyingParty.includes('gssv.xboxlive.com')) {
                        continue;
                    }

                    GSSV_TOKEN = token.tokenData.token;
                    break;
                }

                break;
            }
        }

        const request = new Request('https://xhome.gssv-play-prod.xboxlive.com/v2/login/user', {
            method: 'POST',
            body: JSON.stringify({
                offeringId: 'xhome',
                token: GSSV_TOKEN,
            }),
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
        });

        fetch(request).then(resp => resp.json())
            .then(json => {
                this.regions = json.offeringSettings.regions;
                this.XHOME_TOKEN = json.gsToken;
                callback();
            });
    }

    private async getConsolesList(callback: any) {
        if (this.consoles) {
            callback();
            return;
        }

        const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.XHOME_TOKEN}`,
                },
            };

        // Test servers one by one
        for (const region of this.regions) {
            try {
                const request = new Request(`${region.baseUri}/v6/servers/home?mr=50`, options);
                const resp = await fetch(request);

                const json = await resp.json();
                if (json.results.length === 0) {
                    continue;
                }

                this.consoles = json.results;

                // Store working server
                STATES.remotePlay.server = region.baseUri;

                break;
            } catch (e) {}
        }

        // None of the servers worked
        if (!STATES.remotePlay.server) {
            this.consoles = [];
        }

        callback();
    }

    play(serverId: string, resolution?: string) {
        if (resolution) {
            setPref(PrefKey.REMOTE_PLAY_RESOLUTION, resolution);
        }

        STATES.remotePlay.config = {
            serverId: serverId,
        };
        window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config;

        localRedirect('/launch/fortnite/BT5P2X999VH2#remote-play');
    }

    togglePopup(force = null) {
        if (!this.isReady()) {
            Toast.show(t('getting-consoles-list'));
            return;
        }

        if (this.consoles.length === 0) {
            Toast.show(t('no-consoles-found'), '', {instant: true});
            return;
        }

        // Show native dialog in Android app
        if (AppInterface && AppInterface.showRemotePlayDialog) {
            AppInterface.showRemotePlayDialog(JSON.stringify(this.consoles));
            (document.activeElement as HTMLElement).blur();
            return;
        }

        RemotePlayNavigationDialog.getInstance().show();
    }

    static detect() {
        if (!getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
            return;
        }

        STATES.remotePlay.isPlaying = window.location.pathname.includes('/launch/') && window.location.hash.startsWith('#remote-play');
        if (STATES.remotePlay?.isPlaying) {
            window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config;
            // Remove /launch/... from URL
            window.history.replaceState({origin: 'better-xcloud'}, '', 'https://www.xbox.com/' + location.pathname.substring(1, 6) + '/play');
        } else {
            window.BX_REMOTE_PLAY_CONFIG = null;
        }
    }

    isReady() {
        return this.consoles !== null;
    }
}
