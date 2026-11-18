import { isFullVersion } from "@macros/build" with { type: "macro" };

import { onChangeVideoPlayerType } from "@/modules/stream/stream-settings-utils";
import { ButtonStyle, calculateSelectBoxes, CE, createButton, createSettingRow, createSvgIcon, escapeCssSelector, type BxButtonOptions } from "@/utils/html";
import { NavigationDialog, NavigationDirection } from "./navigation-dialog";
import { TouchController } from "@/modules/touch-controller";
import { BxEvent } from "@/utils/bx-event";
import { BxIcon, type BxIconRaw } from "@/utils/bx-icon";
import { STATES, AppInterface, deepClone, SCRIPT_VERSION, SCRIPT_VARIANT } from "@/utils/global";
import { t, Translations } from "@/utils/translation";
import { BxSelectElement } from "@/web-components/bx-select";
import { setNearby } from "@/utils/navigation-utils";
import { PatcherCache } from "@/modules/patcher/patcher";
import { UserAgentProfile } from "@/enums/user-agent";
import { UserAgent } from "@/utils/user-agent";
import { BX_FLAGS } from "@/utils/bx-flags";
import { clearAllData, copyToClipboard } from "@/utils/utils";
import { GlobalPref, StorageKey, StreamPref, type AnyPref } from "@/enums/pref-keys";
import { StreamResolution } from "@/enums/pref-values";
import { SettingElement } from "@/utils/setting-element";
import type { SettingDefinition, SuggestedSettingProfile } from "@/types/setting-definition";
import { FullscreenText } from "../fullscreen-text";
import { BxLogger } from "@/utils/bx-logger";
import { GamepadKey } from "@/enums/gamepad";
import { NativeMkbHandler } from "@/modules/mkb/native-mkb-handler";
import { ControllerExtraSettings } from "./settings/controller-extra";
import { SuggestionsSetting } from "./settings/suggestions";
import { MkbExtraSettings } from "./settings/mkb-extra";
import { BxEventBus } from "@/utils/bx-event-bus";
import { getGlobalPref, getPrefInfo, getStreamPref, isStreamPref, setGlobalPref, STORAGE } from "@/utils/pref-utils";
import { SettingsManager } from "@/modules/settings-manager";


type SettingTabSectionItem = Partial<{
    pref: AnyPref;
    multiLines: boolean;
    label: string;
    note: string | (() => HTMLElement) | HTMLElement;
    experimental: string;
    content: HTMLElement | (() => HTMLElement);
    options: { [key: string]: string };
    unsupported: boolean;
    unsupportedNote: string;
    // onChange: (e: any, value: number) => void;
    onCreated: (setting: SettingTabSectionItem, $control: any) => void;
    params: any;
    requiredVariants?: BuildVariant | Array<BuildVariant>;
}>

type SettingTabSection = {
    group: 'general' | 'server' | 'stream' | 'game-bar' | 'mkb' | 'touch-control' | 'loading-screen' | 'ui' | 'other' | 'advanced' | 'footer' | 'data'
        | 'audio' | 'video'
        | 'device' | 'controller' | 'mkb' | 'native-mkb'
        | 'stats';
    label?: string;
    unsupported?: boolean;
    unsupportedNote?: HTMLElement | string | Text | null;
    helpUrl?: string;
    content?: HTMLElement;
    items?: Array<SettingTabSectionItem | AnyPref | (($parent: HTMLElement) => void) | false>;
    requiredVariants?: BuildVariant | Array<BuildVariant>;
};

type SettingTab = {
    icon: BxIconRaw;
    group: SettingTabGroup,
    items: Array<SettingTabSection | HTMLElement | false>;
    requiredVariants?: BuildVariant | Array<BuildVariant>;
};

type SettingTabGroup = 'global' | 'stream' | 'controller' | 'mkb' | 'stats';

export class SettingsDialog extends NavigationDialog {
    private static instance: SettingsDialog;
    public static getInstance = () => SettingsDialog.instance ?? (SettingsDialog.instance = new SettingsDialog());
    private readonly LOG_TAG = 'SettingsNavigationDialog';

    $container!: HTMLElement;
    private $tabs!: HTMLElement;
    private $tabContents!: HTMLElement;

    private $btnReload!: HTMLElement;
    private $btnGlobalReload!: HTMLButtonElement;
    private $noteGlobalReload!: HTMLElement;
    private $btnSuggestion!: HTMLDivElement;
    private $streamSettingsSelection!: HTMLElement;

    private renderFullSettings: boolean;
    protected boundOnContextMenu: any;

    protected suggestedSettings: Record<SuggestedSettingProfile, PartialRecord<AnyPref, any>> = {
        recommended: {},
        default: {},
        lowest: {},
        highest: {},
    };
    protected settingLabels: PartialRecord<AnyPref, string> = {};

    protected settingsManager: SettingsManager;

