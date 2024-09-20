import { ButtonStyle, CE, createButton } from "@/utils/html";
import { NavigationDialog } from "./navigation-dialog";
import { PrefKey } from "@/enums/pref-keys";
import { BxIcon } from "@/utils/bx-icon";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";
import { t } from "@/utils/translation";
import { RemotePlayConsoleState, RemotePlayManager } from "@/modules/remote-play-manager";


export class RemotePlayNavigationDialog extends NavigationDialog {
    private static instance: RemotePlayNavigationDialog;
    public static getInstance(): RemotePlayNavigationDialog {
        if (!RemotePlayNavigationDialog.instance) {
            RemotePlayNavigationDialog.instance = new RemotePlayNavigationDialog();
        }
        return RemotePlayNavigationDialog.instance;
    }

    private readonly STATE_LABELS: Record<RemotePlayConsoleState, string> = {
        [RemotePlayConsoleState.ON]: t('powered-on'),
        [RemotePlayConsoleState.OFF]: t('powered-off'),
        [RemotePlayConsoleState.STANDBY]: t('standby'),
        [RemotePlayConsoleState.UNKNOWN]: t('unknown'),
    };

    $container!: HTMLElement;

    constructor() {
        super();
        this.setupDialog();
    }

    private setupDialog() {
        const $fragment = CE('div', {'class': 'bx-remote-play-container'});

        const $settingNote = CE('p', {});

        const resolutions = [1080, 720];
        const currentResolution = getPref(PrefKey.REMOTE_PLAY_RESOLUTION);
        const $resolutionGroup = CE('div', {});

        const onResolutionChange = (e: Event) => {
            const value = (e.target as HTMLInputElement).value;

            $settingNote.textContent = value === '1080p' ? '✅ ' + t('can-stream-xbox-360-games') : '❌ ' + t('cant-stream-xbox-360-games');
            setPref(PrefKey.REMOTE_PLAY_RESOLUTION, value);
        };

        for (const resolution of resolutions) {
            const value = `${resolution}p`;
            const id = `bx_radio_xhome_resolution_${resolution}`;

            const $radio = CE<HTMLInputElement>('input', {
                type: 'radio',
                value: value,
                id: id,
                name: 'bx_radio_xhome_resolution',
            }, value);

            $radio.addEventListener('input', onResolutionChange);

            const $label = CE('label', {
                for: id,
                class: 'bx-remote-play-resolution',
            }, $radio, `${resolution}p`);

            $resolutionGroup.appendChild($label);

            if (currentResolution === value) {
                $radio.checked = true;
                $radio.dispatchEvent(new Event('input'));
            }
        }

        const $qualitySettings = CE('div', {
            class: 'bx-remote-play-settings',
        }, CE('div', {},
            CE('label', {}, t('target-resolution'), $settingNote),
            $resolutionGroup,
        ));

        $fragment.appendChild($qualitySettings);

        // Render consoles list
        const manager = RemotePlayManager.getInstance();
        const consoles = manager.getConsoles();

        for (let con of consoles) {
            const $child = CE('div', {class: 'bx-remote-play-device-wrapper'},
                CE('div', {class: 'bx-remote-play-device-info'},
                    CE('div', {},
                        CE('span', {class: 'bx-remote-play-device-name'}, con.deviceName),
                        CE('span', {class: 'bx-remote-play-console-type'}, con.consoleType.replace('Xbox', ''))
                    ),
                    CE('div', {class: 'bx-remote-play-power-state'}, this.STATE_LABELS[con.powerState]),
                ),

                // Connect button
                createButton({
                    classes: ['bx-remote-play-connect-button'],
                    label: t('console-connect'),
                    style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE,
                    onClick: e => manager.play(con.serverId),
                }),
            );

            $fragment.appendChild($child);
        }

        // Add buttons
        $fragment.appendChild(
            CE('div', {
                class: 'bx-remote-play-buttons',
                _nearby: {
                    orientation: 'horizontal',
                },
            },
                createButton({
                    icon: BxIcon.QUESTION,
                    style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
                    url: 'https://better-xcloud.github.io/remote-play',
                    label: t('help'),
                }),

                createButton({
                    style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
                    label: t('close'),
                    onClick: e => this.hide(),
                }),
            ),
        );

        this.$container = $fragment;
    }

    getDialog(): NavigationDialog {
        return this;
    }

    getContent(): HTMLElement {
        return this.$container;
    }

    focusIfNeeded(): void {
        const $btnConnect = this.$container.querySelector('.bx-remote-play-device-wrapper button') as HTMLElement;
        $btnConnect && $btnConnect.focus();
    }
}
