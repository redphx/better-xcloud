import { BypassServers } from "@/enums/bypass-servers";
import { PrefKey, StorageKey } from "@/enums/pref-keys";
import { UserAgentProfile } from "@/enums/user-agent";
import { type SettingDefinition, type SettingDefinitions } from "@/types/setting-definition";
import { BX_FLAGS } from "../bx-flags";
import { STATES, AppInterface, STORAGE } from "../global";
import { CE } from "../html";
import { t, SUPPORTED_LANGUAGES } from "../translation";
import { UserAgent } from "../user-agent";
import { BaseSettingsStore as BaseSettingsStorage } from "./base-settings-storage";
import { CodecProfile, StreamResolution, TouchControllerMode, TouchControllerStyleStandard, TouchControllerStyleCustom, GameBarPosition, DeviceVibrationMode, NativeMkbMode, UiLayout, UiSection, StreamPlayerType, StreamVideoProcessing, VideoRatio, StreamStat, VideoPosition } from "@/enums/pref-values";
import { MkbMappingDefaultPresetId } from "../local-db/mkb-mapping-presets-table";
import { KeyboardShortcutDefaultId } from "../local-db/keyboard-shortcuts-table";
import { GhPagesUtils } from "../gh-pages";
import { EventBus } from "../event-bus";


function getSupportedCodecProfiles() {
    const options: PartialRecord<CodecProfile, string> = {
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
            options[CodecProfile.DEFAULT] = `${t('visual-quality-low')} (${t('default')})`;
        } else {
            options[CodecProfile.LOW] = t('visual-quality-low');
        }
    }

    if (hasNormalCodec) {
        if (!hasLowCodec && !hasHighCodec) {
            options[CodecProfile.DEFAULT] = `${t('visual-quality-normal')} (${t('default')})`;
        } else {
            options[CodecProfile.NORMAL] = t('visual-quality-normal');
        }
    }

    if (hasHighCodec) {
        if (!hasLowCodec && !hasNormalCodec) {
            options[CodecProfile.DEFAULT] = `${t('visual-quality-high')} (${t('default')})`;
        } else {
            options[CodecProfile.HIGH] = t('visual-quality-high');
        }
    }

    return options;
}

export class GlobalSettingsStorage extends BaseSettingsStorage {
    private static readonly DEFINITIONS = {
        [PrefKey.VERSION_LAST_CHECK]: {
            default: 0,
        },
        [PrefKey.VERSION_LATEST]: {
            default: '',
        },
        [PrefKey.VERSION_CURRENT]: {
            default: '',
        },
        [PrefKey.SCRIPT_LOCALE]: {
            label: t('language'),
            default: localStorage.getItem(StorageKey.LOCALE) || 'en-US',
            options: SUPPORTED_LANGUAGES,
        },
        [PrefKey.SERVER_REGION]: {
            label: t('region'),
            note: CE('a', { target: '_blank', href: 'https://umap.openstreetmap.fr/en/map/xbox-cloud-gaming-servers_1135022' }, t('server-locations')),
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
                'bg-BG': 'Български',
                'cs-CZ': 'čeština',
                'da-DK': 'dansk',
                'de-DE': 'Deutsch',
                'el-GR': 'Ελληνικά',
                'en-GB': 'English (UK)',
                'en-US': 'English (US)',
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
                'ro-RO': 'Română',
                'ru-RU': 'русский',
                'sk-SK': 'slovenčina',
                'sv-SE': 'svenska',
                'th-TH': 'ไทย',
                'tr-TR': 'Türkçe',
                'zh-CN': '中文(简体)',
                'zh-TW': '中文 (繁體)',
            },
        },
        [PrefKey.STREAM_RESOLUTION]: {
            label: t('target-resolution'),
            default: 'auto',
            options: {
                auto: t('default'),
                [StreamResolution.DIM_720P]: '720p',
                [StreamResolution.DIM_1080P]: '1080p',
                [StreamResolution.DIM_1080P_HQ]: '1080p (HQ)',
            },
            suggest: {
                lowest: StreamResolution.DIM_720P,
                highest: StreamResolution.DIM_1080P_HQ,
            },
        },

