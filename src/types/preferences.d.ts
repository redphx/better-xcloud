export type PreferenceSetting = {
    default: any;
    optionsGroup?: string;
    options?: {[index: string]: string};
    multipleOptions?: {[index: string]: string};
    unsupported?: boolean;
    unsupported_note?: string | HTMLElement;
    note?: string | HTMLElement;
    type?: SettingElementType;
    ready?: (setting: PreferenceSetting) => void;
    migrate?: (this: Preferences, savedPrefs: any, value: any) => void;
    min?: number;
    max?: number;
    steps?: number;
    experimental?: boolean;
    params?: any;
    label?: string;
};

export type PreferenceSettings = {[index in PrefKey]: PreferenceSetting};
