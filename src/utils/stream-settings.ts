import { PrefKey } from "@/enums/pref-keys";
import { ControllerSettingsTable } from "./local-db/controller-settings-table";
import { ControllerShortcutsTable } from "./local-db/controller-shortcuts-table";
import { getPref, setPref } from "./settings-storages/global-settings-storage";
import type { ControllerShortcutPresetRecord, KeyboardShortcutConvertedPresetData, MkbConvertedPresetData } from "@/types/presets";
import { STATES } from "./global";
import { DeviceVibrationMode } from "@/enums/pref-values";
import { VIRTUAL_GAMEPAD_ID } from "@/modules/mkb/mkb-handler";
import { hasGamepad } from "./gamepad";
import { MkbMappingPresetsTable } from "./local-db/mkb-mapping-presets-table";
import type { GamepadKey } from "@/enums/gamepad";
import { MkbPresetKey, MouseConstant } from "@/enums/mkb";
import { KeyboardShortcutDefaultId, KeyboardShortcutsTable } from "./local-db/keyboard-shortcuts-table";
import { ShortcutAction } from "@/enums/shortcut-actions";
import { KeyHelper } from "@/modules/mkb/key-helper";
import { EventBus } from "./event-bus";


export type StreamSettingsData = {
    settings: Partial<Record<PrefKey, any>>;
    xCloudPollingMode: 'none' | 'callbacks' | 'navigation' | 'all';

    deviceVibrationIntensity: DeviceVibrationIntensity;

    controllerPollingRate: ControllerPollingRate;
    controllers: {
        [gamepadId: string]: {
            vibrationIntensity: number;
            shortcuts: ControllerShortcutPresetRecord['data']['mapping'] | null;
        };
    };

    mkbPreset: MkbConvertedPresetData | null;

    keyboardShortcuts: KeyboardShortcutConvertedPresetData['mapping'] | null;
}

export class StreamSettings {
    static settings: StreamSettingsData = {
        settings: {},
        xCloudPollingMode: 'all',

        deviceVibrationIntensity: 0,

        controllerPollingRate: 4,
        controllers: {},

        mkbPreset: null,

        keyboardShortcuts: {},
    };

    static getPref<T=boolean>(key: PrefKey) {
        return getPref<T>(key);
    }

    static async refreshControllerSettings() {
        const settings = StreamSettings.settings;
        const controllers: StreamSettingsData['controllers'] = {};

        const settingsTable = ControllerSettingsTable.getInstance();
        const shortcutsTable = ControllerShortcutsTable.getInstance();

        const gamepads = window.navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (!gamepad?.connected) {
                continue;
            }

            // Ignore virtual controller
            if (gamepad.id === VIRTUAL_GAMEPAD_ID) {
                continue;
            }

            const settingsData = await settingsTable.getControllerData(gamepad.id);

            let shortcutsMapping;
            const preset = await shortcutsTable.getPreset(settingsData.shortcutPresetId);
            if (!preset) {
                shortcutsMapping = null;
            } else {
                shortcutsMapping = preset.data.mapping;
            }

            controllers[gamepad.id] = {
                vibrationIntensity: settingsData.vibrationIntensity,
                shortcuts: shortcutsMapping,
            }
        }
        settings.controllers = controllers;

