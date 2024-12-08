import type { PrefKey, StorageKey } from "@/enums/pref-keys";
import type { NumberStepperParams, SettingAction, SettingDefinitions } from "@/types/setting-definition";
import { t } from "../translation";
import { SCRIPT_VARIANT } from "../global";
import { EventBus } from "../event-bus";

export class BaseSettingsStore {
    private storage: Storage;
    private storageKey: StorageKey;
    private _settings: object | null;
    private definitions: SettingDefinitions;

    constructor(storageKey: StorageKey, definitions: SettingDefinitions) {
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

        // Validate setting values
        for (const key in settings) {
            settings[key] = this.validateValue('get', key as PrefKey, settings[key]);
        }

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

    getSetting<T=boolean>(key: PrefKey, checkUnsupported = true): T {
        const definition = this.definitions[key];

        // Return default value if build variant is different
        if (definition.requiredVariants && !definition.requiredVariants.includes(SCRIPT_VARIANT)) {
            return definition.default as T;
        }

        // Return default value if the feature is not supported
        if (checkUnsupported && definition.unsupported) {
            if ('unsupportedValue' in definition) {
                return definition.unsupportedValue as T;
            } else {
                return definition.default as T;
            }
        }

        if (!(key in this.settings)) {
            this.settings[key] = this.validateValue('get', key, null);
        }

        return this.settings[key] as T;
    }

    setSetting<T=any>(key: PrefKey, value: T, emitEvent = false) {
        value = this.validateValue('set', key, value);

        this.settings[key] = this.validateValue('get', key, value);
        this.saveSettings();

        emitEvent && EventBus.Script.emit('settingChanged', {
            storageKey: this.storageKey,
            settingKey: key,
            settingValue: value,
        });

        return value;
    }

    saveSettings() {
        this.storage.setItem(this.storageKey, JSON.stringify(this.settings));
    }

    private validateValue(action: SettingAction, key: PrefKey, value: any) {
        const def = this.definitions[key];
        if (!def) {
            return value;
        }

        if (typeof value === 'undefined' || value === null) {
            value = def.default;
        }

        // Transform value before validating
        if (def.transformValue && action === 'get') {
            value = def.transformValue.get.call(def, value);
        }

        if ('min' in def) {
            value = Math.max(def.min!, value);
        }

        if ('max' in def) {
            value = Math.min(def.max!, value);
        }

        if ('options' in def) {
            if (!(value in def.options)) {
                value = def.default;
            }
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

        // Transform value before setting
        if (def.transformValue && action === 'set') {
            value = def.transformValue.set.call(def, value);
        }

        return value;
    }

    getLabel(key: PrefKey): string {
        return this.definitions[key].label || key;
    }

    getValueText(key: PrefKey, value: any): string {
        const definition = this.definitions[key];
        if ('min' in definition) {
            const params = (definition as any).params as NumberStepperParams;
            if (params.customTextValue) {
                if (definition.transformValue) {
                    value = definition.transformValue.get.call(definition, value);
                }
                const text = params.customTextValue(value, definition.min, definition.max);
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
