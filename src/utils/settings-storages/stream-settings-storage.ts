import { StreamPref, StorageKey, type PrefTypeMap } from "@/enums/pref-keys";
import { DeviceVibrationMode, StreamPlayerType, StreamVideoProcessing, VideoPowerPreference, VideoRatio, VideoPosition, StreamStat, StreamStatPosition, StreamVideoProcessingMode } from "@/enums/pref-values";
import { STATES } from "../global";
import { KeyboardShortcutDefaultId } from "../local-db/keyboard-shortcuts-table";
import { MkbMappingDefaultPresetId } from "../local-db/mkb-mapping-presets-table";
import { t } from "../translation";
import { BaseSettingsStorage } from "./base-settings-storage";
import { CE } from "../html";
import type { SettingActionOrigin, SettingDefinitions } from "@/types/setting-definition";
import { BxIcon } from "../bx-icon";
import { GameSettingsStorage } from "./game-settings-storage";
import { BxLogger } from "../bx-logger";
import { ControllerCustomizationDefaultPresetId } from "../local-db/controller-customizations-table";
import { ControllerShortcutDefaultId } from "../local-db/controller-shortcuts-table";
import { BxEventBus } from "../bx-event-bus";
import { WebGPUPlayer } from "@/modules/player/webgpu/webgpu-player";


