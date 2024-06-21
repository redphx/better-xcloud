import { AppInterface, STATES } from "@utils/global";
import { CE, createButton, ButtonStyle, createSvgIcon } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { BxEvent } from "@utils/bx-event";
import { MkbRemapper } from "@modules/mkb/mkb-remapper";
import { getPref, Preferences, PrefKey, setPref, toPrefElement } from "@utils/preferences";
import { StreamStats } from "@modules/stream/stream-stats";
import { TouchController } from "@modules/touch-controller";
import { t } from "@utils/translation";
import { VibrationManager } from "@modules/vibration-manager";
import { Screenshot } from "@/utils/screenshot";
import { ControllerShortcut } from "../controller-shortcut";
import { SoundShortcut } from "../shortcuts/shortcut-sound";
import { NativeMkbHandler } from "../mkb/native-mkb-handler";
import { UserAgent } from "@/utils/user-agent";
import type { StreamPlayerOptions } from "../stream-player";
import { StreamPlayerType, StreamVideoProcessing } from "@enums/stream-player";


export function localRedirect(path: string) {
    const url = window.location.href.substring(0, 31) + path;

    const $pageContent = document.getElementById('PageContent');
    if (!$pageContent) {
        return;
    }

    const $anchor = CE<HTMLAnchorElement>('a', {
            href: url,
            class: 'bx-hidden bx-offscreen'
        }, '');
    $anchor.addEventListener('click', e => {
        // Remove element after clicking on it
        window.setTimeout(() => {
            $pageContent.removeChild($anchor);
        }, 1000);
    });

    $pageContent.appendChild($anchor);
    $anchor.click();
}

