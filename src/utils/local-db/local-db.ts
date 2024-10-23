export abstract class LocalDb {
    static readonly DB_NAME = 'BetterXcloud';
    static readonly DB_VERSION = 1;

    private db: any;

    protected open() {
        return new Promise<void>((resolve, reject) => {
            if (this.db) {
                resolve();
                return;
            }

            const request = window.indexedDB.open(LocalDb.DB_NAME, LocalDb.DB_VERSION);
            request.onupgradeneeded = this.onUpgradeNeeded.bind(this);

            request.onerror = e => {
                console.log(e);
                alert((e.target as any).error.message);
                reject && reject();
            };

            request.onsuccess = e => {
                this.db = (e.target as any).result;
                resolve();
            };
        });
    }

    protected abstract onUpgradeNeeded(e: IDBVersionChangeEvent): void;

    protected table(name: string, type: string): Promise<IDBObjectStore> {
        const transaction = this.db.transaction(name, type || 'readonly');
        const table = transaction.objectStore(name);

        return new Promise(resolve => resolve(table));
    }

    // Convert IndexDB method to Promise
    protected call(method: any) {
        const table = arguments[1];
        return new Promise(resolve => {
            const request = method.call(table, ...Array.from(arguments).slice(2));
            request.onsuccess = (e: Event) => {
                resolve([table, (e.target as any).result]);
            };
        });
    }

    protected count(table: IDBObjectStore): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.call(table.count, ...arguments);
    }

    protected add(table: IDBObjectStore, data: any): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.call(table.add, ...arguments);
    }

    protected put(table: IDBObjectStore, data: any): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.call(table.put, ...arguments);
    }

    protected delete(table: IDBObjectStore, data: any): Promise<[IDBObjectStore, number]> {
        // @ts-ignore
        return this.call(table.delete, ...arguments);
    }

    protected get(table: IDBObjectStore, id: number): Promise<any> {
        // @ts-ignore
        return this.call(table.get, ...arguments);
    }

    protected getAll(table: IDBObjectStore): Promise<[IDBObjectStore, any]> {
        // @ts-ignore
        return this.call(table.getAll, ...arguments);
    }
}
