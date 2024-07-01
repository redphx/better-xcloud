import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { STATES, AppInterface } from "@utils/global";
import { ButtonStyle, CE, createButton, createSvgIcon } from "@utils/html";
import { PrefKey, Preferences, getPref, toPrefElement } from "@utils/preferences";
import { t } from "@utils/translation";
import { ControllerShortcut } from "../controller-shortcut";
import { MkbRemapper } from "../mkb/mkb-remapper";
import { NativeMkbHandler } from "../mkb/native-mkb-handler";
import { SoundShortcut } from "../shortcuts/shortcut-sound";
import { TouchController } from "../touch-controller";
import { VibrationManager } from "../vibration-manager";
import { StreamStats } from "./stream-stats";
import { BX_FLAGS } from "@/utils/bx-flags";
import { BxSelectElement } from "@/web-components/bx-select";
import { onChangeVideoPlayerType, updateVideoPlayer } from "./stream-settings-utils";

export class StreamSettings {
    private static instance: StreamSettings;

    public static getInstance(): StreamSettings {
        if (!StreamSettings.instance) {
            StreamSettings.instance = new StreamSettings();
        }

        return StreamSettings.instance;
    }

    private $container: HTMLElement | undefined;
    private $overlay: HTMLElement | undefined;

    readonly SETTINGS_UI = [{
        icon: BxIcon.DISPLAY,
        group: 'stream',
        items: [{
            group: 'audio',
            label: t('audio'),
            help_url: 'https://better-xcloud.github.io/ingame-features/#audio',
            items: [{
                pref: PrefKey.AUDIO_VOLUME,
                onChange: (e: any, value: number) => {
                    SoundShortcut.setGainNodeVolume(value);
                },
                params: {
                    disabled: !getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL),
                },
                onMounted: ($elm: HTMLElement) => {
                    const $range = $elm.querySelector('input[type=range') as HTMLInputElement;
                    window.addEventListener(BxEvent.GAINNODE_VOLUME_CHANGED, e => {
                        $range.value = (e as any).volume;
                        BxEvent.dispatch($range, 'input', {
                            ignoreOnChange: true,
                        });
                    });
                },
            }],
        }, {
            group: 'video',
            label: t('video'),
            help_url: 'https://better-xcloud.github.io/ingame-features/#video',
            items: [{
                pref: PrefKey.VIDEO_PLAYER_TYPE,
                onChange: onChangeVideoPlayerType,
            }, {
                pref: PrefKey.VIDEO_RATIO,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_PROCESSING,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_SHARPNESS,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_SATURATION,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_CONTRAST,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_BRIGHTNESS,
                onChange: updateVideoPlayer,
            }],
        }],
        }, {
            icon: BxIcon.CONTROLLER,
            group: 'controller',
            items: [{
                group: 'controller',
                label: t('controller'),
                help_url: 'https://better-xcloud.github.io/ingame-features/#controller',
                items: [{
                    pref: PrefKey.CONTROLLER_ENABLE_VIBRATION,
                    unsupported: !VibrationManager.supportControllerVibration(),
                    onChange: () => VibrationManager.updateGlobalVars(),
                }, {
                    pref: PrefKey.CONTROLLER_DEVICE_VIBRATION,
                    unsupported: !VibrationManager.supportDeviceVibration(),
                    onChange: () => VibrationManager.updateGlobalVars(),
                }, (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
                    pref: PrefKey.CONTROLLER_VIBRATION_INTENSITY,
                    unsupported: !VibrationManager.supportDeviceVibration(),
                    onChange: () => VibrationManager.updateGlobalVars(),
                }],
            },

            STATES.userAgentHasTouchSupport && {
                group: 'touch-controller',
                label: t('touch-controller'),
                items: [{
                    label: t('layout'),
                    content: CE('select', {disabled: true}, CE('option', {}, t('default'))),
                    onMounted: ($elm: HTMLSelectElement) => {
                        $elm.addEventListener('change', e => {
                            TouchController.loadCustomLayout(STATES.currentStream?.xboxTitleId!, $elm.value, 1000);
                        });

                        window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, e => {
                            const data = (e as any).data;

                            if (STATES.currentStream?.xboxTitleId && ($elm as any).xboxTitleId === STATES.currentStream?.xboxTitleId) {
                                $elm.dispatchEvent(new Event('change'));
                                return;
                            }

                            ($elm as any).xboxTitleId = STATES.currentStream?.xboxTitleId;

                            // Clear options
                            while ($elm.firstChild) {
                                $elm.removeChild($elm.firstChild);
                            }

                            $elm.disabled = !data;
                            if (!data) {
                                $elm.appendChild(CE('option', {value: ''}, t('default')));
                                $elm.value = '';
                                $elm.dispatchEvent(new Event('change'));
                                return;
                            }

                            // Add options
                            const $fragment = document.createDocumentFragment();
                            for (const key in data.layouts) {
                                const layout = data.layouts[key];

                                let name;
                                if (layout.author) {
                                    name = `${layout.name} (${layout.author})`;
                                } else {
                                    name = layout.name;
                                }

                                const $option = CE('option', {value: key}, name);
                                $fragment.appendChild($option);
                            }

                            $elm.appendChild($fragment);
                            $elm.value = data.default_layout;
                            $elm.dispatchEvent(new Event('change'));
                        });
                    },
                }],
            }],
        },

        getPref(PrefKey.MKB_ENABLED) && {
            icon: BxIcon.VIRTUAL_CONTROLLER,
            group: 'mkb',
            items: [{
                group: 'mkb',
                label: t('virtual-controller'),
                help_url: 'https://better-xcloud.github.io/mouse-and-keyboard/',
                content: MkbRemapper.INSTANCE.render(),
            }],
        },

        AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' && {
            icon: BxIcon.NATIVE_MKB,
            group: 'native-mkb',
            items: [{
                group: 'native-mkb',
                label: t('native-mkb'),
                items: [{
                    pref: PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY,
                    onChange: (e: any, value: number) => {
                        NativeMkbHandler.getInstance().setVerticalScrollMultiplier(value / 100);
                    },
                }, {
                    pref: PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY,
                    onChange: (e: any, value: number) => {
                        NativeMkbHandler.getInstance().setHorizontalScrollMultiplier(value / 100);
                    },
                }],
            }],
        }, {
            icon: BxIcon.COMMAND,
            group: 'shortcuts',
            items: [{
                group: 'shortcuts_controller',
                label: t('controller-shortcuts'),
                content: ControllerShortcut.renderSettings(),
            }],
        }, {
            icon: BxIcon.STREAM_STATS,
            group: 'stats',
            items: [{
                group: 'stats',
                label: t('stream-stats'),
                help_url: 'https://better-xcloud.github.io/stream-stats/',
                items: [{
                        pref: PrefKey.STATS_SHOW_WHEN_PLAYING,
                    }, {
                        pref: PrefKey.STATS_QUICK_GLANCE,
                        onChange: (e: InputEvent) => {
                            const streamStats = StreamStats.getInstance();
                            (e.target! as HTMLInputElement).checked ? streamStats.quickGlanceSetup() : streamStats.quickGlanceStop();
                        },
                    }, {
                        pref: PrefKey.STATS_ITEMS,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_POSITION,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_TEXT_SIZE,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_OPACITY,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_TRANSPARENT,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_CONDITIONAL_FORMATTING,
                        onChange: StreamStats.refreshStyles,
                    },
                ],
            }],
        },
    ];

    constructor() {
        this.#setupDialog();
    }

    show(tabId?: string) {
        const $container = this.$container!;
        // Select tab
        if (tabId) {
            const $tab = $container.querySelector(`.bx-stream-settings-tabs svg[data-group=${tabId}]`);
            $tab && $tab.dispatchEvent(new Event('click'));
        }

        this.$overlay!.classList.remove('bx-gone');
        $container.classList.remove('bx-gone');

        document.body.classList.add('bx-no-scroll');
    }

    hide() {
        this.$overlay!.classList.add('bx-gone');
        this.$container!.classList.add('bx-gone');

        document.body.classList.remove('bx-no-scroll');
    }

    #setupDialog() {
        let $tabs: HTMLElement;
        let $settings: HTMLElement;

        const $overlay = CE('div', {'class': 'bx-stream-settings-overlay bx-gone'});
        this.$overlay = $overlay;

        const $container = CE('div', {'class': 'bx-stream-settings-dialog bx-gone'},
                $tabs = CE('div', {'class': 'bx-stream-settings-tabs'}),
                $settings = CE('div', {'class': 'bx-stream-settings-tab-contents'}),
            );
        this.$container = $container;

        // Close dialog when clicking on the overlay
        $overlay.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
        });

        for (const settingTab of this.SETTINGS_UI) {
            if (!settingTab) {
                continue;
            }

            const $svg = createSvgIcon(settingTab.icon);
            $svg.addEventListener('click', e => {
                // Switch tab
                for (const $child of Array.from($settings.children)) {
                    if ($child.getAttribute('data-group') === settingTab.group) {
                        $child.classList.remove('bx-gone');
                    } else {
                        $child.classList.add('bx-gone');
                    }
                }

                // Highlight current tab button
                for (const $child of Array.from($tabs.children)) {
                    $child.classList.remove('bx-active');
                }

                $svg.classList.add('bx-active');
            });

            $tabs.appendChild($svg);

            const $group = CE('div', {'data-group': settingTab.group, 'class': 'bx-gone'});

            for (const settingGroup of settingTab.items) {
                if (!settingGroup) {
                    continue;
                }

                $group.appendChild(CE('h2', {},
                        CE('span', {}, settingGroup.label),
                        settingGroup.help_url && createButton({
                                icon: BxIcon.QUESTION,
                                style: ButtonStyle.GHOST,
                                url: settingGroup.help_url,
                                title: t('help'),
                            }),
                    ));
                if (settingGroup.note) {
                    if (typeof settingGroup.note === 'string') {
                        settingGroup.note = document.createTextNode(settingGroup.note);
                    }
                    $group.appendChild(settingGroup.note);
                }

                if (settingGroup.content) {
                    $group.appendChild(settingGroup.content);
                    continue;
                }

                if (!settingGroup.items) {
                    settingGroup.items = [];
                }

                for (const setting of settingGroup.items) {
                    if (!setting) {
                        continue;
                    }

                    const pref = setting.pref;

                    let $control;
                    if (setting.content) {
                        $control = setting.content;
                    } else if (!setting.unsupported) {
                        $control = toPrefElement(pref, setting.onChange, setting.params);

                        if ($control instanceof HTMLSelectElement && BX_FLAGS.ScriptUi === 'tv') {
                            $control = BxSelectElement.wrap($control);
                        }
                    }

                    const label = Preferences.SETTINGS[pref as PrefKey]?.label || setting.label;
                    const note = Preferences.SETTINGS[pref as PrefKey]?.note || setting.note;

                    const $content = CE('div', {'class': 'bx-stream-settings-row', 'data-type': settingGroup.group},
                        CE('label', {for: `bx_setting_${pref}`},
                            label,
                            note && CE('div', {'class': 'bx-stream-settings-dialog-note'}, note),
                            setting.unsupported && CE('div', {'class': 'bx-stream-settings-dialog-note'}, t('browser-unsupported-feature')),
                        ),
                        !setting.unsupported && $control,
                    );

                    $group.appendChild($content);

                    setting.onMounted && setting.onMounted($control);
                }
            }

            $settings.appendChild($group);
        }

        // Select first tab
        $tabs.firstElementChild!.dispatchEvent(new Event('click'));

        document.documentElement.appendChild($overlay);
        document.documentElement.appendChild($container);
    }
}