        [PrefKey.STREAM_CODEC_PROFILE]: {
            label: t('visual-quality'),
            default: CodecProfile.DEFAULT,
            options: getSupportedCodecProfiles(),
            ready: (setting: SettingDefinition) => {
                const options = (setting as any).options;
                const keys = Object.keys(options);

                if (keys.length <= 1) { // Unsupported
                    setting.unsupported = true;
                    setting.unsupportedNote = '⚠️ ' + t('browser-unsupported-feature');
                }

                setting.suggest = {
                    lowest: keys.length === 1 ? keys[0] : keys[1],
                    highest: keys[keys.length - 1],
                };
            },
        },
        [PrefKey.SERVER_PREFER_IPV6]: {
            label: t('prefer-ipv6-server'),
            default: false,
        },

        [PrefKey.SCREENSHOT_APPLY_FILTERS]: {
            requiredVariants: 'full',
            label: t('screenshot-apply-filters'),
            default: false,
        },

        [PrefKey.UI_SKIP_SPLASH_VIDEO]: {
            label: t('skip-splash-video'),
            default: false,
        },
        [PrefKey.UI_HIDE_SYSTEM_MENU_ICON]: {
            label: t('hide-system-menu-icon'),
            default: false,
        },

        [PrefKey.STREAM_COMBINE_SOURCES]: {
            requiredVariants: 'full',

            label: t('combine-audio-video-streams'),
            default: false,
            experimental: true,
            note: t('combine-audio-video-streams-summary'),
        },

        [PrefKey.TOUCH_CONTROLLER_MODE]: {
            requiredVariants: 'full',
            label: t('tc-availability'),
            default: TouchControllerMode.ALL,
            options: {
                [TouchControllerMode.DEFAULT]: t('default'),
                [TouchControllerMode.OFF]: t('off'),
                [TouchControllerMode.ALL]: t('tc-all-games'),
            },

            unsupported: !STATES.userAgent.capabilities.touch,
            unsupportedValue: TouchControllerMode.DEFAULT,
        },
        [PrefKey.TOUCH_CONTROLLER_AUTO_OFF]: {
            requiredVariants: 'full',
            label: t('tc-auto-off'),
            default: false,
            unsupported: !STATES.userAgent.capabilities.touch,
        },
        [PrefKey.TOUCH_CONTROLLER_DEFAULT_OPACITY]: {
            requiredVariants: 'full',
            label: t('tc-default-opacity'),
            default: 100,
            min: 10,
            max: 100,
            params: {
                steps: 10,
                suffix: '%',
                ticks: 10,
                hideSlider: true,
            },
            unsupported: !STATES.userAgent.capabilities.touch,
        },
        [PrefKey.TOUCH_CONTROLLER_STYLE_STANDARD]: {
            requiredVariants: 'full',
            label: t('tc-standard-layout-style'),
            default: TouchControllerStyleStandard.DEFAULT,
            options: {
                [TouchControllerStyleStandard.DEFAULT]: t('default'),
                [TouchControllerStyleStandard.WHITE]: t('tc-all-white'),
                [TouchControllerStyleStandard.MUTED]: t('tc-muted-colors'),
            },
            unsupported: !STATES.userAgent.capabilities.touch,
        },
        [PrefKey.TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            requiredVariants: 'full',
            label: t('tc-custom-layout-style'),
            default: TouchControllerStyleCustom.DEFAULT,
            options: {
                [TouchControllerStyleCustom.DEFAULT]: t('default'),
                [TouchControllerStyleCustom.MUTED]: t('tc-muted-colors'),
            },
            unsupported: !STATES.userAgent.capabilities.touch,
        },