        // Controller polling rate
        settings.controllerPollingRate = StreamSettings.getPref(PrefKey.CONTROLLER_POLLING_RATE);
        // Device vibration
        await StreamSettings.refreshDeviceVibration();
    }

    private static async refreshDeviceVibration() {
        if (!STATES.browser.capabilities.deviceVibration) {
            return;
        }

        const mode = StreamSettings.getPref<DeviceVibrationMode>(PrefKey.DEVICE_VIBRATION_MODE);
        let intensity = 0;  // Disable

        // Enable when no controllers are detected in Auto mode
        if (mode === DeviceVibrationMode.ON || (mode === DeviceVibrationMode.AUTO && !hasGamepad())) {
            // Set intensity
            intensity = StreamSettings.getPref<DeviceVibrationIntensity>(PrefKey.DEVICE_VIBRATION_INTENSITY) / 100;
        }

        StreamSettings.settings.deviceVibrationIntensity = intensity;
        EventBus.Script.emit('deviceVibrationUpdated', {});
    }

    static async refreshMkbSettings() {
        const settings = StreamSettings.settings;

        let presetId = StreamSettings.getPref<MkbPresetId>(PrefKey.MKB_P1_MAPPING_PRESET_ID);
        const orgPreset = (await MkbMappingPresetsTable.getInstance().getPreset(presetId))!;
        const orgPresetData = orgPreset.data;

        const converted: MkbConvertedPresetData = {
            mapping: {},
            mouse: Object.assign({}, orgPresetData.mouse),
        };

        let key: string;
        for (key in orgPresetData.mapping) {
            const buttonIndex = parseInt(key) as GamepadKey;
            if (!orgPresetData.mapping[buttonIndex]) {
                continue;
            }

            for (const keyName of orgPresetData.mapping[buttonIndex]) {
                if (typeof keyName === 'string') {
                    converted.mapping[keyName!] = buttonIndex;
                }
            }
        }

        // Pre-calculate mouse's sensitivities
        const mouse = converted.mouse;
        mouse[MkbPresetKey.MOUSE_SENSITIVITY_X] *= MouseConstant.DEFAULT_PANNING_SENSITIVITY;
        mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y] *= MouseConstant.DEFAULT_PANNING_SENSITIVITY;
        mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT] *= MouseConstant.DEFAULT_DEADZONE_COUNTERWEIGHT;

        settings.mkbPreset = converted;

        setPref(PrefKey.MKB_P1_MAPPING_PRESET_ID, orgPreset.id);
        EventBus.Script.emit('mkbSettingUpdated', {});
    }

    static async refreshKeyboardShortcuts() {
        const settings = StreamSettings.settings;

        let presetId = StreamSettings.getPref<KeyboardShortcutsPresetId>(PrefKey.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID);
        if (presetId === KeyboardShortcutDefaultId.OFF) {
            settings.keyboardShortcuts = null;

            setPref(PrefKey.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID, presetId);
            EventBus.Script.emit('keyboardShortcutsUpdated', {});
            return;
        }

        const orgPreset = (await KeyboardShortcutsTable.getInstance().getPreset(presetId))!;
        const orgPresetData = orgPreset.data.mapping;

        const converted: KeyboardShortcutConvertedPresetData['mapping'] = {};

        let action: keyof typeof orgPresetData;
        for (action in orgPresetData) {
            const info = orgPresetData[action]!;
            const key = `${info.code}:${info.modifiers || 0}`;

            converted[key] = action;
        }

        settings.keyboardShortcuts = converted;

        setPref(PrefKey.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID, orgPreset.id);
        EventBus.Script.emit('keyboardShortcutsUpdated', {});
    }

    static async refreshAllSettings() {
        window.BX_STREAM_SETTINGS = StreamSettings.settings;

        await StreamSettings.refreshControllerSettings();
        await StreamSettings.refreshMkbSettings();
        await StreamSettings.refreshKeyboardShortcuts();
    }

    static findKeyboardShortcut(targetAction: ShortcutAction) {
        const shortcuts = StreamSettings.settings.keyboardShortcuts
        for (const codeStr in shortcuts) {
            const action = shortcuts[codeStr];
            if (action === targetAction) {
                return KeyHelper.parseFullKeyCode(codeStr);
            }
        }

        return null;
    }

    static setup() {
        const listener = () => {
            StreamSettings.refreshControllerSettings();
        }

        window.addEventListener('gamepadconnected', listener);
        window.addEventListener('gamepaddisconnected', listener);

        StreamSettings.refreshAllSettings();
    }
}
