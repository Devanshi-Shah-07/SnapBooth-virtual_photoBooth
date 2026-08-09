/* ==========================================================================
   SnapBooth Studio - IndexedDB Storage Engine
   High-capacity client database for photobooth strips and sessions.
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

    async addPhoto(dataUrl) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const record = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                dataUrl: dataUrl,
                createdAt: new Date().toLocaleString(),
                timestamp: Date.now()
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(record);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getAllPhotos() {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('createdAt');
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result || [];
                // Sort newest first
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

    // Migrate legacy photos from localStorage if present
    async migrateFromLocalStorage() {
        try {
            const legacyData = localStorage.getItem('snapbooth_gallery');
            if (legacyData) {
                const parsed = JSON.parse(legacyData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    for (const item of parsed) {
                        const dataUrl = typeof item === 'string' ? item : item.dataUrl;
                        if (dataUrl) {
                            await this.addPhoto(dataUrl);
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