    private readonly TAB_GLOBAL_ITEMS: Array<SettingTabSection | false> = [{
        group: 'general',
        label: t('better-xcloud'),
        helpUrl: 'https://better-xcloud.github.io/features/',
        items: [
            // Top buttons
            ($parent) => {
                const PREF_LATEST_VERSION = getGlobalPref(GlobalPref.VERSION_LATEST);
                const topButtons = [];

                // "New version available" button
                if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
                    // Show new version button
                    const opts = {
                        label: '🌟 ' + t('new-version-available', { version: PREF_LATEST_VERSION }),
                        style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
                    } as BxButtonOptions;

                    if (AppInterface && AppInterface.updateLatestScript) {
                        opts.onClick = e => AppInterface.updateLatestScript();
                    } else {
                        opts.url = 'https://github.com/redphx/better-xcloud/releases/latest';
                    }

                    topButtons.push(createButton(opts));
                }

                // Buttons for Android app
                if (AppInterface) {
                    // Show Android app settings button
                    topButtons.push(createButton({
                        label: t('app-settings'),
                        icon: BxIcon.STREAM_SETTINGS,
                        style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                        onClick: e => {
                            AppInterface.openAppSettings && AppInterface.openAppSettings();
                            this.hide();
                        },
                    }));
                } else {
                    // Show link to Android app
                    const userAgent = UserAgent.getDefault().toLowerCase();
                    if (userAgent.includes('android')) {
                        topButtons.push(createButton({
                            label: '🔥 ' + t('install-android'),
                            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                            url: 'https://better-xcloud.github.io/android',
                        }));
                    }
                }

                this.$btnGlobalReload = createButton({
                    label: t('settings-reload'),
                    classes: ['bx-settings-reload-button', 'bx-gone'],
                    style: ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
                    onClick: e => {
                        this.reloadPage();
                    },
                });

                topButtons.push(this.$btnGlobalReload);

                this.$noteGlobalReload = CE('span', {
                    class: 'bx-settings-reload-note',
                }, t('settings-reload-note'));
                topButtons.push(this.$noteGlobalReload);

                // Suggestion
                this.$btnSuggestion = CE('div', {
                    class: 'bx-suggest-toggler bx-focusable',
                    tabindex: 0,
                }, CE('label', false, t('suggest-settings')),
                    CE('span', false, '❯'),
                );
                this.$btnSuggestion.addEventListener('click', SuggestionsSetting.renderSuggestions.bind(this));

                topButtons.push(this.$btnSuggestion);

                // Add buttons to parent
                const $div = CE('div', {
                    class: 'bx-top-buttons',
                    _nearby: {
                        orientation: 'vertical',
                    }
                }, ...topButtons);
                $parent.appendChild($div);
            },

            {
                pref: GlobalPref.SCRIPT_LOCALE,
                multiLines: true,
            },
            GlobalPref.SERVER_BYPASS_RESTRICTION,
            GlobalPref.UI_CONTROLLER_FRIENDLY,
        ],
    }, {
        group: 'server',
        label: t('server'),
        items: [
            {
                pref: GlobalPref.SERVER_REGION,
                multiLines: true,
            },
            {
                pref: GlobalPref.STREAM_PREFERRED_LOCALE,
                multiLines: true,
            },
            GlobalPref.SERVER_PREFER_IPV6,
        ],
    }, {
        group: 'stream',
        label: t('stream'),
        items: [
            GlobalPref.STREAM_RESOLUTION,
            GlobalPref.STREAM_CODEC_PROFILE,
            GlobalPref.STREAM_MAX_VIDEO_BITRATE,
            GlobalPref.STREAM_PREVENT_RESOLUTION_DROPS,

            GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED,

            GlobalPref.SCREENSHOT_APPLY_FILTERS,

            GlobalPref.AUDIO_MIC_ON_PLAYING,
            GlobalPref.GAME_FORTNITE_FORCE_CONSOLE,
            GlobalPref.STREAM_COMBINE_SOURCES,
        ],
    }, {
        group: 'data',
        label: t('data-usage'),
        items: [
            ($parent) => {
                const MAX_BITRATE = 15 * 1024 * 1000; // max du slider — transformValue.set mappe MAX → 0 (stocké = illimité)
                const PRESETS = [
                    {
                        label: t('data-preset-max'),
                        summary: t('data-preset-max-summary'),
                        bitrate: MAX_BITRATE,
                        resolution: StreamResolution.AUTO,
                    },
                    {
                        label: t('data-preset-balanced'),
                        summary: t('data-preset-balanced-summary'),
                        bitrate: 10 * 1024 * 1000,
                        resolution: StreamResolution.AUTO,
                    },
                    {
                        label: t('data-preset-eco'),
                        summary: t('data-preset-eco-summary'),
                        bitrate: 5 * 1024 * 1000,
                        resolution: StreamResolution.DIM_720P,
                    },
                ];

                const $note = CE('div', {
                    class: 'bx-settings-dialog-note',
                }, t('data-usage-note'));
                const $status = CE('div', {
                    class: 'bx-settings-dialog-note',
                });

                const formatBitrate = (value: number) => {
                    // transformValue.get mappe le stocké 0 → MAX_BITRATE (illimité)
                    if (!value || value >= MAX_BITRATE) {
                        return t('unlimited');
                    }

                    return (value / (1024 * 1000)).toFixed(1) + ' Mb/s';
                };

                const refresh = () => {
                    const bitrate = getGlobalPref(GlobalPref.STREAM_MAX_VIDEO_BITRATE);
                    const resolution = getGlobalPref(GlobalPref.STREAM_RESOLUTION);

                    $status.textContent = `${t('data-current')} ${formatBitrate(bitrate)} · ${resolution}`;
                };

                refresh();

                for (const preset of PRESETS) {
                    const $btn = createButton({
                        label: preset.label,
                        secondaryText: preset.summary,
                        style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                        onClick: e => {
                            setGlobalPref(GlobalPref.STREAM_MAX_VIDEO_BITRATE, preset.bitrate, 'ui');
                            setGlobalPref(GlobalPref.STREAM_RESOLUTION, preset.resolution, 'ui');

                            refresh();
                            $note.textContent = '✅ ' + preset.label + ' — ' + t('data-applied');
                            this.onGlobalSettingChanged(e);
                        },
                    });

                    $parent.appendChild($btn);
                }

                $parent.appendChild($note);
                $parent.appendChild($status);
            },
        ],
    }, {
        requiredVariants: 'full',
        group: 'mkb',
        label: t('mouse-and-keyboard'),
        items: [
            GlobalPref.NATIVE_MKB_MODE,
            {
                pref: GlobalPref.NATIVE_MKB_FORCED_GAMES,
                multiLines: true,
                note: CE('a', { href: 'https://github.com/redphx/better-xcloud/discussions/574', target: '_blank' }, t('unofficial-game-list')),
            },

            GlobalPref.MKB_ENABLED,
            GlobalPref.MKB_HIDE_IDLE_CURSOR,
        ],

        // Unsupported
        ...(!STATES.browser.capabilities.emulatedNativeMkb && (!STATES.userAgent.capabilities.mkb || !STATES.browser.capabilities.mkb) ? {
            unsupported: true,
            unsupportedNote: CE('a', {
                href: 'https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657',
                target: '_blank',
            }, '⚠️ ' + t('browser-unsupported-feature')),
        } : {}),
    }, {
        requiredVariants: 'full',
        group: 'touch-control',
        label: t('touch-controller'),
        items: [
            {
                pref: GlobalPref.TOUCH_CONTROLLER_MODE,
                note: CE('a', { href: 'https://github.com/redphx/better-xcloud/discussions/241', target: '_blank' }, t('unofficial-game-list')),
            },
            GlobalPref.TOUCH_CONTROLLER_AUTO_OFF,
            GlobalPref.TOUCH_CONTROLLER_DEFAULT_OPACITY,
            GlobalPref.TOUCH_CONTROLLER_STYLE_STANDARD,
            GlobalPref.TOUCH_CONTROLLER_STYLE_CUSTOM,
        ],

        // Unsupported
        ...(!STATES.userAgent.capabilities.touch ? {
            unsupported: true,
            unsupportedNote: '⚠️ ' + t('device-unsupported-touch'),
        } : {}),
    }, {
        group: 'ui',
        label: t('ui'),
        items: [
            GlobalPref.UI_LAYOUT,
            GlobalPref.UI_THEME,
            GlobalPref.UI_IMAGE_QUALITY,
            GlobalPref.UI_GAME_CARD_SHOW_WAIT_TIME,
            GlobalPref.UI_CONTROLLER_SHOW_STATUS,
            GlobalPref.UI_SIMPLIFY_STREAM_MENU,
            GlobalPref.UI_SKIP_SPLASH_VIDEO,
            !AppInterface && GlobalPref.UI_SCROLLBAR_HIDE,
            GlobalPref.UI_HIDE_SYSTEM_MENU_ICON,
            GlobalPref.UI_DISABLE_FEEDBACK_DIALOG,
            GlobalPref.UI_REDUCE_ANIMATIONS,
            {
                pref: GlobalPref.UI_HIDE_SECTIONS,
                multiLines: true,
            },
            {
                pref: GlobalPref.BLOCK_FEATURES,
                multiLines: true,
            },
        ],
    }, {
        requiredVariants: 'full',
        group: 'game-bar',
        label: t('game-bar'),
        items: [
            GlobalPref.GAME_BAR_POSITION,
        ],
    }, {
        group: 'loading-screen',
        label: t('loading-screen'),
        items: [
            GlobalPref.LOADING_SCREEN_GAME_ART,
            GlobalPref.LOADING_SCREEN_SHOW_WAIT_TIME,
            GlobalPref.LOADING_SCREEN_ROCKET,
        ],
    }, {
        group: 'other',
        label: t('other'),
        items: [
            GlobalPref.BLOCK_TRACKING,
        ],
    }, isFullVersion() && {
        group: 'advanced',
        label: t('advanced'),
        items: [
            {
                pref: GlobalPref.USER_AGENT_PROFILE,
                multiLines: true,
                onCreated: (setting, $control) => {
                    const defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent;

                    const $inpCustomUserAgent = CE('input', {
                        type: 'text',
                        placeholder: defaultUserAgent,
                        autocomplete: 'off',
                        class: 'bx-settings-custom-user-agent',
                        tabindex: 0,
                    });

                    $inpCustomUserAgent.addEventListener('input', e => {
                        const profile = $control.value;
                        const custom = (e.target as HTMLInputElement).value.trim();

                        UserAgent.updateStorage(profile, custom);
                        this.onGlobalSettingChanged(e);
                    });

                    $control.insertAdjacentElement('afterend', $inpCustomUserAgent);

                    setNearby($inpCustomUserAgent.parentElement!, {
                        orientation: 'vertical',
                    });
                },
            },
        ],
    }, {
        group: 'footer',
        items: [
            // xCloud version
            $parent => {
                try {
                    const appVersion = document.querySelector<HTMLMetaElement>('meta[name=gamepass-app-version]')!.content;
                    const appDate = new Date(document.querySelector<HTMLMetaElement>('meta[name=gamepass-app-date]')!.content).toISOString().substring(0, 10);
                    $parent.appendChild(CE('div', {
                        class: 'bx-settings-app-version',
                    }, `xCloud website version ${appVersion} (${appDate})`));
                } catch (e) {}
            },

            // Donation link
            $parent => {
                $parent.appendChild(CE('a', {
                    class: 'bx-donation-link',
                    href: 'https://ko-fi.com/redphx',
                    target: '_blank',
                    tabindex: 0,
                }, `❤️ ${t('support-better-xcloud')}`));
            },

            // Clear data
            $parent => {
                $parent.appendChild(createButton({
                    label: t('clear-data'),
                    style: ButtonStyle.DANGER | ButtonStyle.FROSTED | ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                    onClick: e => {
                        if (confirm(t('clear-data-confirm'))) {
                            clearAllData();
                        }
                    },
                }));
            },

            // Debug info
            $parent => {
                $parent.appendChild(CE('div', { class: 'bx-debug-info' },
                    createButton({
                        label: 'Debug info',
                        style: ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                        onClick: e => {
                            const $button = (e.target as HTMLElement).closest('button');
                            if (!$button) {
                                return;
                            }

                            let $pre = $button.nextElementSibling!;
                            if (!$pre) {
                                const debugInfo = deepClone(BX_FLAGS.DeviceInfo);
                                debugInfo['settings'] = JSON.parse(window.localStorage.getItem(StorageKey.GLOBAL) || '{}');

                                $pre = CE('pre', {
                                    class: 'bx-focusable bx-gone',
                                    tabindex: 0,
                                    _on: {
                                        click: async (e: Event) => {
                                            await copyToClipboard((e.target as HTMLElement).innerText);
                                        },
                                    },
                                }, '```\n' + JSON.stringify(debugInfo, null, '  ') + '\n```');

                                $button.insertAdjacentElement('afterend', $pre);
                            }

                            $pre.classList.toggle('bx-gone');
                            $pre.scrollIntoView();
                        },
                    }),
                ));
            },
        ],
    }];

    private readonly TAB_DISPLAY_ITEMS: Array<SettingTabSection | false> = [{
        requiredVariants: 'full',
        group: 'audio',
        label: t('audio'),
        helpUrl: 'https://better-xcloud.github.io/ingame-features/#audio',
        items: [{
            pref: StreamPref.AUDIO_VOLUME,
            params: {
                disabled: !getGlobalPref(GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED),
            },
            onCreated: (setting: SettingTabSectionItem, $elm: HTMLElement) => {
                const $range = $elm.querySelector<HTMLInputElement>('input[type=range')!;

                BxEventBus.Stream.on('setting.changed', payload => {
                    const { settingKey } = payload;
                    if (settingKey === StreamPref.AUDIO_VOLUME) {
                        $range.value = getStreamPref(settingKey).toString();
                        BxEvent.dispatch($range, 'input', { ignoreOnChange: true });
                    }
                });
            },
        }],
    }, {
        group: 'video',
        label: t('video'),
        helpUrl: 'https://better-xcloud.github.io/ingame-features/#video',
        items: [
            StreamPref.VIDEO_PLAYER_TYPE,
            StreamPref.VIDEO_MAX_FPS,
            StreamPref.VIDEO_POWER_PREFERENCE,
            StreamPref.VIDEO_PROCESSING,
            StreamPref.VIDEO_PROCESSING_MODE,
            StreamPref.VIDEO_RATIO,
            StreamPref.VIDEO_POSITION,
            StreamPref.VIDEO_SHARPNESS,
            StreamPref.VIDEO_SATURATION,
            StreamPref.VIDEO_CONTRAST,
            StreamPref.VIDEO_BRIGHTNESS,
        ],
    }];

    private readonly TAB_CONTROLLER_ITEMS: Array<SettingTabSection | HTMLElement | false> = isFullVersion() ? [{
        group: 'controller',
        label: t('controller'),
        helpUrl: 'https://better-xcloud.github.io/ingame-features/#controller',
        items: [
            StreamPref.LOCAL_CO_OP_ENABLED,
            StreamPref.CONTROLLER_POLLING_RATE,
            ($parent => {
                $parent.appendChild(ControllerExtraSettings.renderSettings.apply(this));
            }),
        ],
    },

    STATES.userAgent.capabilities.touch && {
        group: 'touch-control',
        label: t('touch-controller'),
        items: [{
            label: t('layout'),
            content: CE('select', {
                disabled: true,
            }, CE('option', false, t('default'))),
            onCreated: (setting: SettingTabSectionItem, $elm: HTMLSelectElement) => {
                $elm.addEventListener('input', e => {
                    TouchController.applyCustomLayout($elm.value, 1000);
                });

                window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, e => {
                    const customLayouts = TouchController.getCustomLayouts();

                    // Clear options
                    while ($elm.firstChild) {
                        $elm.removeChild($elm.firstChild);
                    }

                    $elm.disabled = !customLayouts;

                    // If there is no custom layouts -> show only Default option
                    if (!customLayouts) {
                        $elm.appendChild(CE('option', { value: '' }, t('default')));
                        $elm.value = '';
                        $elm.dispatchEvent(new Event('input'));
                        return;
                    }

                    // Add options
                    const $fragment = document.createDocumentFragment();
                    for (const key in customLayouts.layouts) {
                        const layout = customLayouts.layouts[key];

                        let name;
                        if (layout.author) {
                            name = `${layout.name} (${layout.author})`;
                        } else {
                            name = layout.name;
                        }

                        const $option = CE('option', { value: key }, name);
                        $fragment.appendChild($option);
                    }

                    $elm.appendChild($fragment);
                    $elm.value = customLayouts.default_layout;
                });
            },
        }],
    },

    STATES.browser.capabilities.deviceVibration && {
        group: 'device',
        label: t('device'),
        items: [{
            pref: StreamPref.DEVICE_VIBRATION_MODE,
            multiLines: true,
            unsupported: !STATES.browser.capabilities.deviceVibration,
        }, {
            pref: StreamPref.DEVICE_VIBRATION_INTENSITY,
            unsupported: !STATES.browser.capabilities.deviceVibration,
        }],
    }] : [];

    private readonly TAB_MKB_ITEMS: Array<SettingTabSection | false> = isFullVersion() ? [
        {
            requiredVariants: 'full',
            group: 'mkb',
            label: t('mouse-and-keyboard'),
            helpUrl: 'https://better-xcloud.github.io/mouse-and-keyboard/',
            items: [
                ($parent: HTMLElement) => {
                    $parent.appendChild(MkbExtraSettings.renderSettings.apply(this));
                },
            ],
        },

        NativeMkbHandler.isAllowed() && {
            requiredVariants: 'full',
            group: 'native-mkb',
            label: t('native-mkb'),
            items: [
                StreamPref.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY,
                StreamPref.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY,
            ],
    }] : [];

    private readonly TAB_STATS_ITEMS: Array<SettingTabSection | false> = [{
        group: 'stats',
        label: t('stream-stats'),
        helpUrl: 'https://better-xcloud.github.io/stream-stats/',
        items: [
            StreamPref.STATS_SHOW_WHEN_PLAYING,
            StreamPref.STATS_QUICK_GLANCE_ENABLED,
            StreamPref.STATS_ITEMS,
            StreamPref.STATS_POSITION,
            StreamPref.STATS_TEXT_SIZE,
            StreamPref.STATS_OPACITY_ALL,
            StreamPref.STATS_OPACITY_BACKGROUND,
            StreamPref.STATS_CONDITIONAL_FORMATTING,
        ],
    }];

    protected readonly SETTINGS_UI: Record<SettingTabGroup, SettingTab | false> = {
        global: {
            group: 'global',
            icon: BxIcon.HOME,
            items: this.TAB_GLOBAL_ITEMS,
        },

        stream: {
            group: 'stream',
            icon: BxIcon.DISPLAY,
            items: this.TAB_DISPLAY_ITEMS,
        },

        controller: {
            group: 'controller',
            icon: BxIcon.CONTROLLER,
            items: this.TAB_CONTROLLER_ITEMS,
            requiredVariants: 'full',
        },

        mkb: isFullVersion() && {
            group: 'mkb',
            icon: BxIcon.NATIVE_MKB,
            items: this.TAB_MKB_ITEMS,
            requiredVariants: 'full',
        },

        stats: {
            group: 'stats',
            icon: BxIcon.STREAM_STATS,
            items: this.TAB_STATS_ITEMS,
        },
    };

    private constructor() {
        super();
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.boundOnContextMenu = this.onContextMenu.bind(this);
        this.settingsManager = SettingsManager.getInstance();
        this.renderFullSettings = STATES.supportedRegion && STATES.isSignedIn;
        this.setupDialog();

        this.onMountedCallbacks.push(() => {
            // Update video's settings
            onChangeVideoPlayerType();

            // Render custom layouts list
            if (STATES.userAgent.capabilities.touch) {
                BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED);
            }

            // Trigger event
            const $selectUserAgent = document.querySelector<HTMLSelectElement>(`#bx_setting_${escapeCssSelector(GlobalPref.USER_AGENT_PROFILE)}`);
            if ($selectUserAgent) {
                $selectUserAgent.disabled = true;
                BxEvent.dispatch($selectUserAgent, 'input', {});
                $selectUserAgent.disabled = false;
            }
        });

        BxEventBus.Stream.on('gameSettings.switched', ({ id }) => {
            this.$tabContents.dataset.gameId = id.toString();
        });
    }

    getDialog(): NavigationDialog {
        return this;
    }

    getContent(): HTMLElement {
        return this.$container;
    }

    onMounted(): void {
        super.onMounted();
    }

    isOverlayVisible(): boolean {
        return !STATES.isPlaying;
    }

    private reloadPage() {
        this.$btnGlobalReload.disabled = true;
        this.$btnGlobalReload.firstElementChild!.textContent = t('settings-reloading');

        this.hide();
        FullscreenText.getInstance().show(t('settings-reloading'));
        window.location.reload();
    }

    private isSupportedVariant(requiredVariants: BuildVariant | Array<BuildVariant> | undefined) {
        if (typeof requiredVariants === 'undefined') {
            return true;
        }

        requiredVariants = typeof requiredVariants === 'string' ? [requiredVariants] : requiredVariants;
        return requiredVariants.includes(SCRIPT_VARIANT);
    }

    private onTabClicked = (e: Event) => {
        const $svg = (e.target as SVGElement).closest('svg')!;

        // Switch tab
        let $child: HTMLElement;
        const children = Array.from(this.$tabContents.children) as HTMLElement[];
        for ($child of children) {
            if ($child.dataset.tabGroup === $svg.dataset.group) {
                // Show tab content
                $child.classList.remove('bx-gone');

                // Calculate size of controller-friendly select boxes
                calculateSelectBoxes($child as HTMLElement);
            } else if ($child.dataset.tabGroup) {
                // Hide tab content
                $child.classList.add('bx-gone');
            }
        }

        // Toggle stream settings selection
        this.$streamSettingsSelection.classList.toggle('bx-gone', $svg.dataset.group === 'global');

        // Highlight current tab button
        for (const $child of Array.from(this.$tabs.children)) {
            $child.classList.remove('bx-active');
        }

        $svg.classList.add('bx-active');
    }

    private renderTab(settingTab: SettingTab) {
        const $svg = createSvgIcon(settingTab.icon as any);
        $svg.dataset.group = settingTab.group;
        $svg.tabIndex = 0;

        $svg.addEventListener('click', this.onTabClicked);
        return $svg;
    }

    private onGlobalSettingChanged = (e: Event) => {
        // Clear PatcherCache;
        isFullVersion() && PatcherCache.getInstance().clear();

        this.$btnReload.classList.add('bx-danger');

        this.$noteGlobalReload.classList.add('bx-gone');
        this.$btnGlobalReload.classList.remove('bx-gone');
        this.$btnGlobalReload.classList.add('bx-danger');
    }

    private onContextMenu(e: Event) {
        e.preventDefault();
        const $elm = e.target;
        $elm instanceof HTMLElement && this.resetHighlightedSetting($elm);
    }

    private renderServerSetting(setting: SettingTabSectionItem): HTMLElement {
        let selectedValue = getGlobalPref(GlobalPref.SERVER_REGION);

        const continents: Record<ServerContinent, {
            label: string,
            children?: HTMLOptionElement[],
        }> = {
            'america-north': {
                label: t('continent-north-america'),
            },
            'america-south': {
                label: t('continent-south-america'),
            },
            asia: {
                label: t('continent-asia'),
            },
            australia: {
                label: t('continent-australia'),
            },
            europe: {
                label: t('continent-europe'),
            },
            other: {
                label: t('other'),
            },
        };

        const $control = CE('select', {
            id: `bx_setting_${escapeCssSelector(setting.pref!)}`,
            tabindex: 0,
        });
        $control.name = $control.id;

        $control.addEventListener('input', (e: Event) => {
            setGlobalPref(setting.pref! as GlobalPref, (e.target as HTMLSelectElement).value, 'ui');
            this.onGlobalSettingChanged(e);
        });

        setting.options = {};
        for (const regionName in STATES.serverRegions) {
            const region = STATES.serverRegions[regionName];
            let value = regionName;

            let label = `${region.shortName} - ${region.displayName ?? regionName}`;
            if (region.isDefault) {
                label += ` (${t('default')})`;
                value = 'default';

                if (selectedValue === regionName) {
                    selectedValue = 'default';
                }
            }

            setting.options[value] = label;

            const $option = CE('option', { value }, label);
            const continent = continents[region.contintent];
            if (!continent.children) {
                continent.children = [];
            }
            continent.children.push($option);
        }

        const fragment = document.createDocumentFragment();
        let key: keyof typeof continents;
        for (key in continents) {
            const continent = continents[key];
            if (!continent.children) {
                continue;
            }

            fragment.appendChild(CE('optgroup', {
                label: continent.label,
            }, ...continent.children));
        }

        $control.appendChild(fragment);
        $control.disabled = Object.keys(STATES.serverRegions).length === 0;

        // Select preferred region
        $control.value = selectedValue;

        return $control;
    }

    private renderSettingRow(settingTab: SettingTab, $tabContent: HTMLElement, settingTabContent: SettingTabSection, setting: SettingTabSectionItem | string) {
        // Convert pref key to object
        if (typeof setting === 'string') {
            setting = {
                pref: setting as AnyPref,
            } satisfies SettingTabSectionItem;
        }

        const pref = setting.pref!;

        let $control;
        if (setting.content) {
            if (typeof setting.content === 'function') {
                $control = setting.content.apply(this);
            } else {
                $control = setting.content;
            }
        } else if (!setting.unsupported) {
            if (pref === GlobalPref.SERVER_REGION) {
                $control = this.renderServerSetting(setting);
            } else if (pref === GlobalPref.SCRIPT_LOCALE) {
                $control = SettingElement.fromPref(pref, async (e: Event) => {
                    const newLocale = (e.target as HTMLSelectElement).value;

                    if (getGlobalPref(GlobalPref.UI_CONTROLLER_FRIENDLY)) {
                        let timeoutId = (e.target as any).timeoutId;
                        timeoutId && window.clearTimeout(timeoutId);
                        (e.target as any).timeoutId = window.setTimeout(() => {
                            Translations.refreshLocale(newLocale);
                            Translations.updateTranslations();
                        }, 500);
                    } else {
                        // Update locale
                        Translations.refreshLocale(newLocale);
                        Translations.updateTranslations();
                    }

                    this.onGlobalSettingChanged(e);
                });
            } else if (pref === GlobalPref.USER_AGENT_PROFILE) {
                $control = SettingElement.fromPref(GlobalPref.USER_AGENT_PROFILE, (e: Event) => {
                    const $target = e.target as HTMLSelectElement;
                    const value = $target.value as UserAgentProfile;
                    let isCustom = value === UserAgentProfile.CUSTOM;
                    let userAgent = UserAgent.get(value as UserAgentProfile);

                    UserAgent.updateStorage(value);

                    const $inp = $control!.nextElementSibling as HTMLInputElement;
                    $inp.value = userAgent;
                    $inp.readOnly = !isCustom;
                    $inp.disabled = !isCustom;

                    !(e.target as HTMLInputElement).disabled && this.onGlobalSettingChanged(e);
                });
            } else {
                $control = this.settingsManager.getElement(pref, setting.params);
                if (settingTab.group === 'global') {
                    $control.addEventListener('input', this.onGlobalSettingChanged);
                }
            }

            // Replace <select> with controller-friendly one
            if ($control instanceof HTMLSelectElement) {
                $control = BxSelectElement.create($control);
            }
        }

        let prefDefinition: SettingDefinition | null = null;
        if (pref) {
            prefDefinition = getPrefInfo(pref).definition;
        }

        if (prefDefinition && !this.isSupportedVariant(prefDefinition.requiredVariants)) {
            return;
        }

        let label = prefDefinition?.label || setting.label || '';
        let note: string | undefined | (() => HTMLElement) | HTMLElement = prefDefinition?.note || setting.note;
        let unsupportedNote: string | undefined | (() => HTMLElement) | HTMLElement = prefDefinition?.unsupportedNote || setting.unsupportedNote;
        const experimental = prefDefinition?.experimental || setting.experimental;

        // Render note lazily
        if (typeof note === 'function') {
            note = note();
        }

        if (typeof unsupportedNote === 'function') {
            unsupportedNote = unsupportedNote();
        }

        if (settingTabContent.label && setting.pref) {
            if (prefDefinition?.suggest) {
                typeof prefDefinition.suggest.lowest !== 'undefined' && (this.suggestedSettings.lowest[setting.pref] = prefDefinition.suggest.lowest);
                typeof prefDefinition.suggest.highest !== 'undefined' && (this.suggestedSettings.highest[setting.pref] = prefDefinition.suggest.highest);
            }
        }

        // Add Experimental text
        if (experimental) {
            label = '🧪 ' + label;
            if (!note) {
                note = t('experimental');
            } else {
                note = `${t('experimental')}: ${note}`;
            }
        }

        let $note;
        if (unsupportedNote) {
            $note = CE('div', { class: 'bx-settings-dialog-note' }, unsupportedNote);
        } else if (note) {
            $note = CE('div', { class: 'bx-settings-dialog-note' }, note);
        }

        const $row = createSettingRow(label, !prefDefinition?.unsupported && $control, {
            $note,
            multiLines: setting.multiLines,
            icon: prefDefinition?.labelIcon,
            onContextMenu: this.boundOnContextMenu,
            pref: pref,
        });
        if (pref) {
            $row.htmlFor = `bx_setting_${escapeCssSelector(pref)}`;
        }
        $row.dataset.type = settingTabContent.group;

        // Highlight "Bypass region" row
        if (!STATES.supportedRegion && setting.pref === GlobalPref.SERVER_BYPASS_RESTRICTION) {
            $row.classList.add('bx-settings-important-row');
        }

        $tabContent.appendChild($row);
        !prefDefinition?.unsupported && setting.onCreated && setting.onCreated(setting, $control);
    }

    private renderSettingsSection(settingTab: SettingTab, sections: Array<SettingTabSection | HTMLElement | false>): HTMLElement {
        const $tabContent = CE('div', {
            class: 'bx-gone',
            _dataset: {
                tabGroup: settingTab.group,
            },
        });

        for (const section of sections) {
            if (!section) {
                continue;
            }

            if (section instanceof HTMLElement) {
                $tabContent.appendChild(section);
                continue;
            }


            if (!this.isSupportedVariant(section.requiredVariants)) {
                continue;
            }

            // Don't render other settings in unsupported regions
            if (!this.renderFullSettings && settingTab.group === 'global' && section.group !== 'general' && section.group !== 'footer' && section.group !== 'advanced' && section.group !== 'data') {
                continue;
            }

            let label = section.label;

            // If label is "Better xCloud" => create a link to Releases page
            if (label === t('better-xcloud')) {
                label += ' ' + SCRIPT_VERSION;

                if (SCRIPT_VARIANT === 'lite') {
                    label += ' (Lite)';
                }

                label = createButton({
                    label: label,
                    url: 'https://github.com/redphx/better-xcloud/releases',
                    style: ButtonStyle.NORMAL_CASE | ButtonStyle.FROSTED | ButtonStyle.FOCUSABLE,
                });
            }

            if (label) {
                const $title = CE('h2', {
                    _nearby: {
                        orientation: 'horizontal',
                    }
                },
                    CE('span', false, label),
                    section.helpUrl && createButton({
                            icon: BxIcon.QUESTION,
                            style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
                            url: section.helpUrl,
                            title: t('help'),
                        }),
                );

                $tabContent.appendChild($title);
            }

            // Add note
            if (section.unsupportedNote) {
                const $note = CE('b', { class: 'bx-note-unsupported' }, section.unsupportedNote);

                $tabContent.appendChild($note);
            }

            // Don't render settings if this is an unsupported feature
            if (section.unsupported) {
                continue;
            }

            // Add content DOM
            if (section.content) {
                $tabContent.appendChild(section.content);
                continue;
            }

            // Render list of settings
            section.items = section.items || [];
            for (const setting of section.items) {
                if (setting === false) {
                    continue;
                }

                if (typeof setting === 'function') {
                    setting.apply(this, [$tabContent]);
                    continue;
                }

                this.renderSettingRow(settingTab, $tabContent, section, setting);
            }
        }

        return $tabContent;
    }

    private setupDialog() {
        let $tabs: HTMLElement;
        let $tabContents: HTMLElement;

        const $container = CE('div', {
            class: 'bx-settings-dialog',
            _nearby: {
                orientation: 'horizontal',
            }
        },
            CE('div', {
                class: 'bx-settings-tabs-container',
                _nearby: {
                    orientation: 'vertical',
                    focus: () => { return this.dialogManager.focus($tabs) },
                    loop: direction => {
                        if (direction === NavigationDirection.UP || direction === NavigationDirection.DOWN) {
                            this.focusVisibleTab(direction === NavigationDirection.UP ? 'last' : 'first');
                            return true;
                        }

                        return false;
                    },
                },
            },
                $tabs = CE('div', {
                    class: 'bx-settings-tabs bx-hide-scroll-bar',
                    _nearby: {
                        focus: () => this.focusActiveTab(),
                    },
                }),
                CE('div', false,
                    this.$btnReload = createButton({
                        icon: BxIcon.REFRESH,
                        style: ButtonStyle.FOCUSABLE | ButtonStyle.DROP_SHADOW,
                        onClick: e => {
                            this.reloadPage();
                        },
                    }),

                    createButton({
                        icon: BxIcon.CLOSE,
                        style: ButtonStyle.FOCUSABLE | ButtonStyle.DROP_SHADOW,
                        onClick: e => {
                            this.dialogManager.hide();
                        },
                    }),
                ),
            ),

            CE('div', {
                    class: 'bx-settings-tab-contents',
                    _nearby: {
                        orientation: 'vertical',
                        loop: direction => {
                            if (direction === NavigationDirection.UP || direction === NavigationDirection.DOWN) {
                                this.focusVisibleSetting(direction === NavigationDirection.UP ? 'last' : 'first');
                                return true;
                            }

                            return false;
                        },
                    }
                },
                // Render global/per-game settings selection
                this.$streamSettingsSelection = SettingsManager.getInstance().getStreamSettingsSelection(),

                $tabContents = CE('div', {
                    class: 'bx-settings-tab-content',
                    _nearby: {
                        orientation: 'vertical',
                        focus: () => this.jumpToSettingGroup('next'),
                    },
                }),
            ),
        );

        this.$container = $container;
        this.$tabs = $tabs;
        this.$tabContents = $tabContents;

        // Close dialog when not clicking on any child elements in the dialog
        $container.addEventListener('click', e => {
            if (e.target === $container) {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            }
        });

        // Render tab contents
        let settingTabGroup: keyof typeof this.SETTINGS_UI
        for (settingTabGroup in this.SETTINGS_UI) {
            const settingTab = this.SETTINGS_UI[settingTabGroup];

            if (!settingTab) {
                continue;
            }

            // Don't render unsupported build variant
            if (!this.isSupportedVariant(settingTab.requiredVariants)) {
                continue;
            }

            // Don't render other tabs in unsupported regions
            if (settingTab.group !== 'global' && !this.renderFullSettings) {
                continue;
            }

            const $svg = this.renderTab(settingTab);
            $tabs.appendChild($svg);

            const $tabContent = this.renderSettingsSection.call(this, settingTab, settingTab.items);
            $tabContents.appendChild($tabContent);
        }

        // Select first tab
        $tabs.firstElementChild!.dispatchEvent(new Event('click'));
    }

    focusTab(tabId: SettingTabGroup) {
        const $tab = this.$container.querySelector(`.bx-settings-tabs svg[data-group=${tabId}]`);
        $tab && $tab.dispatchEvent(new Event('click'));
    }

    focusIfNeeded(): void {
        this.jumpToSettingGroup('next');
    }

    private focusActiveTab() {
        const $currentTab = this.$tabs!.querySelector<HTMLElement>('.bx-active');
        $currentTab && $currentTab.focus();
        return true;
    }

    private focusVisibleSetting(type: 'first' | 'last' = 'first'): boolean {
        const controls = Array.from(this.$tabContents.querySelectorAll('div[data-tab-group]:not(.bx-gone) > *'));
        if (!controls.length) {
            return false;
        }

        if (type === 'last') {
            controls.reverse();
        }

        for (const $control of controls) {
            if (!($control instanceof HTMLElement)) {
                continue;
            }

            const $focusable = this.dialogManager.findFocusableElement($control);
            if ($focusable) {
                const focused = this.dialogManager.focus($focusable);
                if (focused) {
                    return true;
                }
            }
        }

        return false;
    }

    private focusVisibleTab(type: 'first' | 'last' = 'first'): boolean {
        const tabs = Array.from(this.$tabs.querySelectorAll('svg:not(.bx-gone)'));
        if (!tabs.length) {
            return false;
        }

        if (type === 'last') {
            tabs.reverse();
        }

        for (const $tab of tabs) {
            if (this.dialogManager.focus($tab as HTMLElement)) {
                return true;
            }
        }

        return false;
    }

    private jumpToSettingGroup(direction: 'next' | 'previous'): boolean {
        const $tabContent = this.$tabContents.querySelector('div[data-tab-group]:not(.bx-gone)');
        if (!$tabContent) {
            return false;
        }

        let $header;
        const $focusing = document.activeElement;
        if (!$focusing || !$tabContent.contains($focusing)) {
            $header = $tabContent.querySelector('h2');
        } else {
            // Find the parent element
            const $parent = $focusing.closest<HTMLElement>('[data-tab-group] > *');
            const siblingProperty = direction === 'next' ? 'nextSibling' : 'previousSibling';

            let $tmp = $parent;
            let times = 0;
            while (true) {
                if (!$tmp) {
                    break;
                }

                // Look for the header
                if ($tmp.tagName === 'H2') {
                    $header = $tmp;
                    // Ignore unsupported group
                    if (!$tmp.nextElementSibling?.classList.contains('bx-note-unsupported')) {
                        ++times;
                        // We need so search 2 times when direction is "previous"
                        if (direction === 'next' || times >= 2) {
                            break;
                        }
                    }
                }

                $tmp = $tmp[siblingProperty] as HTMLElement;
            }
        }

        let $target;
        if ($header) {
            $target = this.dialogManager.findNextTarget($header, NavigationDirection.DOWN, false);
        }

        if ($target) {
            return this.dialogManager.focus($target);
        }

        return false;
    }

    private resetHighlightedSetting($elm?: HTMLElement) {
        const targetGameId = SettingsManager.getInstance().getTargetGameId();
        if (targetGameId < 0) {
            return;
        }

        if (!$elm) {
            // Get focusing element
            $elm = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        }

        const $row = $elm?.closest('div[data-tab-group] > .bx-settings-row');
        if (!$row) {
            return;
        }

        const pref = ($row as any).prefKey;
        if (!pref) {
            alert('Pref not found: ' + $row.id);
        }

        if (!isStreamPref(pref)) {
            return;
        }

        // Delete settings
        const deleted = STORAGE.Stream.deleteSettingByGame(targetGameId, pref);
        if (deleted) {
            BxEventBus.Stream.emit('setting.changed', {
                storageKey: `${StorageKey.STREAM}.${targetGameId}`,
                settingKey: pref,
            });
        }

        return deleted;
    }

    handleKeyPress(key: string): boolean {
        let handled = true;
        switch (key) {
            case 'Tab':
                this.focusActiveTab();
                break;
            case 'Home':
                this.focusVisibleSetting('first');
                break;
            case 'End':
                this.focusVisibleSetting('last');
                break;
            case 'PageUp':
                this.jumpToSettingGroup('previous');
                break;
            case 'PageDown':
                this.jumpToSettingGroup('next');
                break;
            case 'KeyQ':
                this.resetHighlightedSetting();
                break;
            default:
                handled = false;
                break;
        }

        return handled;
    }

    handleGamepad(button: GamepadKey): boolean {
        let handled = true;

        switch (button) {
            case GamepadKey.B:
                const $focusing = document.activeElement;
                if ($focusing && this.$tabs.contains($focusing)) {
                    // Hide dialog when pressing B while focusing tabs
                    this.hide();
                } else {
                    // Focus tabs
                    this.focusActiveTab();
                }
                break;
            case GamepadKey.LB:
            case GamepadKey.RB:
                this.focusActiveTab();
                break;
            case GamepadKey.LT:
                this.jumpToSettingGroup('previous');
                break;
            case GamepadKey.RT:
                this.jumpToSettingGroup('next');
                break;
            case GamepadKey.X:
                this.resetHighlightedSetting();
                break;
            default:
                handled = false;
                break;
        }

        return handled;
    }
}
