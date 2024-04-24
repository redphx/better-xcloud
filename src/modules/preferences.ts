import { CE } from "../utils/html";
import { t } from "./translation";
import { SettingElement, SettingElementType } from "./settings";
import { UserAgentProfile } from "../utils/user-agent";
import { StreamStat } from "./stream/stream-stats";
import type { PreferenceSettings } from "../types/preferences";
import { States } from "../utils/global";

export enum PrefKey {
    LAST_UPDATE_CHECK = 'version_last_check',
    LATEST_VERSION = 'version_latest',
    CURRENT_VERSION = 'version_current',

    BETTER_XCLOUD_LOCALE = 'bx_locale',

    SERVER_REGION = 'server_region',
    PREFER_IPV6_SERVER = 'prefer_ipv6_server',
    STREAM_TARGET_RESOLUTION = 'stream_target_resolution',
    STREAM_PREFERRED_LOCALE = 'stream_preferred_locale',
    STREAM_CODEC_PROFILE = 'stream_codec_profile',

    USER_AGENT_PROFILE = 'user_agent_profile',
    USER_AGENT_CUSTOM = 'user_agent_custom',
    STREAM_SIMPLIFY_MENU = 'stream_simplify_menu',

    STREAM_COMBINE_SOURCES = 'stream_combine_sources',

    STREAM_TOUCH_CONTROLLER = 'stream_touch_controller',
    STREAM_TOUCH_CONTROLLER_AUTO_OFF = 'stream_touch_controller_auto_off',
    STREAM_TOUCH_CONTROLLER_STYLE_STANDARD = 'stream_touch_controller_style_standard',
    STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM = 'stream_touch_controller_style_custom',

    STREAM_DISABLE_FEEDBACK_DIALOG = 'stream_disable_feedback_dialog',

    LOCAL_CO_OP_ENABLED = 'local_co_op_enabled',
    // LOCAL_CO_OP_SEPARATE_TOUCH_CONTROLLER = 'local_co_op_separate_touch_controller',

    CONTROLLER_ENABLE_SHORTCUTS = 'controller_enable_shortcuts',
    CONTROLLER_ENABLE_VIBRATION = 'controller_enable_vibration',
    CONTROLLER_DEVICE_VIBRATION = 'controller_device_vibration',
    CONTROLLER_VIBRATION_INTENSITY = 'controller_vibration_intensity',

    MKB_ENABLED = 'mkb_enabled',
    MKB_HIDE_IDLE_CURSOR = 'mkb_hide_idle_cursor',
    MKB_ABSOLUTE_MOUSE = 'mkb_absolute_mouse',
    MKB_DEFAULT_PRESET_ID = 'mkb_default_preset_id',

    SCREENSHOT_BUTTON_POSITION = 'screenshot_button_position',
    SCREENSHOT_APPLY_FILTERS = 'screenshot_apply_filters',

    BLOCK_TRACKING = 'block_tracking',
    BLOCK_SOCIAL_FEATURES = 'block_social_features',
    SKIP_SPLASH_VIDEO = 'skip_splash_video',
    HIDE_DOTS_ICON = 'hide_dots_icon',
    REDUCE_ANIMATIONS = 'reduce_animations',

    UI_LOADING_SCREEN_GAME_ART = 'ui_loading_screen_game_art',
    UI_LOADING_SCREEN_WAIT_TIME = 'ui_loading_screen_wait_time',
    UI_LOADING_SCREEN_ROCKET = 'ui_loading_screen_rocket',

    UI_LAYOUT = 'ui_layout',
    UI_SCROLLBAR_HIDE = 'ui_scrollbar_hide',

    VIDEO_CLARITY = 'video_clarity',
    VIDEO_RATIO = 'video_ratio',
    VIDEO_BRIGHTNESS = 'video_brightness',
    VIDEO_CONTRAST = 'video_contrast',
    VIDEO_SATURATION = 'video_saturation',

    AUDIO_MIC_ON_PLAYING = 'audio_mic_on_playing',
    AUDIO_ENABLE_VOLUME_CONTROL = 'audio_enable_volume_control',
    AUDIO_VOLUME = 'audio_volume',

