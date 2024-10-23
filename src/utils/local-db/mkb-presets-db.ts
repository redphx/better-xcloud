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

    private createTable(db: IDBDatabase) {
        const presets = db.createObjectStore(this.TABLE_PRESETS, {
            keyPath: 'id',
            autoIncrement: true,
        });
        presets.createIndex('name_idx', 'name');
    }

    protected onUpgradeNeeded(e: IDBVersionChangeEvent): void {
        const db = (e.target! as any).result as IDBDatabase;

        if (db.objectStoreNames.contains('undefined')) {
            db.deleteObjectStore('undefined');
        }

        if (!db.objectStoreNames.contains(this.TABLE_PRESETS)) {
            this.createTable(db);
        }
    }

    private async presetsTable() {
        await this.open();
        return await this.table(this.TABLE_PRESETS, 'readwrite');
    }

    async newPreset(name: string, data: any) {
        const table = await this.presetsTable();
        const [, id] = await this.add(table, { name, data });

        return id;
    }

    async updatePreset(preset: MkbStoredPreset) {
        const table = await this.presetsTable();
        const [, id] = await this.put(table, preset);

        return id;
    }

    async deletePreset(id: number) {
        const table = await this.presetsTable();
        await this.delete(table, id);

        return id;
    }

    async getPreset(id: number): Promise<MkbStoredPreset> {
        const table = await this.presetsTable();
        const [, preset] = await this.get(table, id);

        return preset;
    }

    async getPresets(): Promise<MkbStoredPresets> {
        const table = await this.presetsTable();
        const [, count] = await this.count(table);

        // Return stored presets
        if (count > 0) {
            const [, items] = await this.getAll(table);
            const presets: MkbStoredPresets = {};
            items.forEach((item: MkbStoredPreset) => (presets[item.id!] = item));

            return presets;
        }

        // Create "Default" preset when the table is empty
        const preset: MkbStoredPreset = {
            name: t('default'),
            data: MkbPreset.DEFAULT_PRESET,
        };

        const [, id] = await this.add(table, preset);

        preset.id = id;
        setPref(PrefKey.MKB_DEFAULT_PRESET_ID, id);

        return {
            [id]: preset,
        };
    }
}
