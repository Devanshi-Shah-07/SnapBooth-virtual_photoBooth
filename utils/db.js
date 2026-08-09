/* ==========================================================================
   SnapBooth Studio - High-Capacity IndexedDB Storage Engine
   Supports savePhotoStrip, getPhotoCount, getAllPhotos, deletePhoto, clearAll
   Replaces limited localStorage (~5MB) with virtually unlimited storage.
   ========================================================================== */

class GalleryDB {
    constructor() {
        this.dbName = 'SnapBoothGalleryDB';
        this.version = 1;
        this.storeName = 'photostrips';
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => {
                console.error('IndexedDB open error:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async init() {
        await this.open();
        await this.migrateFromLocalStorage();
        return true;
    }

    async savePhotoStrip(item) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const dataUrlVal = typeof item === 'string' ? item : (item.dataURL || item.dataUrl);

            const record = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                dataURL: dataUrlVal,
                dataUrl: dataUrlVal,
                type: item.type || 'strip',
                layout: item.layout || 'strip-4',
                createdAt: new Date().toLocaleString(),
                timestamp: item.timestamp || Date.now()
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(record);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async addPhoto(dataUrl) {
        return this.savePhotoStrip({ dataURL: dataUrl });
    }

    async getPhotoCount() {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result || 0);
            request.onerror = () => resolve(0);
        });
    }

    async getAllPhotos() {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result || [];
                // Standardize field names
                results.forEach(r => {
                    if (!r.dataURL && r.dataUrl) r.dataURL = r.dataUrl;
                });
                results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async deletePhoto(id) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async clearAll() {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async migrateFromLocalStorage() {
        try {
            const legacyData = localStorage.getItem('snapbooth_gallery');
            if (legacyData) {
                const parsed = JSON.parse(legacyData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    for (const item of parsed) {
                        const dataUrl = typeof item === 'string' ? item : (item.dataURL || item.dataUrl);
                        if (dataUrl) {
                            await this.savePhotoStrip(dataUrl);
                        }
                    }
                    localStorage.removeItem('snapbooth_gallery');
                    console.log('Migrated legacy localStorage gallery to IndexedDB successfully.');
                }
            }
        } catch (err) {
            console.warn('Migration warning:', err);
        }
    }
}

window.galleryDB = new GalleryDB();
