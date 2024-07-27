import type { PrefKey } from "@/enums/pref-keys";
import type { SettingDefinitions } from "@/types/setting-definition";
import { BxEvent } from "../bx-event";

export class BaseSettingsStore {
    private storage: Storage;
    private storageKey: string;
    private _settings: object | null;
    private definitions: SettingDefinitions;

    constructor(storageKey: string, definitions: SettingDefinitions) {
        this.storage = window.localStorage;
        this.storageKey = storageKey;

        for (const settingId in definitions) {
            const setting = definitions[settingId];

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

    getSetting(key: PrefKey) {
        if (typeof key === 'undefined') {
            debugger;
            return;
        }

        // Return default value if the feature is not supported
        if (this.definitions[key].unsupported) {
            return this.definitions[key].default;
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
}