function setupStreamSettingsDialog() {
    const SETTINGS_UI = [
        {
            icon: BxIcon.DISPLAY,
            group: 'stream',
            items: [
                {
                    group: 'audio',
                    label: t('audio'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#audio',
                    items: [
                        {
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
                        },
                    ],
                },

                {
                    group: 'video',
                    label: t('video'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#video',
                    items: [
                        {
                            pref: PrefKey.VIDEO_PLAYER_TYPE,
                            onChange: onChangeVideoPlayerType,
                        },

                        {
                            pref: PrefKey.VIDEO_RATIO,
                            onChange: updateVideoPlayer,
                        },

                        {
                            pref: PrefKey.VIDEO_PROCESSING,
                            onChange: updateVideoPlayer,
                        },

                        {
                            pref: PrefKey.VIDEO_SHARPNESS,
                            onChange: updateVideoPlayer,
                        },

                        {
                            pref: PrefKey.VIDEO_SATURATION,
                            onChange: updateVideoPlayer,
                        },

                        {
                            pref: PrefKey.VIDEO_CONTRAST,
                            onChange: updateVideoPlayer,
                        },

                        {
                            pref: PrefKey.VIDEO_BRIGHTNESS,
                            onChange: updateVideoPlayer,
                        },
                    ],
                },
            ],
        },

        {
            icon: BxIcon.CONTROLLER,
            group: 'controller',
            items: [
                {
                    group: 'controller',
                    label: t('controller'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#controller',
                    items: [
                        {
                            pref: PrefKey.CONTROLLER_ENABLE_VIBRATION,
                            unsupported: !VibrationManager.supportControllerVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        {
                            pref: PrefKey.CONTROLLER_DEVICE_VIBRATION,
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
                            pref: PrefKey.CONTROLLER_VIBRATION_INTENSITY,
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },
                    ],
                },

                STATES.userAgentHasTouchSupport && {
                    group: 'touch-controller',
                    label: t('touch-controller'),
                    items: [
                        {
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
                        },
                    ],
                }
            ],
        },

        getPref(PrefKey.MKB_ENABLED) && {
            icon: BxIcon.VIRTUAL_CONTROLLER,
            group: 'mkb',
            items: [
                {
                    group: 'mkb',
                    label: t('virtual-controller'),
                    help_url: 'https://better-xcloud.github.io/mouse-and-keyboard/',
                    content: MkbRemapper.INSTANCE.render(),
                },
            ],
        },

        AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' && {
            icon: BxIcon.NATIVE_MKB,
            group: 'native-mkb',
            items: [
                {
                    group: 'native-mkb',
                    label: t('native-mkb'),
                    items: [
                        {
                            pref: PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY,
                            onChange: (e: any, value: number) => {
                                NativeMkbHandler.getInstance().setVerticalScrollMultiplier(value / 100);
                            },
                        },
                        {
                            pref: PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY,
                            onChange: (e: any, value: number) => {
                                NativeMkbHandler.getInstance().setHorizontalScrollMultiplier(value / 100);
                            },
                        },
                    ],
                },
            ],
        },

        {
            icon: BxIcon.COMMAND,
            group: 'shortcuts',
            items: [
                {
                    group: 'shortcuts_controller',
                    label: t('controller-shortcuts'),
                    content: ControllerShortcut.renderSettings(),
                },
            ],
        },

        {
            icon: BxIcon.STREAM_STATS,
            group: 'stats',
            items: [
                {
                    group: 'stats',
                    label: t('stream-stats'),
                    help_url: 'https://better-xcloud.github.io/stream-stats/',
                    items: [
                        {
                            pref: PrefKey.STATS_SHOW_WHEN_PLAYING,
                        },
                        {
                            pref: PrefKey.STATS_QUICK_GLANCE,
                            onChange: (e: InputEvent) => {
                                const streamStats = StreamStats.getInstance();
                                (e.target! as HTMLInputElement).checked ? streamStats.quickGlanceSetup() : streamStats.quickGlanceStop();
                            },
                        },
                        {
                            pref: PrefKey.STATS_ITEMS,
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_POSITION,
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_TEXT_SIZE,
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_OPACITY,
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_TRANSPARENT,
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_CONDITIONAL_FORMATTING,
                            onChange: StreamStats.refreshStyles,
                        },
                    ],
                },
            ],
        },
    ];

    let $tabs: HTMLElement;
    let $settings: HTMLElement;

    const $wrapper = CE<HTMLElement>('div', {'class': 'bx-stream-settings-dialog bx-gone'},
            $tabs = CE<HTMLElement>('div', {'class': 'bx-stream-settings-tabs'}),
            $settings = CE<HTMLElement>('div', {'class': 'bx-stream-settings-tab-contents'}),
        );

    for (const settingTab of SETTINGS_UI) {
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

        const $group = CE<HTMLElement>('div', {'data-group': settingTab.group, 'class': 'bx-gone'});

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

    document.documentElement.appendChild($wrapper);
}


function onChangeVideoPlayerType() {
    const playerType = getPref(PrefKey.VIDEO_PLAYER_TYPE);
    const $videoProcessing = document.getElementById('bx_setting_video_processing') as HTMLSelectElement;
    const $videoSharpness = document.getElementById('bx_setting_video_sharpness') as HTMLElement;

    let isDisabled = false;

    if (playerType === StreamPlayerType.WEBGL2) {
        ($videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`) as HTMLOptionElement).disabled = false;
    } else {
        // Only allow USM when player type is Video
        $videoProcessing.value = StreamVideoProcessing.USM;
        setPref(PrefKey.VIDEO_PROCESSING, StreamVideoProcessing.USM);

        ($videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`) as HTMLOptionElement).disabled = true;

        if (UserAgent.isSafari()) {
            isDisabled = true;
        }
    }

    $videoProcessing.disabled = isDisabled;
    $videoSharpness.dataset.disabled = isDisabled.toString();

    updateVideoPlayer();
}


export function updateVideoPlayer() {
    const streamPlayer = STATES.currentStream.streamPlayer;
    if (!streamPlayer) {
        return;
    }

    const options = {
        processing: getPref(PrefKey.VIDEO_PROCESSING),
        sharpness: getPref(PrefKey.VIDEO_SHARPNESS),
        saturation: getPref(PrefKey.VIDEO_SATURATION),
        contrast: getPref(PrefKey.VIDEO_CONTRAST),
        brightness: getPref(PrefKey.VIDEO_BRIGHTNESS),
    } satisfies StreamPlayerOptions;

    streamPlayer.setPlayerType(getPref(PrefKey.VIDEO_PLAYER_TYPE));
    streamPlayer.updateOptions(options);
    streamPlayer.refreshPlayer();
}


function preloadFonts() {
    const $link = CE<HTMLLinkElement>('link', {
            rel: 'preload',
            href: 'https://redphx.github.io/better-xcloud/fonts/promptfont.otf',
            as: 'font',
            type: 'font/otf',
            crossorigin: '',
        });

    document.querySelector('head')?.appendChild($link);
}


export function setupStreamUi() {
    // Prevent initializing multiple times
    if (!document.querySelector('.bx-stream-settings-dialog')) {
        preloadFonts();

        window.addEventListener('resize', updateVideoPlayer);
        setupStreamSettingsDialog();

        Screenshot.setup();
    }

    onChangeVideoPlayerType();
}
