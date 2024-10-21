import { PrefKey } from "@/enums/pref-keys";
import { MkbPreset } from "@/modules/mkb/mkb-preset";
import type { MkbStoredPreset, MkbStoredPresets } from "@/types/mkb";
import { setPref } from "../settings-storages/global-settings-storage";
import { t } from "../translation";
import { LocalDb } from "./local-db";
import { BxLogger } from "../bx-logger";

export class MkbPresetsDb extends LocalDb {
    private static instance: MkbPresetsDb;
    public static getInstance = () => MkbPresetsDb.instance ?? (MkbPresetsDb.instance = new MkbPresetsDb());
    private readonly LOG_TAG = 'MkbPresetsDb';

    private readonly TABLE_PRESETS = 'mkb_presets';

    private constructor() {
        super();
        BxLogger.info(this.LOG_TAG, 'constructor()');
    }

    protected onUpgradeNeeded(e: IDBVersionChangeEvent): void {
        const db = (e.target! as any).result;
        switch (e.oldVersion) {
            case 0: {
                const presets = db.createObjectStore(this.TABLE_PRESETS, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                presets.createIndex('name_idx', 'name');
                break;
            }
        }
    }

    private presetsTable() {
        return this.open()
            .then(() => this.table(this.TABLE_PRESETS, 'readwrite'))
    }

    newPreset(name: string, data: any) {
        return this.presetsTable()
            .then(table => this.add(table, {name, data}))
            .then(([table, id]) => new Promise<number>(resolve => resolve(id)));
    }

    updatePreset(preset: MkbStoredPreset) {
        return this.presetsTable()
            .then(table => this.put(table, preset))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    deletePreset(id: number) {
        return this.presetsTable()
            .then(table => this.delete(table, id))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    getPreset(id: number): Promise<MkbStoredPreset> {
        return this.presetsTable()
            .then(table => this.get(table, id))
            .then(([table, preset]) => new Promise(resolve => resolve(preset)));
    }

    getPresets(): Promise<MkbStoredPresets> {
        return this.presetsTable()
            .then(table => this.count(table))
            .then(([table, count]) => {
                if (count > 0) {
                    return new Promise(resolve => {
                        this.getAll(table)
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
                    this.add(table, preset)
                        .then(([table, id]) => {
                            preset.id = id;
                            setPref(PrefKey.MKB_DEFAULT_PRESET_ID, id);

                            resolve({[id]: preset});
                        });
                });
            });
    }
}
