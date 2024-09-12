import { STATES, AppInterface } from "@utils/global";
import { CE, createButton, ButtonStyle } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { Toast } from "@utils/toast";
import { BxEvent } from "@utils/bx-event";
import { t } from "@utils/translation";
import { localRedirect } from "@modules/ui/ui";
import { BxLogger } from "@utils/bx-logger";
import { HeaderSection } from "./ui/header";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";

const LOG_TAG = 'RemotePlay';

const enum RemotePlayConsoleState {
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

export class RemotePlay {
    static XCLOUD_TOKEN: string;
    static XHOME_TOKEN: string;
    static #CONSOLES: Array<RemotePlayConsole>;
    static #REGIONS: Array<RemotePlayRegion>;

    static readonly #STATE_LABELS: {[key in RemotePlayConsoleState]: string} = {
        [RemotePlayConsoleState.ON]: t('powered-on'),
        [RemotePlayConsoleState.OFF]: t('powered-off'),
        [RemotePlayConsoleState.STANDBY]: t('standby'),
        [RemotePlayConsoleState.UNKNOWN]: t('unknown'),
    };

    static readonly BASE_DEVICE_INFO = {
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

    static #$content: HTMLElement;

    static #initialize() {
        if (RemotePlay.#$content) {
            return;
        }

        RemotePlay.#$content = CE('div', {}, t('getting-consoles-list'));
        RemotePlay.#getXhomeToken(() => {
            RemotePlay.#getConsolesList(() => {
                BxLogger.info(LOG_TAG, 'Consoles', RemotePlay.#CONSOLES);
                if (RemotePlay.#CONSOLES && RemotePlay.#CONSOLES.length > 0) {
                    STATES.supportedRegion && HeaderSection.showRemotePlayButton();
                }

                RemotePlay.#renderConsoles();
                BxEvent.dispatch(window, BxEvent.REMOTE_PLAY_READY);
            });
        });
    }

    static #renderConsoles() {
        const $fragment = CE('div', {'class': 'bx-remote-play-container'});

        if (!RemotePlay.#CONSOLES || RemotePlay.#CONSOLES.length === 0) {
            $fragment.appendChild(CE('span', {}, t('no-consoles-found')));
            RemotePlay.#$content = CE('div', {}, $fragment);
            return;
        }

        const $settingNote = CE('p', {});

        const resolutions = [1080, 720];
        const currentResolution = getPref(PrefKey.REMOTE_PLAY_RESOLUTION);
        const $resolutionGroup = CE('div', {});
        for (const resolution of resolutions) {
            const value = `${resolution}p`;
            const id = `bx_radio_xhome_resolution_${resolution}`;

            const $radio = CE<HTMLInputElement>('input', {
                'type': 'radio',
                'value': value,
                'id': id,
                'name': 'bx_radio_xhome_resolution',
            }, value);

            $radio.addEventListener('change', e => {
                const value = (e.target as HTMLInputElement).value;

                $settingNote.textContent = value === '1080p' ? '✅ ' + t('can-stream-xbox-360-games') : '❌ ' + t('cant-stream-xbox-360-games');
                setPref(PrefKey.REMOTE_PLAY_RESOLUTION, value);
            });

            const $label = CE('label', {
                'for': id,
                'class': 'bx-remote-play-resolution',
            }, $radio, `${resolution}p`);

            $resolutionGroup.appendChild($label);

            if (currentResolution === value) {
                $radio.checked = true;
                $radio.dispatchEvent(new Event('change'));
            }
        }

        const $qualitySettings = CE('div', {'class': 'bx-remote-play-settings'},
                                    CE('div', {},
                                       CE('label', {}, t('target-resolution'), $settingNote),
                                       $resolutionGroup,
                                      )
                                   );

        $fragment.appendChild($qualitySettings);

        // Render concoles list
        for (let con of RemotePlay.#CONSOLES) {
            const $child = CE('div', {'class': 'bx-remote-play-device-wrapper'},
                CE('div', {'class': 'bx-remote-play-device-info'},
                    CE('div', {},
                        CE('span', {'class': 'bx-remote-play-device-name'}, con.deviceName),
                        CE('span', {'class': 'bx-remote-play-console-type'}, con.consoleType.replace('Xbox', ''))
                    ),
                    CE('div', {'class': 'bx-remote-play-power-state'}, RemotePlay.#STATE_LABELS[con.powerState]),
                ),

                // Connect button
                createButton({
                    classes: ['bx-remote-play-connect-button'],
                    label: t('console-connect'),
                    style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE,
                    onClick: e => {
                            RemotePlay.play(con.serverId);
                        },
                }),
            );

            $fragment.appendChild($child);
        }

        // Add Help button
        $fragment.appendChild(createButton({
            icon: BxIcon.QUESTION,
            style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
            url: 'https://better-xcloud.github.io/remote-play',
            label: t('help'),
        }));

        RemotePlay.#$content = CE('div', {}, $fragment);
    }

    static #getXhomeToken(callback: any) {
        if (RemotePlay.XHOME_TOKEN) {
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
                RemotePlay.#REGIONS = json.offeringSettings.regions;
                RemotePlay.XHOME_TOKEN = json.gsToken;
                callback();
            });
    }

    static async #getConsolesList(callback: any) {
        if (RemotePlay.#CONSOLES) {
            callback();
            return;
        }

        const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${RemotePlay.XHOME_TOKEN}`,
                },
            };

        // Test servers one by one
        for (const region of RemotePlay.#REGIONS) {
            try {
                const request = new Request(`${region.baseUri}/v6/servers/home?mr=50`, options);
                const resp = await fetch(request);

                const json = await resp.json();
                if (json.results.length === 0) {
                    continue;
                }

                RemotePlay.#CONSOLES = json.results;

                // Store working server
                STATES.remotePlay.server = region.baseUri;

                callback();
            } catch (e) {}

            if (RemotePlay.#CONSOLES && RemotePlay.#CONSOLES.length > 0) {
                break;
            }
        }

        // None of the servers worked
        if (!STATES.remotePlay.server) {
            RemotePlay.#CONSOLES = [];
        }
    }

    static play(serverId: string, resolution?: string) {
        if (resolution) {
            setPref(PrefKey.REMOTE_PLAY_RESOLUTION, resolution);
        }

        STATES.remotePlay.config = {
            serverId: serverId,
        };
        window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config;

        localRedirect('/launch/fortnite/BT5P2X999VH2#remote-play');
        RemotePlay.detachPopup();
    }

    static preload() {
        RemotePlay.#initialize();
    }

    static detachPopup() {
        // Detach popup from body
        const $popup = document.querySelector('.bx-remote-play-popup');
        $popup && $popup.remove();
    }

    static togglePopup(force = null) {
        if (!getPref(PrefKey.REMOTE_PLAY_ENABLED) || !RemotePlay.isReady()) {
            Toast.show(t('getting-consoles-list'));
            return;
        }

        RemotePlay.#initialize();

        if (AppInterface && AppInterface.showRemotePlayDialog) {
            AppInterface.showRemotePlayDialog(JSON.stringify(RemotePlay.#CONSOLES));
            (document.activeElement as HTMLElement).blur();
            return;
        }

        if (document.querySelector('.bx-remote-play-popup')) {
            if (force === false) {
                RemotePlay.#$content.classList.add('bx-gone');
            } else {
                RemotePlay.#$content.classList.toggle('bx-gone');
            }
            return;
        }

        const $header = document.querySelector('#gamepass-root header')!;

        const group = $header.firstElementChild!.getAttribute('data-group')!;
        RemotePlay.#$content.setAttribute('data-group', group);
        RemotePlay.#$content.classList.add('bx-remote-play-popup');
        RemotePlay.#$content.classList.remove('bx-gone');

        $header.insertAdjacentElement('afterend', RemotePlay.#$content);
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

    static isReady() {
        return RemotePlay.#CONSOLES !== null && RemotePlay.#CONSOLES.length > 0;
    }
}
