export type SettingDefinition = {
    default: any;
} & Partial<{
    label: string;
    note: string | HTMLElement;
    experimental: boolean;
    unsupported: string | boolean;
    ready: (setting: SettingDefinition) => void;
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
