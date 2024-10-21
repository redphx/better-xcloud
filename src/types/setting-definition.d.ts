import type { PrefKey } from "@/enums/pref-keys";
import type { SettingElementType } from "@/utils/setting-element";

export type SuggestedSettingCategory = 'recommended' | 'lowest' | 'highest' | 'default';
export type RecommendedSettings = {
    schema_version: 1,
    device_name: string,
    device_type: 'android' | 'android-tv' | 'android-handheld' | 'webos',
    settings: {
        app: any,
        script: {
            _base?: 'lowest' | 'highest',
        } & PartialRecord<PrefKey, any>,
    },
};

export type SettingDefinition = {
    default: any;
} & Partial<{
    label: string;
    note: string | (() => HTMLElement);
    experimental: boolean;
    unsupported: boolean;
    unsupportedNote: string | (() => HTMLElement);
    suggest: PartialRecord<SuggestedSettingCategory, any>,
    ready: (setting: SettingDefinition) => void;
    type: SettingElementType,
    requiredVariants: BuildVariant | Array<BuildVariant>;
    // migrate?: (this: Preferences, savedPrefs: any, value: any) => void;
}> & (
    {} | {
        options: {[index: string]: string};
        optionsGroup?: string;
    } | {
        multipleOptions: {[index: string]: string};
        params: MultipleOptionsParams;
    } | {
        type: SettingElementType.NUMBER_STEPPER;
        min: number;
        max: number;
        params: NumberStepperParams;

        steps?: number;
    }
);

export type SettingDefinitions = {[index in PrefKey]: SettingDefinition};

export type MultipleOptionsParams = Partial<{
    size?: number;
}>

export type NumberStepperParams = Partial<{
    suffix: string;
    disabled: boolean;
    hideSlider: boolean;

    ticks: number;
    exactTicks: number;

    customTextValue: (value: any) => string | null;
}>
