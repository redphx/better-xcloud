import { STATES } from "@utils/global";
import { CE, createButton, ButtonStyle, createSvgIcon } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { UserAgent } from "@utils/user-agent";
import { BxEvent } from "@utils/bx-event";
import { MkbRemapper } from "@modules/mkb/mkb-remapper";
import { getPref, PrefKey, toPrefElement } from "@utils/preferences";
import { setupScreenshotButton } from "@modules/screenshot";
import { StreamStats } from "@modules/stream/stream-stats";
import { TouchController } from "@modules/touch-controller";
import { t } from "@utils/translation";
import { VibrationManager } from "@modules/vibration-manager";


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

function setupQuickSettingsBar() {
    const isSafari = UserAgent.isSafari();

    const SETTINGS_UI = [
        getPref(PrefKey.MKB_ENABLED) && {
            icon: BxIcon.MOUSE,
            group: 'mkb',
            items: [
                {
                    group: 'mkb',
                    label: t('mouse-and-keyboard'),
                    help_url: 'https://better-xcloud.github.io/mouse-and-keyboard/',
                    content: MkbRemapper.INSTANCE.render(),
                },
            ],
        },

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
                            label: t('volume'),
                            onChange: (e: any, value: number) => {
                                STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
                            },
                            params: {
                                disabled: !getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL),
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
                            label: t('ratio'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: PrefKey.VIDEO_CLARITY,
                            label: t('clarity'),
                            onChange: updateVideoPlayerCss,
                            unsupported: isSafari,
                        },

                        {
                            pref: PrefKey.VIDEO_SATURATION,
                            label: t('saturation'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: PrefKey.VIDEO_CONTRAST,
                            label: t('contrast'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: PrefKey.VIDEO_BRIGHTNESS,
                            label: t('brightness'),
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
                            label: t('controller-vibration'),
                            unsupported: !VibrationManager.supportControllerVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        {
                            pref: PrefKey.CONTROLLER_DEVICE_VIBRATION,
                            label: t('device-vibration'),
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
                            pref: PrefKey.CONTROLLER_VIBRATION_INTENSITY,
                            label: t('vibration-intensity'),
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },
                    ],
                },

                STATES.hasTouchSupport && {
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

                                        const $option = CE('option', {value: key}, layout.name);
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

        {
            icon: BxIcon.STREAM_STATS,
            group: 'stats',
            items: [
                {
                    group: 'stats',
                    label: t('menu-stream-stats'),
                    help_url: 'https://better-xcloud.github.io/stream-stats/',
                    items: [
                        {
                            pref: PrefKey.STATS_SHOW_WHEN_PLAYING,
                            label: t('show-stats-on-startup'),
                        },
                        {
                            pref: PrefKey.STATS_QUICK_GLANCE,
                            label: '👀 ' + t('enable-quick-glance-mode'),
                            onChange: (e: InputEvent) => {
                                (e.target! as HTMLInputElement).checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
                            },
                        },
                        {
                            pref: PrefKey.STATS_ITEMS,
                            label: t('stats'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_POSITION,
                            label: t('position'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_TEXT_SIZE,
                            label: t('text-size'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_OPACITY,
                            label: t('opacity'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_TRANSPARENT,
                            label: t('transparent-background'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: PrefKey.STATS_CONDITIONAL_FORMATTING,
                            label: t('conditional-formatting'),
                            onChange: StreamStats.refreshStyles,
                        },
                    ],
                },
            ],
        },
    ];

    let $tabs: HTMLElement;
    let $settings: HTMLElement;

    const $wrapper = CE<HTMLElement>('div', {'class': 'bx-quick-settings-bar bx-gone'},
            $tabs = CE<HTMLElement>('div', {'class': 'bx-quick-settings-tabs'}),
            $settings = CE<HTMLElement>('div', {'class': 'bx-quick-settings-tab-contents'}),
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

                const $content = CE<HTMLElement>('div', {'class': 'bx-quick-settings-row', 'data-type': settingGroup.group},
                            CE('label', {for: `bx_setting_${pref}`},
                            setting.label,
                            setting.unsupported && CE<HTMLElement>('div', {'class': 'bx-quick-settings-bar-note'}, t('browser-unsupported-feature')),
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
        STATES.currentStream.$screenshotCanvas!.getContext('2d')!.filter = filters;
    }

    const PREF_RATIO = getPref(PrefKey.VIDEO_RATIO);
    if (PREF_RATIO && PREF_RATIO !== '16:9') {
        if (PREF_RATIO.includes(':')) {
            videoCss += `aspect-ratio: ${PREF_RATIO.replace(':', '/')}; object-fit: unset !important;`;

            const tmp = PREF_RATIO.split(':');
            const ratio = parseFloat(tmp[0]) / parseFloat(tmp[1]);
            const maxRatio = window.innerWidth / window.innerHeight;
            if (ratio < maxRatio) {
                videoCss += 'width: fit-content !important;'
            } else {
                videoCss += 'height: fit-content !important;'
            }
        } else {
            videoCss += `object-fit: ${PREF_RATIO} !important;`;
        }
    }

    let css = '';
    if (videoCss) {
        css = `
div[data-testid="media-container"] {
    display: flex;
}

#game-stream video {
    margin: 0 auto;
    align-self: center;
    background: #000;
    ${videoCss}
}
`;
    }

    $elm.textContent = css;
}

export function setupBxUi() {
    // Prevent initializing multiple times
    if (!document.querySelector('.bx-quick-settings-bar')) {
        window.addEventListener('resize', updateVideoPlayerCss);
        setupQuickSettingsBar();
        setupScreenshotButton();
        StreamStats.render();
    }

    updateVideoPlayerCss();
}