    STATS_ITEMS = 'stats_items',
    STATS_SHOW_WHEN_PLAYING = 'stats_show_when_playing',
    STATS_QUICK_GLANCE = 'stats_quick_glance',
    STATS_POSITION = 'stats_position',
    STATS_TEXT_SIZE = 'stats_text_size',
    STATS_TRANSPARENT = 'stats_transparent',
    STATS_OPACITY = 'stats_opacity',
    STATS_CONDITIONAL_FORMATTING = 'stats_conditional_formatting',

    REMOTE_PLAY_ENABLED = 'xhome_enabled',
    REMOTE_PLAY_RESOLUTION = 'xhome_resolution',

    GAME_FORTNITE_FORCE_CONSOLE = 'game_fortnite_force_console',
}

export class Preferences {
    static SETTINGS: PreferenceSettings = {
        [PrefKey.LAST_UPDATE_CHECK]: {
            default: 0,
        },
        [PrefKey.LATEST_VERSION]: {
            default: '',
        },
        [PrefKey.CURRENT_VERSION]: {
            default: '',
        },
        [PrefKey.BETTER_XCLOUD_LOCALE]: {
            label: t('language'),
            default: localStorage.getItem('better_xcloud_locale') || 'en-US',
            options: {
                'en-ID': 'Bahasa Indonesia',
                'de-DE': 'Deutsch',
                'en-US': 'English (United States)',
                'es-ES': 'español (España)',
                'fr-FR': 'français',
                'it-IT': 'italiano',
                'ja-JP': '日本語',
                'ko-KR': '한국어',
                'pl-PL': 'polski',
                'pt-BR': 'português (Brasil)',
                'ru-RU': 'русский',
                'tr-TR': 'Türkçe',
                'uk-UA': 'українська',
                'vi-VN': 'Tiếng Việt',
                'zh-CN': '中文(简体)',
            },
        },
        [PrefKey.SERVER_REGION]: {
            label: t('region'),
            default: 'default',
        },
        [PrefKey.STREAM_PREFERRED_LOCALE]: {
            label: t('preferred-game-language'),
            default: 'default',
            options: {
                default: t('default'),
                'ar-SA': 'العربية',
                'cs-CZ': 'čeština',
                'da-DK': 'dansk',
                'de-DE': 'Deutsch',
                'el-GR': 'Ελληνικά',
                'en-GB': 'English (United Kingdom)',
                'en-US': 'English (United States)',
                'es-ES': 'español (España)',
                'es-MX': 'español (Latinoamérica)',
                'fi-FI': 'suomi',
                'fr-FR': 'français',
                'he-IL': 'עברית',
                'hu-HU': 'magyar',
                'it-IT': 'italiano',
                'ja-JP': '日本語',
                'ko-KR': '한국어',
                'nb-NO': 'norsk bokmål',
                'nl-NL': 'Nederlands',
                'pl-PL': 'polski',
                'pt-BR': 'português (Brasil)',
                'pt-PT': 'português (Portugal)',
                'ru-RU': 'русский',
                'sk-SK': 'slovenčina',
                'sv-SE': 'svenska',
                'tr-TR': 'Türkçe',
                'zh-CN': '中文(简体)',
                'zh-TW': '中文 (繁體)',
            },
        },
        [PrefKey.STREAM_TARGET_RESOLUTION]: {
            label: t('target-resolution'),
            default: 'auto',
            options: {
                auto: t('default'),
                '1080p': '1080p',
                '720p': '720p',
            },
        },
        [PrefKey.STREAM_CODEC_PROFILE]: {
            label: t('visual-quality'),
            default: 'default',
            options: (() => {
                const options: {[index: string]: string} = {
                    default: t('default'),
                };

                if (!('getCapabilities' in RTCRtpReceiver) || typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
                    return options;
                }

                let hasLowCodec = false;
                let hasNormalCodec = false;
                let hasHighCodec = false;

                const codecs = RTCRtpReceiver.getCapabilities('video')!.codecs;
                for (let codec of codecs) {
                    if (codec.mimeType.toLowerCase() !== 'video/h264' || !codec.sdpFmtpLine) {
                        continue;
                    }

                    const fmtp = codec.sdpFmtpLine.toLowerCase();
                    if (!hasHighCodec && fmtp.includes('profile-level-id=4d')) {
                        hasHighCodec = true;
                    } else if (!hasNormalCodec && fmtp.includes('profile-level-id=42e')) {
                        hasNormalCodec = true;
                    } else if (!hasLowCodec && fmtp.includes('profile-level-id=420')) {
                        hasLowCodec = true;
                    }
                }

                if (hasHighCodec) {
                    if (!hasLowCodec && !hasNormalCodec) {
                        options.default = `${t('visual-quality-high')} (${t('default')})`;
                    } else {
                        options.high = t('visual-quality-high');
                    }
                }

                if (hasNormalCodec) {
                    if (!hasLowCodec && !hasHighCodec) {
                        options.default = `${t('visual-quality-normal')} (${t('default')})`;
                    } else {
                        options.normal = t('visual-quality-normal');
                    }
                }

                if (hasLowCodec) {
                    if (!hasNormalCodec && !hasHighCodec) {
                        options.default = `${t('visual-quality-low')} (${t('default')})`;
                    } else {
                        options.low = t('visual-quality-low');
                    }
                }

                return options;
            })(),
            ready: () => {
                const setting = Preferences.SETTINGS[PrefKey.STREAM_CODEC_PROFILE]
                const options: any = setting.options;
                const keys = Object.keys(options);

                if (keys.length <= 1) { // Unsupported
                    setting.unsupported = true;
                    setting.note = '⚠️ ' + t('browser-unsupported-feature');
                } else {
                    // Set default value to the best codec profile
                    // setting.default = keys[keys.length - 1];
                }
            },
        },
        [PrefKey.PREFER_IPV6_SERVER]: {
            label: t('prefer-ipv6-server'),
            default: false,
        },

        [PrefKey.SCREENSHOT_BUTTON_POSITION]: {
            label: t('screenshot-button-position'),
            default: 'bottom-left',
            options: {
                'bottom-left': t('bottom-left'),
                'bottom-right': t('bottom-right'),
                'none': t('disable'),
            },
        },
        [PrefKey.SCREENSHOT_APPLY_FILTERS]: {
            label: t('screenshot-apply-filters'),
            default: false,
        },

        [PrefKey.SKIP_SPLASH_VIDEO]: {
            label: t('skip-splash-video'),
            default: false,
        },
        [PrefKey.HIDE_DOTS_ICON]: {
            label: t('hide-system-menu-icon'),
            default: false,
        },

        [PrefKey.STREAM_COMBINE_SOURCES]: {
            label: t('combine-audio-video-streams'),
            default: false,
            experimental: true,
            note: t('combine-audio-video-streams-summary'),
        },

        [PrefKey.STREAM_TOUCH_CONTROLLER]: {
            label: t('tc-availability'),
            default: 'all',
            options: {
                default: t('default'),
                all: t('tc-all-games'),
                off: t('off'),
            },
            unsupported: !States.hasTouchSupport,
            ready: () => {
                const setting = Preferences.SETTINGS[PrefKey.STREAM_TOUCH_CONTROLLER];
                if (setting.unsupported) {
                    setting.default = 'default';
                }
            },
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF]: {
            label: t('tc-auto-off'),
            default: false,
            unsupported: !States.hasTouchSupport,
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
            label: t('tc-standard-layout-style'),
            default: 'default',
            options: {
                default: t('default'),
                white: t('tc-all-white'),
                muted: t('tc-muted-colors'),
            },
            unsupported: !States.hasTouchSupport,
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            label: t('tc-custom-layout-style'),
            default: 'default',
            options: {
                default: t('default'),
                muted: t('tc-muted-colors'),
            },
            unsupported: !States.hasTouchSupport,
        },

        [PrefKey.STREAM_SIMPLIFY_MENU]: {
            label: t('simplify-stream-menu'),
            default: false,
        },
        [PrefKey.MKB_HIDE_IDLE_CURSOR]: {
            label: t('hide-idle-cursor'),
            default: false,
        },
        [PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG]: {
            label: t('disable-post-stream-feedback-dialog'),
            default: false,
        },

        [PrefKey.LOCAL_CO_OP_ENABLED]: {
            label: t('enable-local-co-op-support'),
            default: false,
            note: CE<HTMLAnchorElement>('a', {
                    href: 'https://github.com/redphx/better-xcloud/discussions/275',
                    target: '_blank',
                }, t('enable-local-co-op-support-note')),
        },

        /*
        [Preferences.LOCAL_CO_OP_SEPARATE_TOUCH_CONTROLLER]: {
            default: false,
            'note': t('separate-touch-controller-note'),
        },
        */

        [PrefKey.CONTROLLER_ENABLE_SHORTCUTS]: {
            default: false,
        },

        [PrefKey.CONTROLLER_ENABLE_VIBRATION]: {
            default: true,
        },

        [PrefKey.CONTROLLER_DEVICE_VIBRATION]: {
            default: 'off',
            options: {
                on: t('on'),
                auto: t('device-vibration-not-using-gamepad'),
                off: t('off'),
            },
        },

        [PrefKey.CONTROLLER_VIBRATION_INTENSITY]: {
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 0,
            max: 100,
            steps: 10,
            params: {
                suffix: '%',
                ticks: 10,
            },
        },

        [PrefKey.MKB_ENABLED]: {
            label: t('enable-mkb'),
            default: false,
            unsupported: ((): string | boolean => {
                    const userAgent = ((window.navigator as any).orgUserAgent || window.navigator.userAgent || '').toLowerCase();
                    return userAgent.match(/(android|iphone|ipad)/) ? t('browser-unsupported-feature') : false;
                })(),
            ready: () => {
                const pref = Preferences.SETTINGS[PrefKey.MKB_ENABLED];

                let note;
                let url;
                if (pref.unsupported) {
                    note = t('browser-unsupported-feature');
                    url = 'https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657';
                } else {
                    note = t('mkb-disclaimer');
                    url = 'https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer';
                }

                Preferences.SETTINGS[PrefKey.MKB_ENABLED].note = CE('a', {
                        href: url,
                        target: '_blank',
                    }, '⚠️ ' + note);
            },
        },

        [PrefKey.MKB_DEFAULT_PRESET_ID]: {
            default: 0,
        },

        [PrefKey.MKB_ABSOLUTE_MOUSE]: {
            default: false,
        },

        [PrefKey.REDUCE_ANIMATIONS]: {
            label: t('reduce-animations'),
            default: false,
        },

        [PrefKey.UI_LOADING_SCREEN_GAME_ART]: {
            label: t('show-game-art'),
            default: true,
        },
        [PrefKey.UI_LOADING_SCREEN_WAIT_TIME]: {
            label: t('show-wait-time'),
            default: true,
        },
        [PrefKey.UI_LOADING_SCREEN_ROCKET]: {
            label: t('rocket-animation'),
            default: 'show',
            options: {
                show: t('rocket-always-show'),
                'hide-queue': t('rocket-hide-queue'),
                hide: t('rocket-always-hide'),
            },
        },
        [PrefKey.UI_LAYOUT]: {
            label: t('layout'),
            default: 'default',
            options: {
                default: t('default'),
                tv: t('smart-tv'),
            },
        },

        [PrefKey.UI_SCROLLBAR_HIDE]: {
            label: t('hide-scrollbar'),
            default: false,
        },

        [PrefKey.BLOCK_SOCIAL_FEATURES]: {
            label: t('disable-social-features'),
            default: false,
        },
        [PrefKey.BLOCK_TRACKING]: {
            label: t('disable-xcloud-analytics'),
            default: false,
        },
        [PrefKey.USER_AGENT_PROFILE]: {
            label: t('user-agent-profile'),
            default: 'default',
            options: {
                [UserAgentProfile.DEFAULT]: t('default'),
                [UserAgentProfile.EDGE_WINDOWS]: 'Edge + Windows',
                [UserAgentProfile.SAFARI_MACOS]: 'Safari + macOS',
                [UserAgentProfile.SMARTTV_TIZEN]: 'Samsung Smart TV',
                [UserAgentProfile.CUSTOM]: t('custom'),
            },
        },
        [PrefKey.USER_AGENT_CUSTOM]: {
            default: '',
        },
        [PrefKey.VIDEO_CLARITY]: {
            type: SettingElementType.NUMBER_STEPPER,
            default: 0,
            min: 0,
            max: 5,
            params: {
                hideSlider: true,
            },
        },
        [PrefKey.VIDEO_RATIO]: {
            default: '16:9',
            options: {
                '16:9': '16:9',
                '18:9': '18:9',
                '21:9': '21:9',
                '16:10': '16:10',
                '4:3': '4:3',

                fill: t('stretch'),
                //'cover': 'Cover',
            },
        },
        [PrefKey.VIDEO_SATURATION]: {
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 50,
            max: 150,
            params: {
                suffix: '%',
                ticks: 25,
            },
        },
        [PrefKey.VIDEO_CONTRAST]: {
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 50,
            max: 150,
            params: {
                suffix: '%',
                ticks: 25,
            },
        },
        [PrefKey.VIDEO_BRIGHTNESS]: {
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 50,
            max: 150,
            params: {
                suffix: '%',
                ticks: 25,
            },
        },

        [PrefKey.AUDIO_MIC_ON_PLAYING]: {
            label: t('enable-mic-on-startup'),
            default: false,
        },
        [PrefKey.AUDIO_ENABLE_VOLUME_CONTROL]: {
            label: t('enable-volume-control'),
            default: false,
            experimental: true,
        },
        [PrefKey.AUDIO_VOLUME]: {
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 0,
            max: 600,
            params: {
                suffix: '%',
                ticks: 100,
            },
        },


        [PrefKey.STATS_ITEMS]: {
            default: [StreamStat.PING, StreamStat.FPS, StreamStat.BITRATE, StreamStat.DECODE_TIME, StreamStat.PACKETS_LOST, StreamStat.FRAMES_LOST],
            multipleOptions: {
                [StreamStat.PING]: `${StreamStat.PING.toUpperCase()}: ${t('stat-ping')}`,
                [StreamStat.FPS]: `${StreamStat.FPS.toUpperCase()}: ${t('stat-fps')}`,
                [StreamStat.BITRATE]: `${StreamStat.BITRATE.toUpperCase()}: ${t('stat-bitrate')}`,
                [StreamStat.DECODE_TIME]: `${StreamStat.DECODE_TIME.toUpperCase()}: ${t('stat-decode-time')}`,
                [StreamStat.PACKETS_LOST]: `${StreamStat.PACKETS_LOST.toUpperCase()}: ${t('stat-packets-lost')}`,
                [StreamStat.FRAMES_LOST]: `${StreamStat.FRAMES_LOST.toUpperCase()}: ${t('stat-frames-lost')}`,
            },
            params: {
                size: 6,
            },
        },
        [PrefKey.STATS_SHOW_WHEN_PLAYING]: {
            default: false,
        },
        [PrefKey.STATS_QUICK_GLANCE]: {
            default: true,
        },
        [PrefKey.STATS_POSITION]: {
            default: 'top-right',
            options: {
                'top-left': t('top-left'),
                'top-center': t('top-center'),
                'top-right': t('top-right'),
            },
        },
        [PrefKey.STATS_TEXT_SIZE]: {
            default: '0.9rem',
            options: {
                '0.9rem': t('small'),
                '1.0rem': t('normal'),
                '1.1rem': t('large'),
            },
        },
        [PrefKey.STATS_TRANSPARENT]: {
            default: false,
        },
        [PrefKey.STATS_OPACITY]: {
            type:  SettingElementType.NUMBER_STEPPER,
            default: 80,
            min: 50,
            max: 100,
            params: {
                suffix: '%',
                ticks: 10,
            },
        },
        [PrefKey.STATS_CONDITIONAL_FORMATTING]: {
            default: false,
        },

        [PrefKey.REMOTE_PLAY_ENABLED]: {
            label: t('enable-remote-play-feature'),
            default: false,
        },

        [PrefKey.REMOTE_PLAY_RESOLUTION]: {
            default: '1080p',
            options: {
                '1080p': '1080p',
                '720p': '720p',
            },
        },

        [PrefKey.GAME_FORTNITE_FORCE_CONSOLE]: {
            label: '🎮 ' + t('fortnite-force-console-version'),
            default: false,
            note: t('fortnite-allow-stw-mode'),
        },

        // Deprecated
        /*
        [Preferences.DEPRECATED_CONTROLLER_SUPPORT_LOCAL_CO_OP]: {
            default: false,
            'migrate': function(savedPrefs, value) {
                this.set(Preferences.LOCAL_CO_OP_ENABLED, value);
                savedPrefs[Preferences.LOCAL_CO_OP_ENABLED] = value;
            },
        },
        */
    }

