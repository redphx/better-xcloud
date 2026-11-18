import { GlobalPref, StreamPref } from "@/enums/pref-keys";
import { ControllerShortcutsTable } from "./local-db/controller-shortcuts-table";
import type { ControllerCustomizationConvertedPresetData, ControllerCustomizationPresetData, ControllerShortcutPresetRecord, KeyboardShortcutConvertedPresetData, MkbConvertedPresetData } from "@/types/presets";
import { STATES } from "./global";
import { DeviceVibrationMode } from "@/enums/pref-values";
import { VIRTUAL_GAMEPAD_ID } from "@/modules/mkb/mkb-handler";
import { hasGamepad, toXcloudGamepadKey } from "./gamepad";
import { MkbMappingPresetsTable } from "./local-db/mkb-mapping-presets-table";
import { GamepadKey } from "@/enums/gamepad";
import { MkbPresetKey, MouseConstant } from "@/enums/mkb";
import { KeyboardShortcutDefaultId, KeyboardShortcutsTable } from "./local-db/keyboard-shortcuts-table";
import { ShortcutAction } from "@/enums/shortcut-actions";
import { KeyHelper } from "@/modules/mkb/key-helper";
import { BxEventBus } from "./bx-event-bus";
import { ControllerCustomizationsTable } from "./local-db/controller-customizations-table";
import { getStreamPref, STORAGE } from "@/utils/pref-utils";


export type StreamSettingsData = {
    settings: PartialRecord<GlobalPref, any>;
    xCloudPollingMode: 'none' | 'callbacks' | 'navigation' | 'all';

    deviceVibrationIntensity: number;

    controllerPollingRate: number;
    controllers: {
        [gamepadId: string]: {
            shortcuts: ControllerShortcutPresetRecord['data']['mapping'] | null;
            customization: ControllerCustomizationConvertedPresetData | null;
        };
    };
    gamepadSlots: Record<number, number>; // browserGamepadIndex -> playerSlot (0-3)

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
        gamepadSlots: {},

        mkbPreset: null,

        keyboardShortcuts: {},
    };

    static async refreshControllerSettings() {
        const settings = StreamSettings.settings;
        const controllers: StreamSettingsData['controllers'] = {};

        const shortcutsTable = ControllerShortcutsTable.getInstance();
        const mappingTable = ControllerCustomizationsTable.getInstance();

        const gamepads = window.navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (!gamepad?.connected) {
                continue;
            }

            // Ignore virtual controller
            if (gamepad.id === VIRTUAL_GAMEPAD_ID) {
                continue;
            }

            const controllerSetting = STORAGE.Stream.getControllerSetting(gamepad.id);

            // Shortcuts
            const shortcutsPreset = await shortcutsTable.getPreset(controllerSetting.shortcutPresetId);
            const shortcutsMapping = !shortcutsPreset ? null : shortcutsPreset.data.mapping;

            // Mapping
            const customizationPreset = await mappingTable.getPreset(controllerSetting.customizationPresetId);
            const customizationData = StreamSettings.convertControllerCustomization(customizationPreset?.data);

            controllers[gamepad.id] = {
                shortcuts: shortcutsMapping,
                customization: customizationData,
            }
        }
        settings.controllers = controllers;

        // Build gamepad slot mapping (browserGamepadIndex -> playerSlot)
        const gamepadSlots: Record<number, number> = {};
        for (const gamepad of gamepads) {
            if (!gamepad?.connected || gamepad.id === VIRTUAL_GAMEPAD_ID) {
                continue;
            }
            const slotSetting = STORAGE.Stream.getControllerSetting(gamepad.id);
            if (slotSetting.playerIndex >= 0) {
                gamepadSlots[gamepad.index] = slotSetting.playerIndex;
            }
        }
        settings.gamepadSlots = gamepadSlots;

        // Controller polling rate
        settings.controllerPollingRate = getStreamPref(StreamPref.CONTROLLER_POLLING_RATE);
        // Device vibration
        await StreamSettings.refreshDeviceVibration();
    }

    private static preCalculateControllerRange(obj: Record<string, [number, number]>, target: keyof XcloudGamepad, values: [number, number] | undefined) {
        if (values && Array.isArray(values)) {
            const [from, to] = values;
            if (from > 1 || to < 100) {
                obj[target] = [from / 100, to / 100];
            }
        }
    }

    private static convertControllerCustomization(customization: ControllerCustomizationPresetData | null | undefined) {
        if (!customization) {
            return null;
        }

        const converted = {
            mapping: {},
            ranges: {},
            vibrationIntensity: 1,
        } as ControllerCustomizationConvertedPresetData;

        // Swap GamepadKey.A with "A"
        let gamepadKey: unknown;
        for (gamepadKey in customization.mapping) {
            const gamepadStr = toXcloudGamepadKey(gamepadKey as GamepadKey);
            if (!gamepadStr) {
                continue;
            }

            const mappedKey = customization.mapping[gamepadKey as GamepadKey];
            if (typeof mappedKey === 'number') {
                converted.mapping[gamepadStr] = toXcloudGamepadKey(mappedKey as GamepadKey);
            } else {
                converted.mapping[gamepadStr] = false;
            }
        }

        // Pre-calculate ranges & deadzone
        StreamSettings.preCalculateControllerRange(converted.ranges, 'LeftTrigger', customization.settings.leftTriggerRange);
        StreamSettings.preCalculateControllerRange(converted.ranges, 'RightTrigger', customization.settings.rightTriggerRange);
        StreamSettings.preCalculateControllerRange(converted.ranges, 'LeftThumb', customization.settings.leftStickDeadzone);
        StreamSettings.preCalculateControllerRange(converted.ranges, 'RightThumb', customization.settings.rightStickDeadzone);

        // Pre-calculate virabtionIntensity
        converted.vibrationIntensity = customization.settings.vibrationIntensity / 100;

        return converted;
    }

    private static async refreshDeviceVibration() {
        if (!STATES.browser.capabilities.deviceVibration) {
            return;
        }

        const mode = getStreamPref(StreamPref.DEVICE_VIBRATION_MODE);
        let intensity = 0;  // Disable

        // Enable when no controllers are detected in Auto mode
        if (mode === DeviceVibrationMode.ON || (mode === DeviceVibrationMode.AUTO && !hasGamepad())) {
            // Set intensity
            intensity = getStreamPref(StreamPref.DEVICE_VIBRATION_INTENSITY) / 100;
        }

        StreamSettings.settings.deviceVibrationIntensity = intensity;
        BxEventBus.Stream.emit('deviceVibration.updated', {});
    }

    static async refreshMkbSettings() {
        const settings = StreamSettings.settings;

        let presetId = getStreamPref(StreamPref.MKB_P1_MAPPING_PRESET_ID);
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

        BxEventBus.Stream.emit('mkb.setting.updated', {});
    }

    static async refreshKeyboardShortcuts() {
        const settings = StreamSettings.settings;

        let presetId = getStreamPref(StreamPref.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID);
        if (presetId === KeyboardShortcutDefaultId.OFF) {
            settings.keyboardShortcuts = null;

            BxEventBus.Stream.emit('keyboardShortcuts.updated', {});
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

        BxEventBus.Stream.emit('keyboardShortcuts.updated', {});
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
