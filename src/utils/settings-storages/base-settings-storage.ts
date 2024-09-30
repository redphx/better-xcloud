import type { PrefKey } from "@/enums/pref-keys";
import type { NumberStepperParams, SettingDefinitions } from "@/types/setting-definition";
import { BxEvent } from "../bx-event";
import { SettingElementType } from "../setting-element";
import { t } from "../translation";
import { SCRIPT_VARIANT } from "../global";

export class BaseSettingsStore {
    private storage: Storage;
    private storageKey: string;
    private _settings: object | null;
    private definitions: SettingDefinitions;

    constructor(storageKey: string, definitions: SettingDefinitions) {
        this.storage = window.localStorage;
        this.storageKey = storageKey;

        let settingId: keyof typeof definitions
        for (settingId in definitions) {
            const setting = definitions[settingId];

            // Convert requiredVariants to array
            if (typeof setting.requiredVariants === 'string') {
                setting.requiredVariants = [setting.requiredVariants];
            }

            /*
            if (setting.migrate && settingId in savedPrefs) {
                setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
            }
            */

            setting.ready && setting.ready.call(this, setting);
        }
        this.definitions = definitions;

        this._settings = null;
    }

    get settings() {
        if (this._settings) {
            return this._settings;
        }

        const settings = JSON.parse(this.storage.getItem(this.storageKey) || '{}');
        this._settings = settings;

        return settings;
    }

    getDefinition(key: PrefKey) {
        if (!this.definitions[key]) {
            const error = 'Request invalid definition: ' + key;
            alert(error);
            throw Error(error);
        }

        return this.definitions[key];
    }

    getSetting(key: PrefKey, checkUnsupported = true) {
        if (typeof key === 'undefined') {
            debugger;
            return;
        }

        const definition = this.definitions[key];

        // Return default value if build variant is different
        if (definition.requiredVariants && !definition.requiredVariants.includes(SCRIPT_VARIANT)) {
            return definition.default;
        }

        // Return default value if the feature is not supported
        if (checkUnsupported && definition.unsupported) {
            return definition.default;
        }

        if (!(key in this.settings)) {
            this.settings[key] = this.validateValue(key, null);
        }

        return this.settings[key];
    }

    setSetting(key: PrefKey, value: any, emitEvent = false) {
        value = this.validateValue(key, value);

        this.settings[key] = value;
        this.saveSettings();

        emitEvent && BxEvent.dispatch(window, BxEvent.SETTINGS_CHANGED, {
            storageKey: this.storageKey,
            settingKey: key,
            settingValue: value,
        });

        return value;
    }

    saveSettings() {
        this.storage.setItem(this.storageKey, JSON.stringify(this.settings));
    }

    private validateValue(key: PrefKey, value: any) {
        const def = this.definitions[key];
        if (!def) {
            return value;
        }

        if (typeof value === 'undefined' || value === null) {
            value = def.default;
        }

        if ('min' in def) {
            value = Math.max(def.min!, value);
        }

        if ('max' in def) {
            value = Math.min(def.max!, value);
        }

        if ('options' in def && !(value in def.options!)) {
            value = def.default;
        } else if ('multipleOptions' in def) {
            if (value.length) {
                const validOptions = Object.keys(def.multipleOptions!);
                value.forEach((item: any, idx: number) => {
                    (validOptions.indexOf(item) === -1) && value.splice(idx, 1);
                });
            }

            if (!value.length) {
                value = def.default;
            }
        }

        return value;
    }

    getLabel(key: PrefKey): string {
        return this.definitions[key].label || key;
    }

    getValueText(key: PrefKey, value: any): string {
        const definition = this.definitions[key];
        if (definition.type === SettingElementType.NUMBER_STEPPER) {
            const params = (definition as any).params as NumberStepperParams;
            if (params.customTextValue) {
                const text = params.customTextValue(value);
                if (text) {
                    return text;
                }
            }

            return value.toString();
        } else if ('options' in definition) {
            const options = (definition as any).options;
            if (value in options) {
                return options[value];
            }
        } else if (typeof value === 'boolean') {
            return value ? t('on') : t('off')
        }

        return value.toString();
    }
}
