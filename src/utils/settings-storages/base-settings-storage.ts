import type { AnyPref, PrefTypeMap, StorageKey } from "@/enums/pref-keys";
import type { NumberStepperParams, SettingAction, SettingActionOrigin, SettingDefinition, SettingDefinitions } from "@/types/setting-definition";
import { t } from "../translation";
import { deepClone, SCRIPT_VARIANT } from "../global";
import { BxEventBus } from "../bx-event-bus";
import { isStreamPref } from "../pref-utils";
import { isPlainObject } from "../utils";

export class BaseSettingsStorage<T extends AnyPref> {
    private storage: Storage;
    private storageKey: StorageKey | StorageKey.STREAM | `${StorageKey.STREAM}.${number}`;
    private _settings: object | null;
    private definitions: SettingDefinitions<T>;

    constructor(storageKey: typeof this.storageKey, definitions:SettingDefinitions<T>) {
        this.storage = window.localStorage;
        this.storageKey = storageKey;

        for (const [_, setting] of Object.entries(definitions) as [T, SettingDefinition][]) {
            // Convert requiredVariants to array
            if (typeof setting.requiredVariants === 'string') {
                setting.requiredVariants = [setting.requiredVariants];
            }

            /*
            if (setting.migrate && settingId in savedPrefs) {
                setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
            }
            */

            if (setting.ready) {
                setting.ready.call(this, setting);
                delete setting.ready;
            }
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
            settings[key] = this.validateValue('get', key as T, settings[key]);
        }

        this._settings = settings;
        return settings;
    }

    getDefinition(key: T) {
        if (!this.definitions[key]) {
            alert('Request invalid definition: ' + key);
            return {} as SettingDefinition;
        }

        return this.definitions[key];
    }

    hasSetting(key: T): boolean {
        return key in this.settings;
    }

    getSetting<K extends keyof PrefTypeMap<K>>(key: K, checkUnsupported = true): PrefTypeMap<K>[K] {
        const definition = this.definitions[key] as SettingDefinition;

        // Return default value if build variant is different
        if (definition.requiredVariants && !definition.requiredVariants.includes(SCRIPT_VARIANT)) {
            return (isPlainObject(definition.default) ? deepClone(definition.default) : definition.default) as PrefTypeMap<K>[K];
        }

        // Return default value if the feature is not supported
        if (checkUnsupported && definition.unsupported) {
            if ('unsupportedValue' in definition) {
                return definition.unsupportedValue as PrefTypeMap<K>[K];
            } else {
                return (isPlainObject(definition.default) ? deepClone(definition.default) : definition.default) as PrefTypeMap<K>[K];
            }
        }

        if (!(key in this.settings)) {
            this.settings[key] = this.validateValue('get', key as any, null);
        }

        return (isPlainObject(this.settings[key]) ? deepClone(this.settings[key]) : this.settings[key]) as PrefTypeMap<K>[K];
    }

    setSetting<V=any>(key: T, value: V, origin: SettingActionOrigin) {
        value = this.validateValue('set', key, value);

        this.settings[key] = this.validateValue('get', key, value);
        this.saveSettings();

        if (origin === 'ui') {
            if (isStreamPref(key)) {
                BxEventBus.Stream.emit('setting.changed', {
                    storageKey: this.storageKey as any,
                    settingKey: key,
                });
            } else {
                BxEventBus.Script.emit('setting.changed', {
                    storageKey: this.storageKey,
                    settingKey: key,
                });
            }
        }

        return value;
    }

    saveSettings() {
        this.storage.setItem(this.storageKey, JSON.stringify(this.settings));
    }

    private validateValue(action: SettingAction, key: T, value: any) {
        const def = this.definitions[key] as SettingDefinition;
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
                const validOptions = new Set(Object.keys(def.multipleOptions!));
                value = value.filter((item: any) => validOptions.has(item));
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

    getLabel(key: T): string {
        return (this.definitions[key] as SettingDefinition).label || key;
    }

    getValueText(key: T, value: any): string {
        const definition = this.definitions[key] as SettingDefinition;
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

    deleteSetting(pref: T) {
        if (this.hasSetting(pref)) {
            delete this.settings[pref];
            this.saveSettings();

            return true;
        }

        return false;
    }
}