export class StreamSettingsStorage extends BaseSettingsStorage<StreamPref> {
    static readonly DEFINITIONS: SettingDefinitions<StreamPref> = {
        [StreamPref.DEVICE_VIBRATION_MODE]: {
            requiredVariants: 'full',
            label: t('device-vibration'),
            default: DeviceVibrationMode.OFF,
            options: {
                [DeviceVibrationMode.OFF]: t('off'),
                [DeviceVibrationMode.ON]: t('on'),
                [DeviceVibrationMode.AUTO]: t('device-vibration-not-using-gamepad'),
            },
        },

        [StreamPref.DEVICE_VIBRATION_INTENSITY]: {
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

        [StreamPref.CONTROLLER_POLLING_RATE]: {
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

        [StreamPref.CONTROLLER_SETTINGS]: {
            default: {},
        },

        [StreamPref.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY]: {
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

        [StreamPref.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY]: {
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

        [StreamPref.MKB_P1_MAPPING_PRESET_ID]: {
            requiredVariants: 'full',
            default: MkbMappingDefaultPresetId.DEFAULT,
        },

        [StreamPref.MKB_DISABLE_ZOOM]: {
            requiredVariants: 'full',
            label: t('disable-zoom'),
            default: false,
        },

        [StreamPref.MKB_P1_SLOT]: {
            requiredVariants: 'full',
            default: 1,
            min: 1,
            max: 4,
            params: {
                hideSlider: true,
            },
        },

        [StreamPref.MKB_P2_MAPPING_PRESET_ID]: {
            requiredVariants: 'full',
            default: MkbMappingDefaultPresetId.OFF,
        },

        [StreamPref.MKB_P2_SLOT]: {
            requiredVariants: 'full',
            default: 0,
            min: 0,
            max: 4,
            params: {
                hideSlider: true,
                customTextValue(value: any) {
                    value = parseInt(value);
                    return (value === 0) ? t('off') : value.toString();
                },
            },
        },

        [StreamPref.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID]: {
            requiredVariants: 'full',
            default: KeyboardShortcutDefaultId.DEFAULT,
        },

        [StreamPref.VIDEO_PLAYER_TYPE]: {
            label: t('renderer'),
            default: StreamPlayerType.VIDEO,
            options: {
                [StreamPlayerType.VIDEO]: t('default'),
                [StreamPlayerType.WEBGL2]: t('webgl2'),
                [StreamPlayerType.WEBGPU]: `${t('webgpu')} (${t('experimental')})`,
            },
            suggest: {
                lowest: StreamPlayerType.VIDEO,
                highest: StreamPlayerType.WEBGL2,
            },
            ready: (setting: any) => {
                BxEventBus.Script.on('webgpu.ready', () => {
                    if (!WebGPUPlayer.device) {
                        // Remove WebGPU option on unsupported browsers
                        delete setting.options[StreamPlayerType.WEBGPU];
                    }
                });
            },
        },
        [StreamPref.VIDEO_PROCESSING]: {
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
        [StreamPref.VIDEO_PROCESSING_MODE]: {
            label: t('clarity-boost-mode'),
            default: StreamVideoProcessingMode.PERFORMANCE,
            options: {
                [StreamVideoProcessingMode.PERFORMANCE]: t('performance'),
                [StreamVideoProcessingMode.QUALITY]: t('quality'),
            },
            suggest: {
                lowest: StreamVideoProcessingMode.PERFORMANCE,
                highest: StreamVideoProcessingMode.QUALITY,
            },
        },
        [StreamPref.VIDEO_POWER_PREFERENCE]: {
            label: t('renderer-configuration'),
            default: VideoPowerPreference.DEFAULT,
            options: {
                [VideoPowerPreference.DEFAULT]: t('default'),
                [VideoPowerPreference.LOW_POWER]: t('battery-saving'),
                [VideoPowerPreference.HIGH_PERFORMANCE]: t('high-performance'),
            },
            suggest: {
                highest: 'low-power',
            },
        },
        [StreamPref.VIDEO_MAX_FPS]: {
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
        [StreamPref.VIDEO_SHARPNESS]: {
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
        [StreamPref.VIDEO_RATIO]: {
            label: t('aspect-ratio'),
            note: STATES.browser.capabilities.touch ? t('aspect-ratio-note') : undefined,
            default: VideoRatio['16:9'],
            options: {
                [VideoRatio['16:9']]: `16:9 (${t('default')})`,
                [VideoRatio['16:10']]: '16:10',
                [VideoRatio['18:9']]: '18:9',
                [VideoRatio['20:9']]: '20:9',
                [VideoRatio['21:9']]: '21:9',
                [VideoRatio['3:2']]: '3:2',
                [VideoRatio['4:3']]: '4:3',
                [VideoRatio['5:4']]: '5:4',

                [VideoRatio.FILL]: t('stretch'),
                //'cover': 'Cover',
            },
        },
        [StreamPref.VIDEO_POSITION]: {
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

        [StreamPref.VIDEO_SATURATION]: {
            label: t('saturation'),
            default: 100,
            min: 50,
            max: 150,
            params: {
                suffix: '%',
                ticks: 25,
            },
        },
        [StreamPref.VIDEO_CONTRAST]: {
            label: t('contrast'),
            default: 100,
            min: 50,
            max: 150,
            params: {
                suffix: '%',
                ticks: 25,
            },
        },
        [StreamPref.VIDEO_BRIGHTNESS]: {
            label: t('brightness'),
            default: 100,
            min: 50,
            max: 150,
            params: {
                suffix: '%',
                ticks: 25,
            },
        },

        [StreamPref.AUDIO_VOLUME]: {
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

        [StreamPref.STATS_ITEMS]: {
            label: t('stats'),
            default: [StreamStat.PING, StreamStat.FPS, StreamStat.BITRATE, StreamStat.DECODE_TIME, StreamStat.PACKETS_LOST, StreamStat.FRAMES_LOST],
            multipleOptions: {
                [StreamStat.CLOCK]: t('clock'),
                [StreamStat.PLAYTIME]: t('playtime'),
                [StreamStat.BATTERY]: t('battery'),
                [StreamStat.PING]: t('stat-ping'),
                [StreamStat.JITTER]: t('jitter'),
                [StreamStat.RESOLUTION]: t('resolution'),
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
            ready: (setting: any) => {
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
        [StreamPref.STATS_SHOW_WHEN_PLAYING]: {
            label: t('show-stats-on-startup'),
            default: false,
        },
        [StreamPref.STATS_QUICK_GLANCE_ENABLED]: {
            label: '👀 ' + t('enable-quick-glance-mode'),
            default: true,
        },
        [StreamPref.STATS_POSITION]: {
            label: t('position'),
            default: StreamStatPosition.TOP_RIGHT,
            options: {
                [StreamStatPosition.TOP_LEFT]: t('top-left'),
                [StreamStatPosition.TOP_CENTER]: t('top-center'),
                [StreamStatPosition.TOP_RIGHT]: t('top-right'),
            },
        },
        [StreamPref.STATS_TEXT_SIZE]: {
            label: t('text-size'),
            default: '0.9rem',
            options: {
                '0.9rem': t('small'),
                '1.0rem': t('normal'),
                '1.1rem': t('large'),
            },
        },
        [StreamPref.STATS_OPACITY_ALL]: {
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
        [StreamPref.STATS_OPACITY_BACKGROUND]: {
            label: t('background-opacity'),
            default: 100,
            min: 0,
            max: 100,
            params: {
                steps: 10,
                suffix: '%',
                ticks: 10,
            },
        },
        [StreamPref.STATS_CONDITIONAL_FORMATTING]: {
            label: t('conditional-formatting'),
            default: false,
        },

        [StreamPref.LOCAL_CO_OP_ENABLED]: {
            requiredVariants: 'full',
            label: t('enable-local-co-op-support'),
            labelIcon: BxIcon.LOCAL_CO_OP,
            default: false,
            note: () => CE('div', false,
                CE('a', {
                    href: 'https://github.com/redphx/better-xcloud/discussions/275',
                    target: '_blank',
                }, t('enable-local-co-op-support-note')),
                CE('br'),
                '⚠️ ' + t('unexpected-behavior'),
            ),
        },
    };

    private gameSettings: {[key: number]: GameSettingsStorage} = {};
    private xboxTitleId: number = -1;

    constructor() {
        super(StorageKey.STREAM, StreamSettingsStorage.DEFINITIONS);
    }

    setGameId(id: number) {
        this.xboxTitleId = id;
    }

    getGameSettings(id: number) {
        if (id > -1) {
            if (!this.gameSettings[id]) {
                const gameStorage = new GameSettingsStorage(id);
                this.gameSettings[id] = gameStorage;

                // Remove values same as global's
                for (const key in gameStorage.settings) {
                    this.getSettingByGame(id, key);
                }
            }

            return this.gameSettings[id];
        }

        return null;
    }

    getSetting<K extends keyof PrefTypeMap<K>>(key: K, checkUnsupported?: boolean): PrefTypeMap<K>[K] {
        return this.getSettingByGame(this.xboxTitleId, key, checkUnsupported)!;
    }

    getSettingByGame<K extends keyof PrefTypeMap<K>>(id: number, key: K, checkUnsupported?: boolean): PrefTypeMap<K>[K] | undefined {
        const gameSettings = this.getGameSettings(id);
        if (gameSettings?.hasSetting(key as StreamPref)) {
            let gameValue = gameSettings.getSetting(key, checkUnsupported);
            const globalValue = super.getSetting(key, checkUnsupported);

            // Remove value if it's the same as global's
            if (globalValue === gameValue) {
                this.deleteSettingByGame(id, key as StreamPref);
                gameValue = globalValue;
            }

            return gameValue;
        }

        return super.getSetting(key, checkUnsupported);
    }

    setSetting<V = any>(key: StreamPref, value: V, origin: SettingActionOrigin): V {
        return this.setSettingByGame(this.xboxTitleId, key, value, origin);
    }

    setSettingByGame<V = any>(id: number, key: StreamPref, value: V, origin: SettingActionOrigin): V {
        const gameSettings = this.getGameSettings(id);
        if (gameSettings) {
            BxLogger.info('setSettingByGame', id, key, value);
            return gameSettings.setSetting(key, value, origin);
        }

        BxLogger.info('setSettingByGame', id, key, value);
        return super.setSetting(key, value, origin);
    }

    deleteSettingByGame(id: number, key: StreamPref): boolean {
        const gameSettings = this.getGameSettings(id);
        if (gameSettings) {
            return gameSettings.deleteSetting(key);
        }

        return false;
    }

    hasGameSetting(id: number, key: StreamPref): boolean {
        const gameSettings = this.getGameSettings(id);
        return !!(gameSettings && gameSettings.hasSetting(key));
    }

    getControllerSetting(gamepadId: string): ControllerSetting {
        const controllerSettings = this.getSetting(StreamPref.CONTROLLER_SETTINGS);
        let controllerSetting = controllerSettings[gamepadId];
        if (!controllerSetting) {
            controllerSetting = {} as ControllerSetting;
        }

        // Set missing settings
        if (!controllerSetting.hasOwnProperty('shortcutPresetId')) {
            controllerSetting.shortcutPresetId = ControllerShortcutDefaultId.DEFAULT;
        }

        if (!controllerSetting.hasOwnProperty('customizationPresetId')) {
            controllerSetting.customizationPresetId = ControllerCustomizationDefaultPresetId.DEFAULT;
        }

        return controllerSetting;
    }
}