    #storage = localStorage;
    #key = 'better_xcloud';
    #prefs: {[index: string]: any} = {};

    constructor() {
        let savedPrefsStr = this.#storage.getItem(this.#key);
        if (savedPrefsStr == null) {
            savedPrefsStr = '{}';
        }

        const savedPrefs = JSON.parse(savedPrefsStr);

        for (let settingId in Preferences.SETTINGS) {
            const setting = Preferences.SETTINGS[settingId];
            setting.ready && setting.ready.call(this);

            if (setting.migrate && settingId in savedPrefs) {
                setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
            }
        }

        for (let settingId in Preferences.SETTINGS) {
            const setting = Preferences.SETTINGS[settingId];
            if (!setting) {
                alert(`Undefined setting key: ${settingId}`);
                console.log('Undefined setting key');
                continue;
            }

            // Ignore deprecated settings
            if (setting.migrate) {
                continue;
            }

            if (settingId in savedPrefs) {
                this.#prefs[settingId] = this.#validateValue(settingId, savedPrefs[settingId]);
            } else {
                this.#prefs[settingId] = setting.default;
            }
        }
    }

    #validateValue(key: keyof typeof Preferences.SETTINGS, value: any) {
        const config = Preferences.SETTINGS[key];
        if (!config) {
            return value;
        }

