import { MkbPreset } from "../modules/mkb/mkb-preset";
import { PrefKey, setPref } from "../modules/preferences";
import { t } from "../modules/translation";
import type { MkbStoredPreset, MkbStoredPresets } from "../types/mkb";

export class LocalDb {
    static #instance: LocalDb;
    static get INSTANCE() {
        if (!LocalDb.#instance) {
            LocalDb.#instance = new LocalDb();
        }

        return LocalDb.#instance;
    }

    static readonly DB_NAME = 'BetterXcloud';
    static readonly DB_VERSION = 1;
    static readonly TABLE_PRESETS = 'mkb_presets';

    #DB: any;

    #open() {
        return new Promise<void>((resolve, reject) => {
            if (this.#DB) {
                resolve();
                return;
            }

            const request = window.indexedDB.open(LocalDb.DB_NAME, LocalDb.DB_VERSION);
            request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target! as any).result;

                switch (e.oldVersion) {
                    case 0: {
                        const presets = db.createObjectStore(LocalDb.TABLE_PRESETS, {keyPath: 'id', autoIncrement: true});
                        presets.createIndex('name_idx', 'name');
                        break;
                    }
                }
            };

            request.onerror = e => {
                console.log(e);
                alert((e.target as any).error.message);
                reject && reject();
            };

            request.onsuccess = e => {
                this.#DB = (e.target as any).result;
                resolve();
            };
        });
    }

    #table(name: string, type: string): Promise<IDBObjectStore> {
        const transaction = this.#DB.transaction(name, type || 'readonly');
        const table = transaction.objectStore(name);

        return new Promise(resolve => resolve(table));
    }

    // Convert IndexDB method to Promise
    #call(method: any) {
        const table = arguments[1];
        return new Promise(resolve => {
            const request = method.call(table, ...Array.from(arguments).slice(2));
            request.onsuccess = (e: Event) => {
                resolve([table, (e.target as any).result]);
            };
        });
    }

    #count(table: IDBObjectStore): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.#call(table.count, ...arguments);
    }

    #add(table: IDBObjectStore, data: any): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.#call(table.add, ...arguments);
    }

    #put(table: IDBObjectStore, data: any): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.#call(table.put, ...arguments);
    }

    #delete(table: IDBObjectStore, data: any): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.#call(table.delete, ...arguments);
    }

    #get(table: IDBObjectStore, id: number): Promise<any> {
        // @ts-ignore
        return this.#call(table.get, ...arguments);
    }

    #getAll(table: IDBObjectStore): Promise<[IDBObjectStore, any]> {
        // @ts-ignore
        return this.#call(table.getAll, ...arguments);
    }

    newPreset(name: string, data: any) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#add(table, {name, data}))
            .then(([table, id]) => new Promise<number>(resolve => resolve(id)));
    }

    updatePreset(preset: MkbStoredPreset) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#put(table, preset))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    deletePreset(id: number) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#delete(table, id))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    getPreset(id: number): Promise<MkbStoredPreset> {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#get(table, id))
            .then(([table, preset]) => new Promise(resolve => resolve(preset)));
    }

    getPresets(): Promise<MkbStoredPresets> {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#count(table))
            .then(([table, count]) => {
                if (count > 0) {
                    return new Promise(resolve => {
                        this.#getAll(table)
                            .then(([table, items]) => {
                                const presets: MkbStoredPresets = {};
                                items.forEach((item: MkbStoredPreset) => (presets[item.id!] = item));
                                resolve(presets);
                            });
                    });
                }

                // Create "Default" preset when the table is empty
                const preset: MkbStoredPreset = {
                    name: t('default'),
                    data: MkbPreset.DEFAULT_PRESET,
                }

                return new Promise<MkbStoredPresets>(resolve => {
                    this.#add(table, preset)
                        .then(([table, id]) => {
                            preset.id = id;
                            setPref(PrefKey.MKB_DEFAULT_PRESET_ID, id);

                            resolve({[id]: preset});
                        });
                });
            });
    }
}
