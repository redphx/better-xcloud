import { onChangeVideoPlayerType, updateVideoPlayer } from "@/modules/stream/stream-settings-utils";
import { ButtonStyle, CE, createButton, createSvgIcon, removeChildElements, type BxButton } from "@/utils/html";
import { NavigationDialog, NavigationDirection } from "./navigation-dialog";
import { ControllerShortcut } from "@/modules/controller-shortcut";
import { MkbRemapper } from "@/modules/mkb/mkb-remapper";
import { NativeMkbHandler } from "@/modules/mkb/native-mkb-handler";
import { SoundShortcut } from "@/modules/shortcuts/shortcut-sound";
import { StreamStats } from "@/modules/stream/stream-stats";
import { TouchController } from "@/modules/touch-controller";
import { VibrationManager } from "@/modules/vibration-manager";
import { BxEvent } from "@/utils/bx-event";
import { BxIcon } from "@/utils/bx-icon";
import { STATES, AppInterface, deepClone, SCRIPT_VERSION, STORAGE } from "@/utils/global";
import { t, Translations } from "@/utils/translation";
import { BxSelectElement } from "@/web-components/bx-select";
import { setNearby } from "@/utils/navigation-utils";
import { PatcherCache } from "@/modules/patcher";
import { UserAgentProfile } from "@/enums/user-agent";
import { UserAgent } from "@/utils/user-agent";
import { BX_FLAGS, NATIVE_FETCH } from "@/utils/bx-flags";
import { copyToClipboard } from "@/utils/utils";
import { GamepadKey } from "@/enums/mkb";
import { PrefKey, StorageKey } from "@/enums/pref-keys";
import { ControllerDeviceVibration, getPref, getPrefDefinition, setPref, StreamTouchController } from "@/utils/settings-storages/global-settings-storage";
import { SettingElement, type BxHtmlSettingElement } from "@/utils/setting-element";
import type { RecommendedSettings, SettingDefinition, SuggestedSettingCategory as SuggestedSettingProfile } from "@/types/setting-definition";
import { FullscreenText } from "../fullscreen-text";


type SettingTabContentItem = Partial<{
    pref: PrefKey;
    label: string;
    note: string;
    experimental: string;
    content: HTMLElement | (() => HTMLElement);
    options: {[key: string]: string};
    unsupported: boolean;
    onChange: (e: any, value: number) => void;
    onCreated: (setting: SettingTabContentItem, $control: any) => void;
    params: any;
}>

type SettingTabContent = {
    group: 'general' | 'server' | 'stream' | 'game-bar' | 'co-op' | 'mkb' | 'touch-control' | 'loading-screen' | 'ui' | 'other' | 'advanced' | 'footer' | 'audio' | 'video' | 'controller' | 'native-mkb' | 'stats' | 'controller-shortcuts';
    label?: string;
    note?: string | Text | null;
    unsupported?: boolean;
    helpUrl?: string;
    content?: any;
    items?: Array<SettingTabContentItem | PrefKey | (($parent: HTMLElement) => void) | false>;
};

type SettingTab = {
    icon: SVGElement;
    group: 'global';
    items: Array<SettingTabContent | false>;
};

export class SettingsNavigationDialog extends NavigationDialog {
    private static instance: SettingsNavigationDialog;
    public static getInstance(): SettingsNavigationDialog {
        if (!SettingsNavigationDialog.instance) {
            SettingsNavigationDialog.instance = new SettingsNavigationDialog();
        }
        return SettingsNavigationDialog.instance;
    }

    $container!: HTMLElement;
    private $tabs!: HTMLElement;
    private $settings!: HTMLElement;

    private $btnReload!: HTMLElement;
    private $btnGlobalReload!: HTMLButtonElement;
    private $noteGlobalReload!: HTMLElement;
    private $btnSuggestion!: HTMLButtonElement;

    private renderFullSettings: boolean;

    private suggestedSettings: Record<SuggestedSettingProfile, PartialRecord<PrefKey, any>> = {
        recommended: {},
        default: {},
        lowest: {},
        highest: {},
    };
    private suggestedSettingLabels: PartialRecord<PrefKey, string> = {};
    private settingElements: PartialRecord<PrefKey, HTMLElement> = {};