        [PrefKey.UI_SIMPLIFY_STREAM_MENU]: {
            label: t('simplify-stream-menu'),
            default: false,
        },
        [PrefKey.MKB_HIDE_IDLE_CURSOR]: {
            requiredVariants: 'full',
            label: t('hide-idle-cursor'),
            default: false,
        },
        [PrefKey.UI_DISABLE_FEEDBACK_DIALOG]: {
            requiredVariants: 'full',
            label: t('disable-post-stream-feedback-dialog'),
            default: false,
        },

        [PrefKey.STREAM_MAX_VIDEO_BITRATE]: {
            requiredVariants: 'full',
            label: t('bitrate-video-maximum'),
            note: '⚠️ ' + t('unexpected-behavior'),
            default: 0,
            min: 1024 * 100,
            max: 15 * 1024 * 1000,
            transformValue: {
                get(value) {
                    return value === 0 ? this.max : value;
                },

                set(value) {
                    return value === this.max ? 0 : value;
                },
            },
            params: {
                steps: 100 * 1024,
                exactTicks: 5 * 1024 * 1000,
                customTextValue: (value: any, min, max) => {
                    value = parseInt(value);

                    if (value === max) {
                        return t('unlimited');
                    } else {
                        return (value / (1024 * 1000)).toFixed(1) + ' Mb/s';
                    }
                },
            },
            suggest: {
                highest: 0,
            },
        },

        [PrefKey.GAME_BAR_POSITION]: {
            requiredVariants: 'full',
            label: t('position'),
            default: GameBarPosition.BOTTOM_LEFT,
            options: {
                [GameBarPosition.OFF]: t('off'),
                [GameBarPosition.BOTTOM_LEFT]: t('bottom-left'),
                [GameBarPosition.BOTTOM_RIGHT]: t('bottom-right'),
            },
        },

        [PrefKey.LOCAL_CO_OP_ENABLED]: {
            requiredVariants: 'full',
            label: t('enable-local-co-op-support'),
            default: false,
            note: () => CE<HTMLAnchorElement>('a', {
                href: 'https://github.com/redphx/better-xcloud/discussions/275',
                target: '_blank',
            }, t('enable-local-co-op-support-note')),
        },

        [PrefKey.UI_CONTROLLER_SHOW_STATUS]: {
            label: t('show-controller-connection-status'),
            default: true,
        },

        [PrefKey.DEVICE_VIBRATION_MODE]: {
            requiredVariants: 'full',
            label: t('device-vibration'),
            default: DeviceVibrationMode.OFF,
            options: {
                [DeviceVibrationMode.OFF]: t('off'),
                [DeviceVibrationMode.ON]: t('on'),
                [DeviceVibrationMode.AUTO]: t('device-vibration-not-using-gamepad'),
            },
        },

        [PrefKey.DEVICE_VIBRATION_INTENSITY]: {
            requiredVariants: 'full',
            label: t('vibration-intensity'),
            default: 50,
            min: 10,
            max: 100,
            params: {
                steps: 10,
                suffix: '%',
                exactTicks: 20,
            },
        },

        [PrefKey.CONTROLLER_POLLING_RATE]: {
            requiredVariants: 'full',
            label: t('polling-rate'),
            default: 4,
            min: 4,
            max: 60,
            params: {
                steps: 4,
                exactTicks: 20,
                reverse: true,
                customTextValue(value: any) {
                    value = parseInt(value);

                    let text = +(1000 / value).toFixed(2) + ' Hz';
                    if (value === 4) {
                        text = `${text} (${t('default')})`;
                    }

                    return text;
                },
            },
        },

        [PrefKey.MKB_ENABLED]: {
            requiredVariants: 'full',
            label: t('enable-mkb'),
            default: false,
            unsupported: !STATES.userAgent.capabilities.mkb || !STATES.browser.capabilities.mkb,
            ready: (setting: SettingDefinition) => {
                let note;
                let url;
                if (setting.unsupported) {
                    note = t('browser-unsupported-feature');
                    url = 'https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657';
                } else {
                    note = t('mkb-disclaimer');
                    url = 'https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer';
                }

                setting.unsupportedNote = () => CE<HTMLAnchorElement>('a', {
                    href: url,
                    target: '_blank',
                }, '⚠️ ' + note);
            },
        },

