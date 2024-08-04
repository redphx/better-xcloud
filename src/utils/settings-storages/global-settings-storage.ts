import { BypassServers } from "@/enums/bypass-servers";
import { PrefKey, StorageKey } from "@/enums/pref-keys";
import { StreamPlayerType, StreamVideoProcessing } from "@/enums/stream-player";
import { UiSection } from "@/enums/ui-sections";
import { UserAgentProfile } from "@/enums/user-agent";
import { StreamStat } from "@/modules/stream/stream-stats";
import type { PreferenceSetting } from "@/types/preferences";
import { type SettingDefinitions } from "@/types/setting-definition";
import { BX_FLAGS } from "../bx-flags";
import { STATES, AppInterface, STORAGE } from "../global";
import { CE } from "../html";
import { t, SUPPORTED_LANGUAGES } from "../translation";
import { UserAgent } from "../user-agent";
import { BaseSettingsStore as BaseSettingsStorage } from "./base-settings-storage";
import { SettingElementType } from "../setting-element";


function getSupportedCodecProfiles() {
    const options: {[index: string]: string} = {
        default: t('default'),
    };

    if (!('getCapabilities' in RTCRtpReceiver)) {
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
        if (fmtp.includes('profile-level-id=4d')) {
            hasHighCodec = true;
        } else if (fmtp.includes('profile-level-id=42e')) {
            hasNormalCodec = true;
        } else if (fmtp.includes('profile-level-id=420')) {
            hasLowCodec = true;
        }
    }

    if (hasLowCodec) {
        if (!hasNormalCodec && !hasHighCodec) {
            options.default = `${t('visual-quality-low')} (${t('default')})`;
        } else {
            options.low = t('visual-quality-low');
        }
    }

    if (hasNormalCodec) {
        if (!hasLowCodec && !hasHighCodec) {
            options.default = `${t('visual-quality-normal')} (${t('default')})`;
        } else {
            options.normal = t('visual-quality-normal');
        }
    }

    if (hasHighCodec) {
        if (!hasLowCodec && !hasNormalCodec) {
            options.default = `${t('visual-quality-high')} (${t('default')})`;
        } else {
            options.high = t('visual-quality-high');
        }
    }

    return options;
}