    private readonly TAB_GLOBAL_ITEMS: Array<SettingTabContent | false> = [{
        group: 'general',
        label: t('better-xcloud'),
        helpUrl: 'https://better-xcloud.github.io/features/',
        items: [
            // Top buttons
            ($parent) => {
                const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);
                const topButtons = [];

                // "New version available" button
                if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
                    // Show new version button
                    const opts = {
                        label: '🌟 ' + t('new-version-available', {version: PREF_LATEST_VERSION}),
                        style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
                    } as BxButton;

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
                }, CE('label', {}, t('suggest-settings')),
                    CE('span', {}, '❯'),
                );
                this.$btnSuggestion.addEventListener('click', this.renderSuggestions.bind(this));

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

            PrefKey.BETTER_XCLOUD_LOCALE,
            PrefKey.SERVER_BYPASS_RESTRICTION,
            PrefKey.UI_CONTROLLER_FRIENDLY,
            PrefKey.REMOTE_PLAY_ENABLED,
        ],
    }, {
        group: 'server',
        label: t('server'),
        items: [
            PrefKey.SERVER_REGION,
            PrefKey.STREAM_PREFERRED_LOCALE,
            PrefKey.PREFER_IPV6_SERVER,
        ],
    }, {
        group: 'stream',
        label: t('stream'),
        items: [
            PrefKey.STREAM_TARGET_RESOLUTION,
            PrefKey.STREAM_CODEC_PROFILE,

            PrefKey.BITRATE_VIDEO_MAX,

            PrefKey.AUDIO_ENABLE_VOLUME_CONTROL,
            PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG,

            PrefKey.SCREENSHOT_APPLY_FILTERS,

            PrefKey.AUDIO_MIC_ON_PLAYING,
            PrefKey.GAME_FORTNITE_FORCE_CONSOLE,
            PrefKey.STREAM_COMBINE_SOURCES,
        ],
    }, {
        group: 'co-op',
        label: t('local-co-op'),
        items: [
            PrefKey.LOCAL_CO_OP_ENABLED,
        ],
    }, {
        group: 'mkb',
        label: t('mouse-and-keyboard'),
        items: [
            PrefKey.NATIVE_MKB_ENABLED,
            PrefKey.MKB_ENABLED,
            PrefKey.MKB_HIDE_IDLE_CURSOR,
        ],
    }, {
        group: 'touch-control',
        label: t('touch-controller'),
        note: !STATES.userAgent.capabilities.touch ? '⚠️ ' + t('device-unsupported-touch') : null,
        unsupported: !STATES.userAgent.capabilities.touch,
        items: [
            PrefKey.STREAM_TOUCH_CONTROLLER,
            PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF,
            PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY,
            PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD,
            PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM,
        ],
    }, {
        group: 'ui',
        label: t('ui'),
        items: [
            PrefKey.UI_LAYOUT,
            PrefKey.UI_GAME_CARD_SHOW_WAIT_TIME,
            PrefKey.UI_HOME_CONTEXT_MENU_DISABLED,
            PrefKey.CONTROLLER_SHOW_CONNECTION_STATUS,
            PrefKey.STREAM_SIMPLIFY_MENU,
            PrefKey.SKIP_SPLASH_VIDEO,
            !AppInterface && PrefKey.UI_SCROLLBAR_HIDE,
            PrefKey.HIDE_DOTS_ICON,
            PrefKey.REDUCE_ANIMATIONS,
            PrefKey.BLOCK_SOCIAL_FEATURES,
            PrefKey.UI_HIDE_SECTIONS,
        ],
    }, {
        group: 'game-bar',
        label: t('game-bar'),
        items: [
            PrefKey.GAME_BAR_POSITION,
        ],
    }, {
        group: 'loading-screen',
        label: t('loading-screen'),
        items: [
            PrefKey.UI_LOADING_SCREEN_GAME_ART,
            PrefKey.UI_LOADING_SCREEN_WAIT_TIME,
            PrefKey.UI_LOADING_SCREEN_ROCKET,
        ],
    }, {
        group: 'other',
        label: t('other'),
        items: [
            PrefKey.BLOCK_TRACKING,
        ],
    }, {
        group: 'advanced',
        label: t('advanced'),
        items: [
            {
                pref: PrefKey.USER_AGENT_PROFILE,
                onCreated: (setting, $control) => {
                    const defaultUserAgent = (window.navigator as any).orgUserAgent || window.navigator.userAgent;

                    const $inpCustomUserAgent = CE<HTMLInputElement>('input', {
                        id: `bx_setting_inp_${setting.pref}`,
                        type: 'text',
                        placeholder: defaultUserAgent,
                        autocomplete: 'off',
                        'class': 'bx-settings-custom-user-agent',
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
            // Donation link
            ($parent) => {
                $parent.appendChild(CE('a', {
                        class: 'bx-donation-link',
                        href: 'https://ko-fi.com/redphx',
                        target: '_blank',
                        tabindex: 0,
                    }, `❤️ ${t('support-better-xcloud')}`));
            },

            // xCloud version
            ($parent) => {
                try {
                    const appVersion = (document.querySelector('meta[name=gamepass-app-version]') as HTMLMetaElement).content;
                    const appDate = new Date((document.querySelector('meta[name=gamepass-app-date]') as HTMLMetaElement).content).toISOString().substring(0, 10);
                    $parent.appendChild(CE('div', {
                        class: 'bx-settings-app-version',
                    }, `xCloud website version ${appVersion} (${appDate})`));
                } catch (e) {}
            },

            // Debug info
            ($parent) => {
                const debugInfo = deepClone(BX_FLAGS.DeviceInfo);
                debugInfo['settings'] = JSON.parse(window.localStorage.getItem('better_xcloud') || '{}');

                const $debugInfo = CE('div', {class: 'bx-debug-info'},
                    createButton({
                        label: 'Debug info',
                        style: ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                        onClick: e => {
                            const $pre = (e.target as HTMLElement).closest('button')?.nextElementSibling!;

                            $pre.classList.toggle('bx-gone');
                            $pre.scrollIntoView();
                        },
                    }),
                    CE('pre', {
                        class: 'bx-focusable bx-gone',
                        tabindex: 0,
                        on: {
                            click: async (e: Event) => {
                                await copyToClipboard((e.target as HTMLElement).innerText);
                            },
                        },
                    }, '```\n' + JSON.stringify(debugInfo, null, '  ') + '\n```'),
                );

                $parent.appendChild($debugInfo);
            },
        ],
    }];

    private readonly TAB_DISPLAY_ITEMS: Array<SettingTabContent | false> = [{
        group: 'audio',
        label: t('audio'),
        helpUrl: 'https://better-xcloud.github.io/ingame-features/#audio',
        items: [{
            pref: PrefKey.AUDIO_VOLUME,
            onChange: (e: any, value: number) => {
                SoundShortcut.setGainNodeVolume(value);
            },
            params: {
                disabled: !getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL),
            },
            onCreated: (setting: SettingTabContentItem, $elm: HTMLElement) => {
                const $range = $elm.querySelector('input[type=range') as HTMLInputElement;
                window.addEventListener(BxEvent.SETTINGS_CHANGED, e => {
                    const { storageKey, settingKey, settingValue } = e as any;
                    if (storageKey !== StorageKey.GLOBAL || settingKey !== PrefKey.AUDIO_VOLUME) {
                        return;
                    }

                    $range.value = settingValue;
                    BxEvent.dispatch($range, 'input', {
                        ignoreOnChange: true,
                    });
                });
            },
        }],
    }, {
        group: 'video',
        label: t('video'),
        helpUrl: 'https://better-xcloud.github.io/ingame-features/#video',
        items: [{
            pref: PrefKey.VIDEO_PLAYER_TYPE,
            onChange: onChangeVideoPlayerType,
        }, {
            pref: PrefKey.VIDEO_POWER_PREFERENCE,
            onChange: () => {
                const streamPlayer = STATES.currentStream.streamPlayer;
                if (!streamPlayer) {
                    return;
                }

                streamPlayer.reloadPlayer();
                updateVideoPlayer();
            },
        }, {
            pref: PrefKey.VIDEO_PROCESSING,
            onChange: updateVideoPlayer,
        }, {
            pref: PrefKey.VIDEO_RATIO,
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
    }];

    private readonly TAB_CONTROLLER_ITEMS: Array<SettingTabContent | false> = [{
        group: 'controller',
        label: t('controller'),
        helpUrl: 'https://better-xcloud.github.io/ingame-features/#controller',
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

    STATES.userAgent.capabilities.touch && {
        group: 'touch-control',
        label: t('touch-controller'),
        items: [{
            label: t('layout'),
            content: CE('select', {
                disabled: true,
            }, CE('option', {}, t('default'))),
            onCreated: (setting: SettingTabContentItem, $elm: HTMLSelectElement) => {
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
                        $elm.appendChild(CE('option', {value: ''}, t('default')));
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

                        const $option = CE('option', {value: key}, name);
                        $fragment.appendChild($option);
                    }

                    $elm.appendChild($fragment);
                    $elm.value = customLayouts.default_layout;
                });
            },
        }],
    }];

    private readonly TAB_VIRTUAL_CONTROLLER_ITEMS: Array<SettingTabContent | false> = [{
        group: 'mkb',
        label: t('virtual-controller'),
        helpUrl: 'https://better-xcloud.github.io/mouse-and-keyboard/',
        content: MkbRemapper.INSTANCE.render(),
    }];

    private readonly TAB_NATIVE_MKB_ITEMS: Array<SettingTabContent | false> = [{
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
    }];

    private readonly TAB_SHORTCUTS_ITEMS: Array<SettingTabContent | false> = [{
        group: 'controller-shortcuts',
        label: t('controller-shortcuts'),
        content: ControllerShortcut.renderSettings(),
    }];

    private readonly TAB_STATS_ITEMS: Array<SettingTabContent | false> = [{
        group: 'stats',
        label: t('stream-stats'),
        helpUrl: 'https://better-xcloud.github.io/stream-stats/',
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
    }];

    private readonly SETTINGS_UI: Array<SettingTab> = [
        {
            icon: BxIcon.HOME,
            group: 'global',
            items: this.TAB_GLOBAL_ITEMS,
        },

        {
            icon: BxIcon.DISPLAY,
            group: 'stream',
            items: this.TAB_DISPLAY_ITEMS,
        },

        {
            icon: BxIcon.CONTROLLER,
            group: 'controller',
            items: this.TAB_CONTROLLER_ITEMS,
        },

        getPref(PrefKey.MKB_ENABLED) && {
            icon: BxIcon.VIRTUAL_CONTROLLER,
            group: 'mkb',
            items: this.TAB_VIRTUAL_CONTROLLER_ITEMS,
        },

        AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' && {
            icon: BxIcon.NATIVE_MKB,
            group: 'native-mkb',
            items: this.TAB_NATIVE_MKB_ITEMS,
        },

        {
            icon: BxIcon.COMMAND,
            group: 'shortcuts',
            items: this.TAB_SHORTCUTS_ITEMS,
        },

        {
            icon: BxIcon.STREAM_STATS,
            group: 'stats',
            items: this.TAB_STATS_ITEMS,
        },
    ];

    constructor() {
        super();

        this.renderFullSettings = STATES.supportedRegion && STATES.isSignedIn;
        this.setupDialog();
    }

    getDialog(): NavigationDialog {
        return this;
    }

    getContent(): HTMLElement {
        return this.$container;
    }

    onMounted(): void {
        if (!this.renderFullSettings) {
            return;
        }

        // Update video's settings
        onChangeVideoPlayerType();

        // Render custom layouts list
        if (STATES.userAgent.capabilities.touch) {
            BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED);
        }

        // Trigger event
        const $selectUserAgent = document.querySelector(`#bx_setting_${PrefKey.USER_AGENT_PROFILE}`) as HTMLSelectElement;
        if ($selectUserAgent) {
            $selectUserAgent.disabled = true;
            BxEvent.dispatch($selectUserAgent, 'input', {});
            $selectUserAgent.disabled = false;
        }
    }

    private reloadPage() {
        this.$btnGlobalReload.disabled = true;
        this.$btnGlobalReload.firstElementChild!.textContent = t('settings-reloading');

        this.hide();
        FullscreenText.getInstance().show(t('settings-reloading'));
        window.location.reload();
    }

    private async getRecommendedSettings(deviceCode: string): Promise<string | null> {
        // Get recommended settings from GitHub
        try {
            const response = await NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/devices/${deviceCode.toLowerCase()}.json`);
            const json = (await response.json()) as RecommendedSettings;
            const recommended: PartialRecord<PrefKey, any> = {};

            // Only supports schema version 1
            if (json.schema_version !== 1) {
                return null;
            }

            const scriptSettings = json.settings.script;

            // Set base settings
            if (scriptSettings._base) {
                let base = typeof scriptSettings._base === 'string' ? [scriptSettings._base] : scriptSettings._base;
                for (const profile of base) {
                    Object.assign(recommended, this.suggestedSettings[profile]);
                }

                delete scriptSettings._base;
            }

            // Override settings
            let key: Exclude<keyof typeof scriptSettings, '_base'>;
            // @ts-ignore
            for (key in scriptSettings) {
                recommended[key] = scriptSettings[key];
            }

            // Update device type in BxFlags
            BX_FLAGS.DeviceInfo.deviceType = json.device_type;

            this.suggestedSettings.recommended = recommended;

            return json.device_name;
        } catch (e) {}

        return null;
    }

    private addDefaultSuggestedSetting(prefKey: PrefKey, value: any) {
        let key: keyof typeof this.suggestedSettings;
        for (key in this.suggestedSettings) {
            if (key !== 'default' && !(prefKey in this.suggestedSettings)) {
                this.suggestedSettings[key][prefKey] = value;
            }
        }
    }

    private generateDefaultSuggestedSettings() {
        let key: keyof typeof this.suggestedSettings;
        for (key in this.suggestedSettings) {
            if (key === 'default') {
                continue;
            }

            let prefKey: PrefKey;
            for (prefKey in this.suggestedSettings[key]) {
                if (!(prefKey in this.suggestedSettings.default)) {
                    this.suggestedSettings.default[prefKey] = getPrefDefinition(prefKey).default;
                }
            }
        }
    }

    private async renderSuggestions(e: Event) {
        const $btnSuggest = (e.target as HTMLElement).closest('div')!;
        $btnSuggest.toggleAttribute('bx-open');

        let $content = $btnSuggest.nextElementSibling as HTMLElement;
        if ($content) {
            BxEvent.dispatch($content.querySelector('select'), 'input');
            return;
        }

        // Get labels
        for (const settingTab of this.SETTINGS_UI) {
            if (!settingTab || !settingTab.items) {
                continue;
            }

            for (const settingTabContent of settingTab.items) {
                if (!settingTabContent || !settingTabContent.items) {
                    continue;
                }

                for (const setting of settingTabContent.items) {
                    let prefKey: PrefKey | undefined;

                    if (typeof setting === 'string') {
                        prefKey = setting;
                    } else if (typeof setting === 'object') {
                        prefKey = setting.pref as PrefKey;
                    }

                    if (prefKey) {
                        this.suggestedSettingLabels[prefKey] = settingTabContent.label;
                    }
                }
            }
        }

        // Get recommended settings for Android devices
        let recommendedDevice: string | null = '';

        if (BX_FLAGS.DeviceInfo.deviceType.includes('android')) {
            if (BX_FLAGS.DeviceInfo.androidInfo) {
                const deviceCode = BX_FLAGS.DeviceInfo.androidInfo.board;
                recommendedDevice = await this.getRecommendedSettings(deviceCode);
            }
        }
        // recommendedDevice = await this.getRecommendedSettings('foster_e');

        const hasRecommendedSettings = Object.keys(this.suggestedSettings.recommended).length > 0;

        // Add some specific setings based on device type
        const deviceType = BX_FLAGS.DeviceInfo.deviceType;
        if (deviceType === 'android-handheld') {
            // Disable touch
            this.addDefaultSuggestedSetting(PrefKey.STREAM_TOUCH_CONTROLLER, StreamTouchController.OFF);
            // Enable device vibration
            this.addDefaultSuggestedSetting(PrefKey.CONTROLLER_DEVICE_VIBRATION, ControllerDeviceVibration.ON);
        } else if (deviceType === 'android') {
            // Enable device vibration
            this.addDefaultSuggestedSetting(PrefKey.CONTROLLER_DEVICE_VIBRATION, ControllerDeviceVibration.AUTO);
        } else if (deviceType === 'android-tv') {
            // Disable touch
            this.addDefaultSuggestedSetting(PrefKey.STREAM_TOUCH_CONTROLLER, StreamTouchController.OFF);
        }

        // Set value for Default profile
        this.generateDefaultSuggestedSettings();

        // Start rendering
        const $suggestedSettings = CE('div', {class: 'bx-suggest-wrapper'});
        const $select = CE<HTMLSelectElement>('select', {},
            hasRecommendedSettings && CE('option', {value: 'recommended'}, t('recommended')),
            !hasRecommendedSettings && CE('option', {value: 'highest'}, t('highest-quality')),
            CE('option', {value: 'default'}, t('default')),
            CE('option', {value: 'lowest'}, t('lowest-quality')),
        );
        $select.addEventListener('input', e => {
            const profile = $select.value as SuggestedSettingProfile;

            // Empty children
            removeChildElements($suggestedSettings);
            const fragment = document.createDocumentFragment();

            let note: HTMLElement | string | undefined;
            if (profile === 'recommended') {
                note = t('recommended-settings-for-device', {device: recommendedDevice});
            } else if (profile === 'highest') {
                // Add note for "Highest quality" profile
                note = '⚠️ ' + t('highest-quality-note');
            }

            note && fragment.appendChild(CE('div', {class: 'bx-suggest-note'}, note));

            const settings = this.suggestedSettings[profile];
            let prefKey: PrefKey;
            for (prefKey in settings) {
                const currentValue = getPref(prefKey, false);
                const suggestedValue = settings[prefKey];
                const currentValueText = STORAGE.Global.getValueText(prefKey, currentValue);
                const isSameValue = currentValue === suggestedValue;

                let $child: HTMLElement;
                let $value: HTMLElement | string;
                if (isSameValue) {
                    // No changes
                    $value = currentValueText;
                } else {
                    const suggestedValueText = STORAGE.Global.getValueText(prefKey, suggestedValue);
                    $value = currentValueText + ' ➔ ' + suggestedValueText;
                }

                let $checkbox: HTMLInputElement;
                const breadcrumb = this.suggestedSettingLabels[prefKey] + ' ❯ ' + STORAGE.Global.getLabel(prefKey);

                $child = CE('div', {
                    class: `bx-suggest-row ${isSameValue ? 'bx-suggest-ok' : 'bx-suggest-change'}`,
                },
                    $checkbox = CE('input', {
                        type: 'checkbox',
                        tabindex: 0,
                        checked: true,
                        id: `bx_suggest_${prefKey}`,
                    }),
                    CE('label', {
                        for: `bx_suggest_${prefKey}`,
                    },
                        CE('div', {
                            class: 'bx-suggest-label',
                        }, breadcrumb),
                        CE('div', {
                            class: 'bx-suggest-value',
                        }, $value),
                    ),
                );

                if (isSameValue) {
                    $checkbox.disabled = true;
                    $checkbox.checked = true;
                }

                fragment.appendChild($child);
            }

            $suggestedSettings.appendChild(fragment);
        });

        BxEvent.dispatch($select, 'input');

        const onClickApply = () => {
            const profile = $select.value as SuggestedSettingProfile;
            const settings = this.suggestedSettings[profile];

            let prefKey: PrefKey;
            for (prefKey in settings) {
                const suggestedValue = settings[prefKey];
                const $checkBox = $content.querySelector(`#bx_suggest_${prefKey}`) as HTMLInputElement;
                if (!$checkBox.checked || $checkBox.disabled) {
                    continue;
                }

                const $control = this.settingElements[prefKey] as HTMLElement;

                // Set value directly if the control element is not available
                if (!$control) {
                    setPref(prefKey, suggestedValue);
                    continue;
                }

                if ('setValue' in $control) {
                    ($control as BxHtmlSettingElement).setValue(suggestedValue);
                } else {
                    ($control as HTMLInputElement).value = suggestedValue;
                }

                BxEvent.dispatch($control, 'input', {
                    manualTrigger: true,
                });
            }

            // Refresh suggested settings
            BxEvent.dispatch($select, 'input');
        };

        // Apply button
        const $btnApply = createButton({
            label: t('apply'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: onClickApply,
        });

        $content = CE('div', {
            class: 'bx-suggest-box',
            _nearby: {
                orientation: 'vertical',
            }
        },
            BxSelectElement.wrap($select),
            $suggestedSettings,
            $btnApply,

            BX_FLAGS.DeviceInfo.deviceType.includes('android') && CE('a', {
                class: 'bx-suggest-link bx-focusable',
                href: 'https://better-xcloud.github.io/guide/android-webview-tweaks/',
                target: '_blank',
                tabindex: 0,
            }, '🤓 ' + t('how-to-improve-app-performance')),

            BX_FLAGS.DeviceInfo.deviceType.includes('android') && !hasRecommendedSettings && CE('a', {
                class: 'bx-suggest-link bx-focusable',
                href: 'https://github.com/redphx/better-xcloud-devices',
                target: '_blank',
                tabindex: 0,
            }, t('suggest-settings-link')),
        );

        $btnSuggest?.insertAdjacentElement('afterend', $content);
    }

    private renderTab(settingTab: SettingTab) {
        const $svg = createSvgIcon(settingTab.icon as any);
        $svg.dataset.group = settingTab.group;
        $svg.tabIndex = 0;

        $svg.addEventListener('click', e => {
            // Switch tab
            for (const $child of Array.from(this.$settings.children)) {
                if ($child.getAttribute('data-tab-group') === settingTab.group) {
                    $child.classList.remove('bx-gone');

                    // Calculate size of controller-friendly select boxes
                    if (getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
                        this.dialogManager.calculateSelectBoxes($child as HTMLElement);
                    }
                } else {
                    $child.classList.add('bx-gone');
                }
            }

            // Highlight current tab button
            for (const $child of Array.from(this.$tabs.children)) {
                $child.classList.remove('bx-active');
            }

            $svg.classList.add('bx-active');
        });

        return $svg;
    }

    private onGlobalSettingChanged(e: Event) {
        // Clear PatcherCache;
        PatcherCache.clear();

        this.$btnReload.classList.add('bx-danger');

        this.$noteGlobalReload.classList.add('bx-gone');
        this.$btnGlobalReload.classList.remove('bx-gone');
        this.$btnGlobalReload.classList.add('bx-danger');
    }

    private renderServerSetting(setting: SettingTabContentItem): HTMLElement {
        let selectedValue;

        const $control = CE<HTMLSelectElement>('select', {
                id: `bx_setting_${setting.pref}`,
                title: setting.label,
                tabindex: 0,
            });
        $control.name = $control.id;

        $control.addEventListener('input', (e: Event) => {
            setPref(setting.pref!, (e.target as HTMLSelectElement).value);
            this.onGlobalSettingChanged(e);
        });

        selectedValue = getPref(PrefKey.SERVER_REGION);

        setting.options = {};
        for (const regionName in STATES.serverRegions) {
            const region = STATES.serverRegions[regionName];
            let value = regionName;

            let label = `${region.shortName} - ${regionName}`;
            if (region.isDefault) {
                label += ` (${t('default')})`;
                value = 'default';

                if (selectedValue === regionName) {
                    selectedValue = 'default';
                }
            }

            setting.options[value] = label;
        }

        for (const value in setting.options) {
            const label = setting.options[value];

            const $option = CE('option', {value: value}, label);
            $control.appendChild($option);
        }

        $control.disabled = Object.keys(STATES.serverRegions).length === 0;

        // Select preferred region
        $control.value = selectedValue;

        return $control;
    }

    private renderSettingRow(settingTab: SettingTab, $tabContent: HTMLElement, settingTabContent: SettingTabContent, setting: SettingTabContentItem | string) {
        if (typeof setting === 'string') {
            setting = {
                pref: setting as PrefKey,
            } satisfies SettingTabContentItem;
        }

        const pref = setting.pref;

        let $control;
        if (setting.content) {
            if (typeof setting.content === 'function') {
                $control = setting.content.apply(this);
            } else {
                $control = setting.content;
            }
        } else if (!setting.unsupported) {
            if (pref === PrefKey.SERVER_REGION) {
                $control = this.renderServerSetting(setting);
            } else if (pref === PrefKey.BETTER_XCLOUD_LOCALE) {
                $control = SettingElement.fromPref(pref, STORAGE.Global, async (e: Event) => {
                    const newLocale = (e.target as HTMLSelectElement).value;

                    if (getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
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
            } else if (pref === PrefKey.USER_AGENT_PROFILE) {
                $control = SettingElement.fromPref(PrefKey.USER_AGENT_PROFILE, STORAGE.Global, (e: Event) => {
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
                let onChange = setting.onChange;
                if (!onChange && settingTab.group === 'global') {
                    onChange = this.onGlobalSettingChanged.bind(this);
                }

                $control = SettingElement.fromPref(pref as PrefKey, STORAGE.Global, onChange, setting.params);
            }

            // Replace <select> with controller-friendly one
            if ($control instanceof HTMLSelectElement && getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
                $control = BxSelectElement.wrap($control);
            }

            pref && (this.settingElements[pref] = $control);
        }

        let prefDefinition: SettingDefinition | null = null;
        if (pref) {
            prefDefinition = getPrefDefinition(pref);
        }

        let label = prefDefinition?.label || setting.label;
        let note = prefDefinition?.note || setting.note;
        const experimental = prefDefinition?.experimental || setting.experimental;

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

        let $label;
        const $row = CE('label', {
            class: 'bx-settings-row',
            for: `bx_setting_${pref}`,
            'data-type': settingTabContent.group,
            _nearby: {
                orientation: 'horizontal',
            }
        },
            $label = CE('span', {class: 'bx-settings-label'},
                label,
                note && CE('div', {class: 'bx-settings-dialog-note'}, note),
                setting.unsupported && CE('div', {class: 'bx-settings-dialog-note'}, t('browser-unsupported-feature')),
            ),
            !setting.unsupported && $control,
        );

        // Make link inside <label> focusable
        const $link = $label.querySelector('a');
        if ($link) {
            $link.classList.add('bx-focusable');
            setNearby($label, {
                focus: $link,
            });
        }

        $tabContent.appendChild($row);
        setting.onCreated && setting.onCreated(setting, $control);
    }

    private setupDialog() {
        let $tabs: HTMLElement;
        let $settings: HTMLElement;

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
                CE('div', {},
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

            $settings = CE('div', {
                class: 'bx-settings-tab-contents',
                _nearby: {
                    orientation: 'vertical',
                    focus: () => this.jumpToSettingGroup('next'),
                    loop: direction => {
                        if (direction === NavigationDirection.UP || direction === NavigationDirection.DOWN) {
                            this.focusVisibleSetting(direction === NavigationDirection.UP ? 'last' : 'first');
                            return true;
                        }

                        return false;
                    },
                },
            }),
        );

        this.$container = $container;
        this.$tabs = $tabs;
        this.$settings = $settings;

        // Close dialog when not clicking on any child elements in the dialog
        $container.addEventListener('click', e => {
            if (e.target === $container) {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            }
        });

        for (const settingTab of this.SETTINGS_UI) {
            if (!settingTab) {
                continue;
            }

            // Don't render other tabs in unsupported regions
            if (settingTab.group !== 'global' && !this.renderFullSettings) {
                continue;
            }

            const $svg = this.renderTab(settingTab);
            $tabs.appendChild($svg);

            const $tabContent = CE('div', {
                class: 'bx-gone',
                'data-tab-group': settingTab.group,
            });

            for (const settingTabContent of settingTab.items) {
                if (settingTabContent === false) {
                    continue;
                }

                // Don't render other settings in unsupported regions
                if (!this.renderFullSettings && settingTab.group === 'global' && settingTabContent.group !== 'general' && settingTabContent.group !== 'footer') {
                    continue;
                }

                let label = settingTabContent.label;

                // If label is "Better xCloud" => create a link to Releases page
                if (label === t('better-xcloud')) {
                    label += ' ' + SCRIPT_VERSION;
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
                        CE('span', {}, label),
                        settingTabContent.helpUrl && createButton({
                                icon: BxIcon.QUESTION,
                                style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
                                url: settingTabContent.helpUrl,
                                title: t('help'),
                            }),
                    );

                    $tabContent.appendChild($title);
                }

                // Add note
                if (settingTabContent.note) {
                    let $note;
                    if (typeof settingTabContent.note === 'string') {
                        $note = CE('b', {class: 'bx-note-unsupported'}, settingTabContent.note);
                    } else {
                        $note = settingTabContent.note;
                    }

                    $tabContent.appendChild($note);
                }

                // Don't render settings if this is an unsupported feature
                if (settingTabContent.unsupported) {
                    continue;
                }

                // Add content DOM
                if (settingTabContent.content) {
                    $tabContent.appendChild(settingTabContent.content);
                    continue;
                }

                // Render list of settings
                settingTabContent.items = settingTabContent.items || [];
                for (const setting of settingTabContent.items) {
                    if (setting === false) {
                        continue;
                    }

                    if (typeof setting === 'function') {
                        setting.apply(this, [$tabContent]);
                        continue;
                    }

                    this.renderSettingRow(settingTab, $tabContent, settingTabContent, setting);
                }
            }

            $settings.appendChild($tabContent);
        }

        // Select first tab
        $tabs.firstElementChild!.dispatchEvent(new Event('click'));
    }

    focusTab(tabId: string) {
        const $tab = this.$container.querySelector(`.bx-settings-tabs svg[data-group=${tabId}]`);
        $tab && $tab.dispatchEvent(new Event('click'));
    }

    focusIfNeeded(): void {
        this.jumpToSettingGroup('next');
    }

    private focusActiveTab() {
        const $currentTab = this.$tabs!.querySelector('.bx-active') as HTMLElement;
        $currentTab && $currentTab.focus();
        return true;
    }

    private focusVisibleSetting(type: 'first' | 'last' = 'first'): boolean {
        const controls = Array.from(this.$settings.querySelectorAll('div[data-tab-group]:not(.bx-gone) > *'));
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
        const $tabContent = this.$settings.querySelector('div[data-tab-group]:not(.bx-gone)');
        if (!$tabContent) {
            return false;
        }

        let $header;
        const $focusing = document.activeElement;
        if (!$focusing || !$tabContent.contains($focusing)) {
            $header = $tabContent.querySelector('h2');
        } else {
            // Find the parent element
            const $parent = $focusing.closest('[data-tab-group] > *') as HTMLElement;
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
            default:
                handled = false;
                break;
        }

        return handled;
    }

    handleGamepad(button: GamepadKey): boolean {
        let handled = true;

        switch (button) {
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
            default:
                handled = false;
                break;
        }

        return handled;
    }
}
