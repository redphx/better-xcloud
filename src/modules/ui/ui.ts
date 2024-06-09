import { AppInterface, STATES } from "@utils/global";
import { CE, createButton, ButtonStyle, createSvgIcon } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { UserAgent } from "@utils/user-agent";
import { BxEvent } from "@utils/bx-event";
import { MkbRemapper } from "@modules/mkb/mkb-remapper";
import { getPref, Preferences, PrefKey, toPrefElement } from "@utils/preferences";
import { StreamStats } from "@modules/stream/stream-stats";
import { TouchController } from "@modules/touch-controller";
import { t } from "@utils/translation";
import { VibrationManager } from "@modules/vibration-manager";
import { Screenshot } from "@/utils/screenshot";
import { ControllerShortcut } from "../controller-shortcut";
import { SoundShortcut } from "../shortcuts/shortcut-sound";
import { NativeMkbHandler } from "../mkb/native-mkb-handler";


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


function getVideoPlayerFilterStyle() {
    const filters = [];

    const clarity = getPref(PrefKey.VIDEO_CLARITY);
    if (clarity != 0) {
        const level = (7 - (clarity - 1) * 0.5).toFixed(1); // 5, 5.5, 6, 6.5, 7
        const matrix = `0 -1 0 -1 ${level} -1 0 -1 0`;
        document.getElementById('bx-filter-clarity-matrix')!.setAttributeNS(null, 'kernelMatrix', matrix);

        filters.push(`url(#bx-filter-clarity)`);
    }

    const saturation = getPref(PrefKey.VIDEO_SATURATION);
    if (saturation != 100) {
        filters.push(`saturate(${saturation}%)`);
    }

    const contrast = getPref(PrefKey.VIDEO_CONTRAST);
    if (contrast != 100) {
        filters.push(`contrast(${contrast}%)`);
    }

    const brightness = getPref(PrefKey.VIDEO_BRIGHTNESS);
    if (brightness != 100) {
        filters.push(`brightness(${brightness}%)`);
    }

    return filters.join(' ');
}

function setupStreamSettingsDialog() {
    const isSafari = UserAgent.isSafari();

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
                            pref: PrefKey.VIDEO_RATIO,
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: PrefKey.VIDEO_CLARITY,
                            onChange: updateVideoPlayerCss,
                            unsupported: isSafari,
                        },

                        {
                            pref: PrefKey.VIDEO_SATURATION,
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: PrefKey.VIDEO_CONTRAST,
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: PrefKey.VIDEO_BRIGHTNESS,
                            onChange: updateVideoPlayerCss,
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


export function updateVideoPlayerCss() {
    let $elm = document.getElementById('bx-video-css');
    if (!$elm) {
        const $fragment = document.createDocumentFragment();
        $elm = CE<HTMLStyleElement>('style', {id: 'bx-video-css'});
        $fragment.appendChild($elm);

        // Setup SVG filters
        const $svg = CE('svg', {
            'id': 'bx-video-filters',
            'xmlns': 'http://www.w3.org/2000/svg',
            'class': 'bx-gone',
        }, CE('defs', {'xmlns': 'http://www.w3.org/2000/svg'},
              CE('filter', {'id': 'bx-filter-clarity', 'xmlns': 'http://www.w3.org/2000/svg'},
                CE('feConvolveMatrix', {'id': 'bx-filter-clarity-matrix', 'order': '3', 'xmlns': 'http://www.w3.org/2000/svg'}))
             )
        );
        $fragment.appendChild($svg);
        document.documentElement.appendChild($fragment);
    }

    let filters = getVideoPlayerFilterStyle();
    let videoCss = '';
    if (filters) {
        videoCss += `filter: ${filters} !important;`;
    }

    // Apply video filters to screenshots
    if (getPref(PrefKey.SCREENSHOT_APPLY_FILTERS)) {
        Screenshot.updateCanvasFilters(filters);
    }

    let css = '';
    if (videoCss) {
        css = `
#game-stream video {
    ${videoCss}
}
`;
    }

    $elm.textContent = css;

    resizeVideoPlayer();
}

function resizeVideoPlayer() {
    const $video = STATES.currentStream.$video;
    if (!$video || !$video.parentElement) {
        return;
    }

    const PREF_RATIO = getPref(PrefKey.VIDEO_RATIO);
    if (PREF_RATIO.includes(':')) {
        const tmp = PREF_RATIO.split(':');

        // Get preferred ratio
        const videoRatio = parseFloat(tmp[0]) / parseFloat(tmp[1]);

        let width = 0;
        let height = 0;

        // Get parent's ratio
        const parentRect = $video.parentElement.getBoundingClientRect();
        const parentRatio = parentRect.width / parentRect.height;

        // Get target width & height
        if (parentRatio > videoRatio) {
            height = parentRect.height;
            width = height * videoRatio;
        } else {
            width = parentRect.width;
            height = width / videoRatio;
        }

        // Prevent floating points
        width = Math.min(parentRect.width, Math.ceil(width));
        height = Math.min(parentRect.height, Math.ceil(height));

        // Update size
        $video.style.width = `${width}px`;
        $video.style.height = `${height}px`;
        $video.style.objectFit = PREF_RATIO === '16:9' ? 'contain' : 'fill';
    } else {
        $video.style.width = '100%';
        $video.style.height = '100%';
        $video.style.objectFit = PREF_RATIO;
    }
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

        window.addEventListener('resize', updateVideoPlayerCss);
        setupStreamSettingsDialog();

        Screenshot.setup();
    }

    updateVideoPlayerCss();
}