        [PrefKey.NATIVE_MKB_MODE]: {
            requiredVariants: 'full',
            label: t('native-mkb'),
            default: NativeMkbMode.DEFAULT,
            options: {
                [NativeMkbMode.DEFAULT]: t('default'),
                [NativeMkbMode.OFF]: t('off'),
                [NativeMkbMode.ON]: t('on'),
            },
            ready: (setting: SettingDefinition) => {
                if (STATES.browser.capabilities.emulatedNativeMkb) {
                } else if (UserAgent.isMobile()) {
                    setting.unsupported = true;
                    setting.unsupportedValue = NativeMkbMode.OFF;
                    delete (setting as any).options[NativeMkbMode.DEFAULT];
                    delete (setting as any).options[NativeMkbMode.ON];
                } else {
                    delete (setting as any).options[NativeMkbMode.ON];
                }
            },
        },

        [PrefKey.NATIVE_MKB_FORCED_GAMES]: {
            label: t('force-native-mkb-games'),
            default: [],
            unsupported: !AppInterface && UserAgent.isMobile(),
            ready: (setting: SettingDefinition) => {
                if (!setting.unsupported) {
                    (setting as any).multipleOptions = GhPagesUtils.getNativeMkbCustomList(true);

                    EventBus.Script.on('listForcedNativeMkbUpdated', () => {
                        (setting as any).multipleOptions = GhPagesUtils.getNativeMkbCustomList();
                    });
                }
            },
            params: {
                size: 6,
            },
        },

