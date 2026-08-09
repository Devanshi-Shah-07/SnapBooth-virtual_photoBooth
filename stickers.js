/* ==========================================================================
   SnapBooth Studio - Interactive Sticker Engine
   Sticker picker, category switcher, drag-and-drop layer, scaling & deletion
   ========================================================================== */

class StickerEngine {
    constructor() {
        this.gridContainer = document.getElementById('sticker-grid');
        this.dragLayer = document.getElementById('sticker-drag-layer');
        this.activeStickerElement = null;

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
            btn.addEventListener('click', (e) => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const cat = btn.dataset.cat;
                this.renderCategoryGrid(cat);
            });
        });
    }

    renderCategoryGrid(cat) {
        this.currentCategory = cat;
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
        const sticker = document.createElement('div');
        sticker.className = 'draggable-sticker';
        sticker.innerHTML = `
            <span class="sticker-content">${symbol}</span>
            <div class="sticker-delete-btn"><i class="fa-solid fa-xmark"></i></div>
        `;

        // Position initial sticker in middle of canvas layer
        const rect = this.dragLayer.getBoundingClientRect();
        sticker.style.left = `${(rect.width / 2) - 25}px`;
        sticker.style.top = `${(rect.height / 2) - 25}px`;

        this.makeDraggable(sticker);
        this.dragLayer.appendChild(sticker);
        this.setActiveSticker(sticker);

        // Delete button listener
        const deleteBtn = sticker.querySelector('.sticker-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sticker.remove();
        });
    }

    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onPointerDown = (e) => {
            isDragging = true;
            this.setActiveSticker(el);

            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;

            initialLeft = parseInt(el.style.left, 10) || 0;
            initialTop = parseInt(el.style.top, 10) || 0;

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;
            const currentX = e.clientX || (e.touches && e.touches[0].clientX);
            const currentY = e.clientY || (e.touches && e.touches[0].clientY);

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
                this.dragLayer.innerHTML = '';
            });
        }
    }
}

window.StickerEngine = StickerEngine;