export class GlobalSettingsStorage extends BaseSettingsStorage {
    private static readonly DEFINITIONS: SettingDefinitions = {
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
            options: SUPPORTED_LANGUAGES,
        },
        [PrefKey.SERVER_REGION]: {
            label: t('region'),
            default: 'default',
        },
        [PrefKey.SERVER_BYPASS_RESTRICTION]: {
            label: t('bypass-region-restriction'),
            note: '⚠️ ' + t('use-this-at-your-own-risk'),
            default: 'off',
            optionsGroup: t('region'),
            options: Object.assign({
                'off': t('off'),
            }, BypassServers),
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
                '720p': '720p',
                '1080p': '1080p',
            },
        },
        [PrefKey.STREAM_CODEC_PROFILE]: {
            label: t('visual-quality'),
            default: 'default',
            options: getSupportedCodecProfiles(),
            ready: (setting: PreferenceSetting) => {
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
            unsupported: !STATES.userAgent.capabilities.touch,
            ready: (setting: PreferenceSetting) => {
                if (setting.unsupported) {
                    setting.default = 'default';
                }
            },
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF]: {
            label: t('tc-auto-off'),
            default: false,
            unsupported: !STATES.userAgent.capabilities.touch,
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY]: {
            type: SettingElementType.NUMBER_STEPPER,
            label: t('tc-default-opacity'),
            default: 100,
            min: 10,
            max: 100,
            steps: 10,
            params: {
                suffix: '%',
                ticks: 10,
                hideSlider: true,
            },
            unsupported: !STATES.userAgent.capabilities.touch,
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
            label: t('tc-standard-layout-style'),
            default: 'default',
            options: {
                default: t('default'),
                white: t('tc-all-white'),
                muted: t('tc-muted-colors'),
            },
            unsupported: !STATES.userAgent.capabilities.touch,
        },
        [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            label: t('tc-custom-layout-style'),
            default: 'default',
            options: {
                default: t('default'),
                muted: t('tc-muted-colors'),
            },
            unsupported: !STATES.userAgent.capabilities.touch,
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

        [PrefKey.BITRATE_VIDEO_MAX]: {
            type: SettingElementType.NUMBER_STEPPER,
            label: t('bitrate-video-maximum'),
            note: '⚠️ ' + t('unexpected-behavior'),
            default: 0,
            min: 0,
            max: 14 * 1024 * 1000,
            steps: 100 * 1024,
            params: {
                exactTicks:  5 * 1024 * 1000,
                customTextValue: (value: any) => {
                    value = parseInt(value);

                    if (value === 0) {
                        return t('unlimited');
                    } else {
                        return (value / (1024 * 1000)).toFixed(1) + ' Mb/s';
                    }
                },
            },
        },

        [PrefKey.GAME_BAR_POSITION]: {
            label: t('position'),
            default: 'bottom-left',
            options: {
                'bottom-left': t('bottom-left'),
                'bottom-right': t('bottom-right'),
                'off': t('off'),
            },
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

        [PrefKey.CONTROLLER_SHOW_CONNECTION_STATUS]: {
            label: t('show-controller-connection-status'),
            default: true,
        },

        [PrefKey.CONTROLLER_ENABLE_SHORTCUTS]: {
            default: false,
        },

        [PrefKey.CONTROLLER_ENABLE_VIBRATION]: {
            label: t('controller-vibration'),
            default: true,
        },

        [PrefKey.CONTROLLER_DEVICE_VIBRATION]: {
            label: t('device-vibration'),
            default: 'off',
            options: {
                on: t('on'),
                auto: t('device-vibration-not-using-gamepad'),
                off: t('off'),
            },
        },

        [PrefKey.CONTROLLER_VIBRATION_INTENSITY]: {
            label: t('vibration-intensity'),
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
                return !AppInterface && userAgent.match(/(android|iphone|ipad)/) ? t('browser-unsupported-feature') : false;
            })(),
            ready: (setting: PreferenceSetting) => {
                let note;
                let url;
                if (setting.unsupported) {
                    note = t('browser-unsupported-feature');
                    url = 'https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657';
                } else {
                    note = t('mkb-disclaimer');
                    url = 'https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer';
                }

                setting.note = CE('a', {
                        href: url,
                        target: '_blank',
                    }, '⚠️ ' + note);
            },
        },

        [PrefKey.NATIVE_MKB_ENABLED]: {
            label: t('native-mkb'),
            default: 'default',
            options: {
                default: t('default'),
                on: t('on'),
                off: t('off'),
            },
            ready: (setting: PreferenceSetting) => {
                if (AppInterface) {

                } else if (UserAgent.isMobile()) {
                    setting.unsupported = true;
                    setting.default = 'off';
                    delete setting.options!['default'];
                    delete setting.options!['on'];
                } else {
                    delete setting.options!['on'];
                }
            },
        },

        [PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY]: {
            label: t('horizontal-scroll-sensitivity'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 0,
            min: 0,
            max: 100 * 100,
            steps: 10,
            params: {
                exactTicks: 20 * 100,
                customTextValue: (value: any) => {
                    if (!value) {
                        return t('default');
                    }

                    return (value / 100).toFixed(1) + 'x';
                },
            },
        },

        [PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY]: {
            label: t('vertical-scroll-sensitivity'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 0,
            min: 0,
            max: 100 * 100,
            steps: 10,
            params: {
                exactTicks: 20 * 100,
                customTextValue: (value: any) => {
                    if (!value) {
                        return t('default');
                    }

                    return (value / 100).toFixed(1) + 'x';
                },
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

        [PrefKey.UI_CONTROLLER_FRIENDLY]: {
            label: t('controller-friendly-ui'),
            default: BX_FLAGS.DeviceInfo.deviceType !== 'unknown',
        },

        [PrefKey.UI_LAYOUT]: {
            label: t('layout'),
            default: 'default',
            options: {
                default: t('default'),
                normal: t('normal'),
                tv: t('smart-tv'),
            },
        },

        [PrefKey.UI_SCROLLBAR_HIDE]: {
            label: t('hide-scrollbar'),
            default: false,
        },

        [PrefKey.UI_HOME_CONTEXT_MENU_DISABLED]: {
            label: t('disable-home-context-menu'),
            default: STATES.browser.capabilities.touch,
        },

        [PrefKey.UI_HIDE_SECTIONS]: {
            label: t('hide-sections'),
            default: [],
            multipleOptions: {
                [UiSection.NEWS]: t('section-news'),
                [UiSection.FRIENDS]: t('section-play-with-friends'),
                [UiSection.NATIVE_MKB]: t('section-native-mkb'),
                [UiSection.TOUCH]: t('section-touch'),
                [UiSection.MOST_POPULAR]: t('section-most-popular'),
                [UiSection.ALL_GAMES]: t('section-all-games'),
            },
            params: {
                size: 6,
            },
        },

        [PrefKey.UI_GAME_CARD_SHOW_WAIT_TIME]: {
            label: t('show-wait-time-in-game-card'),
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
            note: '⚠️ ' + t('unexpected-behavior'),
            default: (BX_FLAGS.DeviceInfo.deviceType === 'android-tv' || BX_FLAGS.DeviceInfo.deviceType === 'webos') ? UserAgentProfile.VR_OCULUS : 'default',
            options: {
                [UserAgentProfile.DEFAULT]: t('default'),
                [UserAgentProfile.WINDOWS_EDGE]: 'Edge + Windows',
                [UserAgentProfile.MACOS_SAFARI]: 'Safari + macOS',
                [UserAgentProfile.VR_OCULUS]: 'Android TV',
                [UserAgentProfile.SMART_TV_GENERIC]: 'Smart TV',
                [UserAgentProfile.SMART_TV_TIZEN]: 'Samsung Smart TV',
                [UserAgentProfile.CUSTOM]: t('custom'),
            },
        },
        [PrefKey.VIDEO_PLAYER_TYPE]: {
            label: t('renderer'),
            default: 'default',
            options: {
                [StreamPlayerType.VIDEO]: t('default'),
                [StreamPlayerType.WEBGL2]: t('webgl2'),
            },
        },
        [PrefKey.VIDEO_PROCESSING]: {
            label: t('clarity-boost'),
            default: StreamVideoProcessing.USM,
            options: {
                [StreamVideoProcessing.USM]: t('unsharp-masking'),
                [StreamVideoProcessing.CAS]: t('amd-fidelity-cas'),
            },
        },
        [PrefKey.VIDEO_POWER_PREFERENCE]: {
            label: t('renderer-configuration'),
            default: 'default',
            options: {
                'default': t('default'),
                'low-power': t('low-power'),
                'high-performance': t('high-performance'),
            },
        },
        [PrefKey.VIDEO_SHARPNESS]: {
            label: t('sharpness'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 0,
            min: 0,
            max: 10,
            params: {
                exactTicks: 2,
                customTextValue: (value: any) => {
                    value = parseInt(value);
                    return value === 0 ? t('off') : value.toString();
                },
            },
        },
        [PrefKey.VIDEO_RATIO]: {
            label: t('aspect-ratio'),
            note: t('aspect-ratio-note'),
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
            label: t('saturation'),
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
            label: t('contrast'),
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
            label: t('brightness'),
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
        },
        [PrefKey.AUDIO_VOLUME]: {
            label: t('volume'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 0,
            max: 600,
            steps: 10,
            params: {
                suffix: '%',
                ticks: 100,
            },
        },


        [PrefKey.STATS_ITEMS]: {
            label: t('stats'),
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
            label: t('show-stats-on-startup'),
            default: false,
        },
        [PrefKey.STATS_QUICK_GLANCE]: {
            label: '👀 ' + t('enable-quick-glance-mode'),
            default: true,
        },
        [PrefKey.STATS_POSITION]: {
            label: t('position'),
            default: 'top-right',
            options: {
                'top-left': t('top-left'),
                'top-center': t('top-center'),
                'top-right': t('top-right'),
            },
        },
        [PrefKey.STATS_TEXT_SIZE]: {
            label: t('text-size'),
            default: '0.9rem',
            options: {
                '0.9rem': t('small'),
                '1.0rem': t('normal'),
                '1.1rem': t('large'),
            },
        },
        [PrefKey.STATS_TRANSPARENT]: {
            label: t('transparent-background'),
            default: false,
        },
        [PrefKey.STATS_OPACITY]: {
            label: t('opacity'),
            type:  SettingElementType.NUMBER_STEPPER,
            default: 80,
            min: 50,
            max: 100,
            steps: 10,
            params: {
                suffix: '%',
                ticks: 10,
            },
        },
        [PrefKey.STATS_CONDITIONAL_FORMATTING]: {
            label: t('conditional-formatting'),
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
    };

    constructor() {
        super(StorageKey.GLOBAL, GlobalSettingsStorage.DEFINITIONS);
    }
}


const globalSettings = new GlobalSettingsStorage();
export const getPrefDefinition = globalSettings.getDefinition.bind(globalSettings);
export const getPref = globalSettings.getSetting.bind(globalSettings);
export const setPref = globalSettings.setSetting.bind(globalSettings);
STORAGE.Global = globalSettings;
