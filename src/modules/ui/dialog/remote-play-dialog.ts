import { ButtonStyle, CE, createButton } from "@/utils/html";
import { NavigationDialog, type NavigationElement } from "./navigation-dialog";
import { PrefKey } from "@/enums/pref-keys";
import { BxIcon } from "@/utils/bx-icon";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";
import { t } from "@/utils/translation";
import { RemotePlayConsoleState, RemotePlayManager } from "@/modules/remote-play-manager";
import { BxSelectElement } from "@/web-components/bx-select";
import { BxEvent } from "@/utils/bx-event";


export class RemotePlayNavigationDialog extends NavigationDialog {
    private static instance: RemotePlayNavigationDialog;
    public static getInstance = () => RemotePlayNavigationDialog.instance ?? (RemotePlayNavigationDialog.instance = new RemotePlayNavigationDialog());

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

        const currentResolution = getPref(PrefKey.REMOTE_PLAY_RESOLUTION);
        let $resolutions : HTMLSelectElement | NavigationElement = CE<HTMLSelectElement>('select', {},
            CE('option', {value: '1080p'}, '1080p'),
            CE('option', {value: '720p'}, '720p'),
        );

        if (getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
            $resolutions = BxSelectElement.wrap($resolutions as HTMLSelectElement);
        }

        $resolutions.addEventListener('input', (e: Event) => {
            const value = (e.target as HTMLSelectElement).value;

            $settingNote.textContent = value === '1080p' ? '✅ ' + t('can-stream-xbox-360-games') : '❌ ' + t('cant-stream-xbox-360-games');
            setPref(PrefKey.REMOTE_PLAY_RESOLUTION, value);
        });

        ($resolutions as any).value = currentResolution;
        BxEvent.dispatch($resolutions, 'input', {
            manualTrigger: true,
        });

        const $qualitySettings = CE('div', {
            class: 'bx-remote-play-settings',
        }, CE('div', {},
            CE('label', {}, t('target-resolution'), $settingNote),
            $resolutions,
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
