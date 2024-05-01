import { t } from "@utils/translation";
import { SettingElementType } from "@utils/settings";
import { GamepadKey, MouseButtonCode, MouseMapTo, MkbPresetKey } from "./definitions";
import { MkbHandler } from "./mkb-handler";
import type { MkbPresetData, MkbConvertedPresetData } from "@/types/mkb";
import type { PreferenceSettings } from "@/types/preferences";


export class MkbPreset {
    static MOUSE_SETTINGS: PreferenceSettings = {
        [MkbPresetKey.MOUSE_MAP_TO]: {
            label: t('map-mouse-to'),
            type: SettingElementType.OPTIONS,
            default: MouseMapTo[MouseMapTo.RS],
            options: {
                [MouseMapTo[MouseMapTo.RS]]: t('right-stick'),
                [MouseMapTo[MouseMapTo.LS]]: t('left-stick'),
                [MouseMapTo[MouseMapTo.OFF]]: t('off'),
            },
        },

        [MkbPresetKey.MOUSE_SENSITIVITY_Y]: {
            label: t('horizontal-sensitivity'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 50,
            min: 1,
            max: 200,

            params: {
                suffix: '%',
                exactTicks: 20,
            },
        },

        [MkbPresetKey.MOUSE_SENSITIVITY_X]: {
            label: t('vertical-sensitivity'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 50,
            min: 1,
            max: 200,

            params: {
                suffix: '%',
                exactTicks: 20,
            },
        },

        [MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT]: {
            label: t('deadzone-counterweight'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 20,
            min: 1,
            max: 100,

            params: {
                suffix: '%',
                exactTicks: 10,
            },
        },

        [MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH]: {
            label: t('stick-decay-strength'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 100,
            min: 10,
            max: 100,

            params: {
                suffix: '%',
                exactTicks: 10,
            },
        },

        [MkbPresetKey.MOUSE_STICK_DECAY_MIN]: {
            label: t('stick-decay-minimum'),
            type: SettingElementType.NUMBER_STEPPER,
            default: 10,
            min: 1,
            max: 10,

            params: {
                suffix: '%',
            },
        },
    };

    static DEFAULT_PRESET: MkbPresetData = {
        'mapping': {
            // Use "e.code" value from https://keyjs.dev
            [GamepadKey.UP]: ['ArrowUp'],
            [GamepadKey.DOWN]: ['ArrowDown'],
            [GamepadKey.LEFT]: ['ArrowLeft'],
            [GamepadKey.RIGHT]: ['ArrowRight'],

            [GamepadKey.LS_UP]: ['KeyW'],
            [GamepadKey.LS_DOWN]: ['KeyS'],
            [GamepadKey.LS_LEFT]: ['KeyA'],
            [GamepadKey.LS_RIGHT]: ['KeyD'],

            [GamepadKey.RS_UP]: ['KeyI'],
            [GamepadKey.RS_DOWN]: ['KeyK'],
            [GamepadKey.RS_LEFT]: ['KeyJ'],
            [GamepadKey.RS_RIGHT]: ['KeyL'],

            [GamepadKey.A]: ['Space', 'KeyE'],
            [GamepadKey.X]: ['KeyR'],
            [GamepadKey.B]: ['ControlLeft', 'Backspace'],
            [GamepadKey.Y]: ['KeyV'],

            [GamepadKey.START]: ['Enter'],
            [GamepadKey.SELECT]: ['Tab'],

            [GamepadKey.LB]: ['KeyC', 'KeyG'],
            [GamepadKey.RB]: ['KeyQ'],

            [GamepadKey.HOME]: ['Backquote'],

            [GamepadKey.RT]: [MouseButtonCode.LEFT_CLICK],
            [GamepadKey.LT]: [MouseButtonCode.RIGHT_CLICK],

            [GamepadKey.L3]: ['ShiftLeft'],
            [GamepadKey.R3]: ['KeyF'],
        },

        'mouse': {
            [MkbPresetKey.MOUSE_MAP_TO]: MouseMapTo[MouseMapTo.RS],
            [MkbPresetKey.MOUSE_SENSITIVITY_X]: 50,
            [MkbPresetKey.MOUSE_SENSITIVITY_Y]: 50,
            [MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT]: 20,
            [MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH]: 18,
            [MkbPresetKey.MOUSE_STICK_DECAY_MIN]: 6,
        },
    };

    static convert(preset: MkbPresetData): MkbConvertedPresetData {
        const obj: MkbConvertedPresetData = {
            mapping: {},
            mouse: Object.assign({}, preset.mouse),
        };

        for (const buttonIndex in preset.mapping) {
            for (const keyName of preset.mapping[parseInt(buttonIndex)]) {
                obj.mapping[keyName!] = parseInt(buttonIndex);
            }
        }

        // Pre-calculate mouse's sensitivities
        const mouse = obj.mouse;
        mouse[MkbPresetKey.MOUSE_SENSITIVITY_X] *= MkbHandler.DEFAULT_PANNING_SENSITIVITY;
        mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y] *= MkbHandler.DEFAULT_PANNING_SENSITIVITY;
        mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT] *= MkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
        mouse[MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH] *= 0.01;
        mouse[MkbPresetKey.MOUSE_STICK_DECAY_MIN] *= 0.01;

        const mouseMapTo = MouseMapTo[mouse[MkbPresetKey.MOUSE_MAP_TO]!];
        if (typeof mouseMapTo !== 'undefined') {
            mouse[MkbPresetKey.MOUSE_MAP_TO] = mouseMapTo;
        } else {
            mouse[MkbPresetKey.MOUSE_MAP_TO] = MkbPreset.MOUSE_SETTINGS[MkbPresetKey.MOUSE_MAP_TO].default;
        }

        console.log(obj);
        return obj;
    }
}