        [PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY]: {
            requiredVariants: 'full',
            label: t('horizontal-scroll-sensitivity'),
            default: 0,
            min: 0,
            max: 100 * 100,
            params: {
                steps: 10,
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
            requiredVariants: 'full',
            label: t('vertical-scroll-sensitivity'),
            default: 0,
            min: 0,
            max: 100 * 100,
            params: {
                steps: 10,
                exactTicks: 20 * 100,
                customTextValue: (value: any) => {
                    if (!value) {
                        return t('default');
                    }

                    return (value / 100).toFixed(1) + 'x';
                },
            },
        },

        [PrefKey.MKB_P1_MAPPING_PRESET_ID]: {
            requiredVariants: 'full',
            default: MkbMappingDefaultPresetId.DEFAULT,
        },

        [PrefKey.MKB_P1_SLOT]: {
            requiredVariants: 'full',
            default: 1,
            min: 1,
            max: 4,
            params: {
                hideSlider: true,
            },
        },

        [PrefKey.MKB_P2_MAPPING_PRESET_ID]: {
            requiredVariants: 'full',
            default: MkbMappingDefaultPresetId.OFF,
        },

        [PrefKey.MKB_P2_SLOT]: {
            requiredVariants: 'full',
            default: 0,
            min: 0,
            max: 4,
            params: {
                hideSlider: true,
                customTextValue(value) {
                    value = parseInt(value);
                    return (value === 0) ? t('off') : value.toString();
                },
            },
        },

        [PrefKey.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID]: {
            requiredVariants: 'full',
            default: KeyboardShortcutDefaultId.DEFAULT,
        },

        [PrefKey.UI_REDUCE_ANIMATIONS]: {
            label: t('reduce-animations'),
            default: false,
        },

        [PrefKey.LOADING_SCREEN_GAME_ART]: {
            requiredVariants: 'full',
            label: t('show-game-art'),
            default: true,
        },
        [PrefKey.LOADING_SCREEN_SHOW_WAIT_TIME]: {
            label: t('show-wait-time'),
            default: true,
        },
        [PrefKey.LOADING_SCREEN_ROCKET]: {
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
            requiredVariants: 'full',
            label: t('layout'),
            default: UiLayout.DEFAULT,
            options: {
                [UiLayout.DEFAULT]: t('default'),
                [UiLayout.NORMAL]: t('normal'),
                [UiLayout.TV]: t('smart-tv'),
            },
        },

        [PrefKey.UI_SCROLLBAR_HIDE]: {
            label: t('hide-scrollbar'),
            default: false,
        },

        [PrefKey.UI_HIDE_SECTIONS]: {
            requiredVariants: 'full',
            label: t('hide-sections'),
            default: [],
            multipleOptions: {
                [UiSection.NEWS]: t('section-news'),
                [UiSection.FRIENDS]: t('section-play-with-friends'),
                [UiSection.NATIVE_MKB]: t('section-native-mkb'),
                [UiSection.TOUCH]: t('section-touch'),
                // [UiSection.BOYG]: t('section-byog'),
                [UiSection.MOST_POPULAR]: t('section-most-popular'),
                [UiSection.ALL_GAMES]: t('section-all-games'),
            },
            params: {
                size: 0,
            },
        },

        [PrefKey.BYOG_DISABLED]: {
            label: t('disable-byog-feature'),
            default: false,
        },

        [PrefKey.UI_GAME_CARD_SHOW_WAIT_TIME]: {
            requiredVariants: 'full',
            label: t('show-wait-time-in-game-card'),
            default: true,
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
            default: StreamPlayerType.VIDEO,
            options: {
                [StreamPlayerType.VIDEO]: t('default'),
                [StreamPlayerType.WEBGL2]: t('webgl2'),
            },
            suggest: {
                lowest: StreamPlayerType.VIDEO,
                highest: StreamPlayerType.WEBGL2,
            },
        },
        [PrefKey.VIDEO_PROCESSING]: {
            label: t('clarity-boost'),
            default: StreamVideoProcessing.USM,
            options: {
                [StreamVideoProcessing.USM]: t('unsharp-masking'),
                [StreamVideoProcessing.CAS]: t('amd-fidelity-cas'),
            },
            suggest: {
                lowest: StreamVideoProcessing.USM,
                highest: StreamVideoProcessing.CAS,
            },
        },
        [PrefKey.VIDEO_POWER_PREFERENCE]: {
            label: t('renderer-configuration'),
            default: 'default',
            options: {
                default: t('default'),
                'low-power': t('battery-saving'),
                'high-performance': t('high-performance'),
            },
            suggest: {
                highest: 'low-power',
            },
        },
        [PrefKey.VIDEO_MAX_FPS]: {
            label: t('limit-fps'),
            default: 60,
            min: 10,
            max: 60,
            params: {
                steps: 10,
                exactTicks: 10,
                customTextValue: (value: any) => {
                    value = parseInt(value);
                    return value === 60 ? t('unlimited') : value + 'fps';
                },
            },
        },
        [PrefKey.VIDEO_SHARPNESS]: {
            label: t('sharpness'),
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
            suggest: {
                lowest: 0,
                highest: 2,
            },
        },
        [PrefKey.VIDEO_RATIO]: {
            label: t('aspect-ratio'),
            note: STATES.browser.capabilities.touch ? t('aspect-ratio-note') : undefined,
            default: VideoRatio['16:9'],
            options: {
                [VideoRatio['16:9']]: `16:9 (${t('default')})`,
                [VideoRatio['18:9']]: '18:9',
                [VideoRatio['21:9']]: '21:9',
                [VideoRatio['16:10']]: '16:10',
                [VideoRatio['4:3']]: '4:3',

                [VideoRatio.FILL]: t('stretch'),
                //'cover': 'Cover',
            },
        },
        [PrefKey.VIDEO_POSITION]: {
            label: t('position'),
            note: STATES.browser.capabilities.touch ? t('aspect-ratio-note') : undefined,
            default: VideoPosition.CENTER,
            options: {
                [VideoPosition.TOP]: t('top'),
                [VideoPosition.TOP_HALF]: t('top-half'),
                [VideoPosition.CENTER]: `${t('center')} (${t('default')})`,
                [VideoPosition.BOTTOM_HALF]: t('bottom-half'),
                [VideoPosition.BOTTOM]: t('bottom'),
            },
        },

        [PrefKey.VIDEO_SATURATION]: {
            label: t('saturation'),
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
        [PrefKey.AUDIO_VOLUME_CONTROL_ENABLED]: {
            requiredVariants: 'full',
            label: t('enable-volume-control'),
            default: false,
        },
        [PrefKey.AUDIO_VOLUME]: {
            label: t('volume'),
            default: 100,
            min: 0,
            max: 600,
            params: {
                steps: 10,
                suffix: '%',
                ticks: 100,
            },
        },

        [PrefKey.STATS_ITEMS]: {
            label: t('stats'),
            default: [StreamStat.PING, StreamStat.FPS, StreamStat.BITRATE, StreamStat.DECODE_TIME, StreamStat.PACKETS_LOST, StreamStat.FRAMES_LOST],
            multipleOptions: {
                [StreamStat.CLOCK]: t('clock'),
                [StreamStat.PLAYTIME]: t('playtime'),
                [StreamStat.BATTERY]: t('battery'),
                [StreamStat.PING]: t('stat-ping'),
                [StreamStat.JITTER]: t('jitter'),
                [StreamStat.FPS]: t('stat-fps'),
                [StreamStat.BITRATE]: t('stat-bitrate'),
                [StreamStat.DECODE_TIME]: t('stat-decode-time'),
                [StreamStat.PACKETS_LOST]: t('stat-packets-lost'),
                [StreamStat.FRAMES_LOST]: t('stat-frames-lost'),
                [StreamStat.DOWNLOAD]: t('downloaded'),
                [StreamStat.UPLOAD]: t('uploaded'),
            },
            params: {
                size: 0,
            },
            ready: setting => {
                // Remove Battery option in unsupported browser
                const multipleOptions = (setting as any).multipleOptions;
                if (!STATES.browser.capabilities.batteryApi) {
                    delete multipleOptions[StreamStat.BATTERY];
                }

                // Update texts
                for (const key in multipleOptions) {
                    multipleOptions[key] = (key as string).toUpperCase() + ': ' + multipleOptions[key];
                }
            },
        },
        [PrefKey.STATS_SHOW_WHEN_PLAYING]: {
            label: t('show-stats-on-startup'),
            default: false,
        },
        [PrefKey.STATS_QUICK_GLANCE_ENABLED]: {
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
            default: 80,
            min: 50,
            max: 100,
            params: {
                steps: 10,
                suffix: '%',
                ticks: 10,
            },
        },
        [PrefKey.STATS_CONDITIONAL_FORMATTING]: {
            label: t('conditional-formatting'),
            default: false,
        },

        [PrefKey.REMOTE_PLAY_ENABLED]: {
            requiredVariants: 'full',
            label: t('enable-remote-play-feature'),
            default: false,
        },

        [PrefKey.REMOTE_PLAY_STREAM_RESOLUTION]: {
            requiredVariants: 'full',
            default: StreamResolution.DIM_1080P,
            options: {
                [StreamResolution.DIM_720P]: '720p',
                [StreamResolution.DIM_1080P]: '1080p',
                [StreamResolution.DIM_1080P_HQ]: '1080p (HQ)',
            },
        },

        [PrefKey.GAME_FORTNITE_FORCE_CONSOLE]: {
            requiredVariants: 'full',
            label: '🎮 ' + t('fortnite-force-console-version'),
            default: false,
            note: t('fortnite-allow-stw-mode'),
        },
    } satisfies SettingDefinitions;

    constructor() {
        super(StorageKey.GLOBAL, GlobalSettingsStorage.DEFINITIONS);
    }
}


const globalSettings = new GlobalSettingsStorage();
export const getPrefDefinition = globalSettings.getDefinition.bind(globalSettings);
export const getPref = globalSettings.getSetting.bind(globalSettings);
export const setPref = globalSettings.setSetting.bind(globalSettings);
STORAGE.Global = globalSettings;
