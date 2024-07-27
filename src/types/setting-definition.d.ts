export type SettingDefinition = {
    default: any;
    optionsGroup?: string;
    options?: {[index: string]: string};
    multipleOptions?: {[index: string]: string};
    unsupported?: string | boolean;
    note?: string | HTMLElement;
    type?: SettingElementType;
    ready?: (setting: SettingDefinition) => void;
    // migrate?: (this: Preferences, savedPrefs: any, value: any) => void;
    min?: number;
    max?: number;
    steps?: number;
    experimental?: boolean;
    params?: any;
    label?: string;
};

export type SettingDefinitions = {[index in PrefKey]: SettingDefinition};