        if (typeof value === 'undefined' || value === null) {
            value = config.default;
        }

        if ('min' in config) {
            value = Math.max(config.min!, value);
        }

        if ('max' in config) {
            value = Math.min(config.max!, value);
        }

        if ('options' in config && !(value in config.options!)) {
            value = config.default;
        } else if ('multipleOptions' in config) {
            if (value.length) {
                const validOptions = Object.keys(config.multipleOptions!);
                value.forEach((item: any, idx: number) => {
                    (validOptions.indexOf(item) === -1) && value.splice(idx, 1);
                });
            }

            if (!value.length) {
                value = config.default;
            }
        }

        return value;
    }

    get(key: PrefKey) {
        if (typeof key === 'undefined') {
            debugger;
            return;
        }

        // Return default value if the feature is not supported
        if (Preferences.SETTINGS[key].unsupported) {
            return Preferences.SETTINGS[key].default;
        }

        if (!(key in this.#prefs)) {
            this.#prefs[key] = this.#validateValue(key, null);
        }

        return this.#prefs[key];
    }

    set(key: PrefKey, value: any) {
        value = this.#validateValue(key, value);

        this.#prefs[key] = value;
        this.#updateStorage();
    }

    #updateStorage() {
        this.#storage.setItem(this.#key, JSON.stringify(this.#prefs));
    }

    toElement(key: keyof typeof Preferences.SETTINGS, onChange: any, overrideParams={}) {
        const setting = Preferences.SETTINGS[key];
        let currentValue = this.get(key);

        let $control;
        let type;
        if ('type' in setting) {
            type = setting.type;
        } else if ('options' in setting) {
            type = SettingElementType.OPTIONS;
        } else if ('multipleOptions' in setting) {
            type = SettingElementType.MULTIPLE_OPTIONS;
        } else if (typeof setting.default === 'number') {
            type = SettingElementType.NUMBER;
        } else {
            type = SettingElementType.CHECKBOX;
        }

        const params = Object.assign(overrideParams, setting.params || {});
        if (params.disabled) {
            currentValue = Preferences.SETTINGS[key].default;
        }

        $control = SettingElement.render(type!, key as string, setting, currentValue, (e: any, value: any) => {
                this.set(key, value);
                onChange && onChange(e, value);
            }, params);

        return $control;
    }

    toNumberStepper(key: keyof typeof Preferences.SETTINGS, onChange: any, options={}) {
        return SettingElement.render(SettingElementType.NUMBER_STEPPER, key, Preferences.SETTINGS[key], this.get(key), (e: any, value: any) => {
                this.set(key, value);
                onChange && onChange(e, value);
            }, options);
    }
}


const prefs = new Preferences();
export const getPref = prefs.get.bind(prefs);
export const setPref = prefs.set.bind(prefs);
export const toPrefElement = prefs.toElement.bind(prefs);
