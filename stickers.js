/* ==========================================================================
   SnapBooth Studio - Interactive Commercial Sticker Engine
   Sticker picker, category switcher, drag, rotate, scale, z-index & deletion
   ========================================================================== */

class StickerEngine {
    constructor() {
        this.gridContainer = document.getElementById('sticker-grid');
        this.dragLayer = document.getElementById('sticker-drag-layer');
        this.activeStickerElement = null;
        this.highestZIndex = 10;

        this.stickerLibrary = {
            cute: ['💖', '✨', '🎀', '⭐', '🌸', '🧸', '👑', '🕶️', '🍓', '🍒', '🍭', '🐱', '🍦', '🐣', '🦋', '💐', '💌', '🌷'],
            y2k: ['⚡', '🌈', '💿', '👽', '🔥', '👾', '📻', '🪩', '☮️', '🛸', '📼', '💫', '💥', '🚀', '🔮', '🎉', '🌟', '🎸'],
            stamps: ['🏷️ SMILE', '💌 LOVER', '⭐ VIP', '👑 CUTIE', '📸 SNAP', '🔥 HOT', '🌸 CUTEST', '💖 BESTIES']
        };

        this.currentCategory = 'cute';
        this.init();
    }

    init() {
        this.renderCategoryGrid('cute');
        this.bindCategoryTabs();
        this.bindGlobalClick();
    }

    bindCategoryTabs() {
        const catBtns = document.querySelectorAll('.sticker-cat-btn');
        catBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const cat = btn.dataset.cat || 'cute';
                this.renderCategoryGrid(cat);
            });
        });
    }

    renderCategoryGrid(cat) {
        this.currentCategory = cat;
        if (!this.gridContainer) {
            this.gridContainer = document.getElementById('sticker-grid');
        }
        if (!this.gridContainer) return;

        this.gridContainer.innerHTML = '';
        const stickers = this.stickerLibrary[cat] || [];

        stickers.forEach(symbol => {
            const item = document.createElement('div');
            item.className = 'sticker-item';
            item.textContent = symbol;
            item.addEventListener('click', () => this.addStickerToCanvas(symbol));
            this.gridContainer.appendChild(item);
        });
    }

    addStickerToCanvas(symbol) {
        if (!this.dragLayer) {
            this.dragLayer = document.getElementById('sticker-drag-layer');
        }
        if (!this.dragLayer) return;

        this.highestZIndex += 1;

        const sticker = document.createElement('div');
        sticker.className = 'draggable-sticker';
        sticker.style.zIndex = this.highestZIndex;
        sticker.dataset.rotation = 0;
        sticker.dataset.scale = 1;

        sticker.innerHTML = `
            <span class="sticker-content">${symbol}</span>
            <div class="sticker-controls-bar">
                <button class="sticker-btn btn-rotate" title="Rotate"><i class="fa-solid fa-rotate"></i></button>
                <button class="sticker-btn btn-scale-up" title="Enlarge"><i class="fa-solid fa-plus"></i></button>
                <button class="sticker-btn btn-scale-down" title="Shrink"><i class="fa-solid fa-minus"></i></button>
                <button class="sticker-btn btn-delete danger-text" title="Delete"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;

        const rect = this.dragLayer.getBoundingClientRect();
        const leftPos = rect.width > 0 ? (rect.width / 2) - 30 : 100;
        const topPos = rect.height > 0 ? (rect.height / 2) - 30 : 100;

        sticker.style.left = `${leftPos}px`;
        sticker.style.top = `${topPos}px`;

        this.makeDraggable(sticker);
        this.bindStickerControls(sticker);

        this.dragLayer.appendChild(sticker);
        this.setActiveSticker(sticker);

        if (window.toast) window.toast.info('Sticker added to canvas!');
    }

    bindStickerControls(sticker) {
        const btnRotate = sticker.querySelector('.btn-rotate');
        const btnScaleUp = sticker.querySelector('.btn-scale-up');
        const btnScaleDown = sticker.querySelector('.btn-scale-down');
        const btnDelete = sticker.querySelector('.btn-delete');

        if (btnRotate) {
            btnRotate.addEventListener('click', (e) => {
                e.stopPropagation();
                let currentRot = parseInt(sticker.dataset.rotation || '0', 10);
                currentRot = (currentRot + 45) % 360;
                sticker.dataset.rotation = currentRot;
                this.updateStickerTransform(sticker);
            });
        }

        if (btnScaleUp) {
            btnScaleUp.addEventListener('click', (e) => {
                e.stopPropagation();
                let currentScale = parseFloat(sticker.dataset.scale || '1');
                currentScale = Math.min(currentScale + 0.2, 2.5);
                sticker.dataset.scale = currentScale;
                this.updateStickerTransform(sticker);
            });
        }

        if (btnScaleDown) {
            btnScaleDown.addEventListener('click', (e) => {
                e.stopPropagation();
                let currentScale = parseFloat(sticker.dataset.scale || '1');
                currentScale = Math.max(currentScale - 0.2, 0.5);
                sticker.dataset.scale = currentScale;
                this.updateStickerTransform(sticker);
            });
        }

        if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                sticker.remove();
            });
        }
    }

    updateStickerTransform(el) {
        const rot = el.dataset.rotation || 0;
        const scale = el.dataset.scale || 1;
        const content = el.querySelector('.sticker-content');
        if (content) {
            content.style.transform = `rotate(${rot}deg) scale(${scale})`;
            content.style.display = 'inline-block';
        }
    }

    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onPointerDown = (e) => {
            if (e.target.closest('.sticker-controls-bar')) return;
            isDragging = true;
            this.highestZIndex += 1;
            el.style.zIndex = this.highestZIndex;
            this.setActiveSticker(el);

            startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

            initialLeft = parseInt(el.style.left, 10) || 0;
            initialTop = parseInt(el.style.top, 10) || 0;

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || startX;
            const currentY = e.clientY || (e.touches && e.touches[0].clientY) || startY;

            const dx = currentX - startX;
            const dy = currentY - startY;

            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const onPointerUp = () => {
            isDragging = false;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };

        el.addEventListener('pointerdown', onPointerDown);
    }

    setActiveSticker(el) {
        if (!this.dragLayer) return;
        const allStickers = this.dragLayer.querySelectorAll('.draggable-sticker');
        allStickers.forEach(s => s.classList.remove('active-sticker'));
        if (el) {
            el.classList.add('active-sticker');
            this.activeStickerElement = el;
        } else {
            this.activeStickerElement = null;
        }
    }

    bindGlobalClick() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.draggable-sticker') && !e.target.closest('.sticker-item')) {
                this.setActiveSticker(null);
            }
        });

        const clearBtn = document.getElementById('btn-clear-stickers');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.dragLayer) this.dragLayer.innerHTML = '';
            });
        }
    }
}

window.StickerEngine = StickerEngine;
window.StickerManager = StickerEngine;
