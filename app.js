/* ==========================================================================
   SnapBooth Studio - Main Application Controller
   Connects camera stream, camera power switch, individual photo deletion, 
   canvas rendering, customization tabs, export & gallery
   NOW WITH localStorage persistence for gallery images
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Engines
    const cameraEngine = new CameraEngine();
    const canvasBuilder = new PhotoboothCanvasBuilder('photobooth-canvas');
    const stickerEngine = new StickerEngine();

    // Session State
    let capturedShots = [];
    const GALLERY_STORAGE_KEY = 'snapbooth_gallery';

    // Load persisted gallery from localStorage
    const loadGalleryFromStorage = () => {
        try {
            const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load gallery from localStorage:', e);
        }
        return [];
    };

    const saveGalleryToStorage = (gallery) => {
        try {
            localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
        } catch (e) {
            console.warn('Failed to save gallery to localStorage (quota may be exceeded):', e);
            // If quota exceeded, show a user-friendly message
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                alert('Storage is full! Please delete some saved photos from the gallery to free up space.');
            }
        }
    };

    // Initialize gallery from storage
    let sessionGallery = loadGalleryFromStorage();

    // UI Element References
    const btnToggleCameraPower = document.getElementById('btn-toggle-camera-power');
    const btnEnableCam = document.getElementById('btn-enable-cam');
    const btnRequestCamera = document.getElementById('btn-request-camera');
    const btnVirtualDemo = document.getElementById('btn-virtual-demo');
    const btnStartCapture = document.getElementById('btn-start-capture');
    const btnRetakeAll = document.getElementById('btn-retake-all');
    const btnSwitchCamera = document.getElementById('btn-switch-camera');
    const fileUploadInput = document.getElementById('file-upload-input');
    const timerDelaySelect = document.getElementById('timer-delay-select');

    const shotsTray = document.getElementById('shots-tray');
    const shotsCountText = document.getElementById('shots-count-text');

    const btnDownloadPng = document.getElementById('btn-download-png');
    const btnDownloadGif = document.getElementById('btn-download-gif');
    const btnCopyClipboard = document.getElementById('btn-copy-clipboard');

    const galleryModal = document.getElementById('gallery-modal');
    const btnSessionGallery = document.getElementById('btn-session-gallery');
    const btnCloseGallery = document.getElementById('btn-close-gallery');
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryEmpty = document.getElementById('gallery-empty');
    const galleryCountBadge = document.getElementById('gallery-count-badge');

    // Update gallery count badge on load
    if (galleryCountBadge) {
        galleryCountBadge.textContent = sessionGallery.length;
    }

    // 2. Camera Power Switch & Controls
    if (btnToggleCameraPower) {
        btnToggleCameraPower.addEventListener('click', () => {
            cameraEngine.toggleCameraPower();
        });
    }

    if (btnEnableCam) {
        btnEnableCam.addEventListener('click', () => {
            cameraEngine.toggleCameraPower();
        });
    }

    if (btnRequestCamera) {
        btnRequestCamera.addEventListener('click', () => {
            cameraEngine.initCamera();
        });
    }

    if (btnVirtualDemo) {
        btnVirtualDemo.addEventListener('click', () => {
            cameraEngine.startVirtualDemoFeed();
        });
    }

    if (btnSwitchCamera) {
        btnSwitchCamera.addEventListener('click', () => {
            cameraEngine.switchCamera();
        });
    }

    // Handle File Upload Fallback
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            capturedShots = [];
            let loadedCount = 0;

            files.forEach(file => {
                const img = new Image();
                img.onload = () => {
                    capturedShots.push(img);
                    loadedCount++;
                    if (loadedCount === files.length) {
                        canvasBuilder.setShots(capturedShots);
                        renderShotsTray();
                    }
                };
                img.src = URL.createObjectURL(file);
            });
        });
    }

    // Render Shot Manager Tray Thumbnails with Delete Buttons
    const renderShotsTray = () => {
        if (!shotsTray) return;

        if (capturedShots.length === 0) {
            shotsTray.innerHTML = '<p class="empty-tray-text">No shots captured yet. Press "TAKE PHOTOS" to start!</p>';
            if (shotsCountText) shotsCountText.textContent = '0 photos taken';
            return;
        }

        if (shotsCountText) shotsCountText.textContent = `${capturedShots.length} photos taken`;
        shotsTray.innerHTML = '';

        capturedShots.forEach((shotCanvas, index) => {
            const thumbItem = document.createElement('div');
            thumbItem.className = 'shot-thumb-item';

            // Get Data URL of canvas or image
            let src = '';
            if (shotCanvas instanceof HTMLCanvasElement) {
                src = shotCanvas.toDataURL('image/png');
            } else if (shotCanvas instanceof HTMLImageElement) {
                src = shotCanvas.src;
            }

            thumbItem.innerHTML = `
                <img src="${src}" alt="Shot ${index + 1}">
                <span class="shot-badge">#${index + 1}</span>
                <button class="shot-delete-btn" title="Delete Shot #${index + 1}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            // Delete individual photo event
            const deleteBtn = thumbItem.querySelector('.shot-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteIndividualShot(index);
            });

            shotsTray.appendChild(thumbItem);
        });
    };

    // Delete single photo at specific index
    const deleteIndividualShot = (index) => {
        if (index >= 0 && index < capturedShots.length) {
            capturedShots.splice(index, 1);
            canvasBuilder.setShots(capturedShots);
            renderShotsTray();
        }
    };

    // 3. Filter Selector
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            cameraEngine.setFilter(filter);
        });
    });

    // 4. Capture Button Trigger
    if (btnStartCapture) {
        btnStartCapture.addEventListener('click', () => {
            if (cameraEngine.isCapturing) return;

            let requiredShots = 4;
            switch (canvasBuilder.layout) {
                case 'strip-2': requiredShots = 2; break;
                case 'strip-3': requiredShots = 3; break;
                case 'grid-3x2': requiredShots = 6; break;
                case 'polaroid': requiredShots = 1; break;
                case 'strip-4':
                case 'grid-2x2':
                case 'film-roll':
                default: requiredShots = 4; break;
            }

            const delaySec = parseInt(timerDelaySelect.value, 10) || 3;
            capturedShots = [];

            cameraEngine.startBurstSequence(
                requiredShots,
                delaySec,
                (shotCanvas, shotIdx) => {
                    capturedShots[shotIdx] = shotCanvas;
                    canvasBuilder.setShots([...capturedShots]);
                    renderShotsTray();
                },
                (allShots) => {
                    capturedShots = allShots;
                    canvasBuilder.setShots(capturedShots);
                    renderShotsTray();
                    
                    if (window.confetti) {
                        window.confetti({
                            particleCount: 70,
                            spread: 80,
                            origin: { y: 0.7 }
                        });
                    }
                }
            );
        });
    }

    // Reset / Retake All Button
    if (btnRetakeAll) {
        btnRetakeAll.addEventListener('click', () => {
            capturedShots = [];
            canvasBuilder.setShots([]);
            renderShotsTray();
        });
    }

    // 5. Customization Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Layout Selector Cards
    const layoutCards = document.querySelectorAll('.layout-card');
    layoutCards.forEach(card => {
        card.addEventListener('click', () => {
            layoutCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const layout = card.dataset.layout;
            canvasBuilder.setLayout(layout);
        });
    });

    // Border Style Chips
    const borderChips = document.querySelectorAll('.border-style-chip');
    borderChips.forEach(chip => {
        chip.addEventListener('click', () => {
            borderChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const borderStyle = chip.dataset.border;
            canvasBuilder.setBorderStyle(borderStyle);
        });
    });

    // Frame Swatches & Sliders
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const framePaddingInput = document.getElementById('frame-padding');
    const frameCornerInput = document.getElementById('frame-corner');

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const color = swatch.dataset.color;
            canvasBuilder.setFrameStyle(color, framePaddingInput.value, frameCornerInput.value);
        });
    });

    const updateFrameStyle = () => {
        const activeSwatch = document.querySelector('.color-swatch.active');
        const color = activeSwatch ? activeSwatch.dataset.color : '#FFFFFF';
        canvasBuilder.setFrameStyle(color, framePaddingInput.value, frameCornerInput.value);
    };

    if (framePaddingInput) framePaddingInput.addEventListener('input', updateFrameStyle);
    if (frameCornerInput) frameCornerInput.addEventListener('input', updateFrameStyle);

    // Text & Date Stamp Controls
    const inputHeader = document.getElementById('input-header-text');
    const inputFooter = document.getElementById('input-footer-text');
    const fontSelect = document.getElementById('font-family-select');
    const toggleDate = document.getElementById('toggle-date-stamp');

    const updateTextCaptions = () => {
        canvasBuilder.setTextOptions(
            inputHeader.value,
            inputFooter.value,
            fontSelect.value,
            toggleDate.checked
        );
    };

    if (inputHeader) inputHeader.addEventListener('input', updateTextCaptions);
    if (inputFooter) inputFooter.addEventListener('input', updateTextCaptions);
    if (fontSelect) fontSelect.addEventListener('change', updateTextCaptions);
    if (toggleDate) toggleDate.addEventListener('change', updateTextCaptions);

    // 6. Export Actions
    const generateCompositeCanvas = () => {
        const baseCanvas = document.getElementById('photobooth-canvas');
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = baseCanvas.width;
        exportCanvas.height = baseCanvas.height;
        const ctx = exportCanvas.getContext('2d');

        ctx.drawImage(baseCanvas, 0, 0);

        const dragLayer = document.getElementById('sticker-drag-layer');
        const stickers = dragLayer.querySelectorAll('.draggable-sticker');
        const layerRect = dragLayer.getBoundingClientRect();
        const scaleX = baseCanvas.width / layerRect.width;
        const scaleY = baseCanvas.height / layerRect.height;

        stickers.forEach(sticker => {
            const contentEl = sticker.querySelector('.sticker-content');
            if (!contentEl) return;

            const text = contentEl.textContent.trim();
            const stickerRect = sticker.getBoundingClientRect();

            const x = (stickerRect.left - layerRect.left) * scaleX;
            const y = (stickerRect.top - layerRect.top) * scaleY;

            ctx.save();
            ctx.font = `${36 * scaleX}px sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(text, x, y);
            ctx.restore();
        });

        return exportCanvas;
    };

    // Download PNG
    if (btnDownloadPng) {
        btnDownloadPng.addEventListener('click', () => {
            const finalCanvas = generateCompositeCanvas();
            const dataUrl = finalCanvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = `SnapBooth_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            addToGallery(dataUrl);

            if (window.confetti) {
                window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            }
        });
    }

    // Download GIF
    if (btnDownloadGif) {
        btnDownloadGif.addEventListener('click', async () => {
            if (capturedShots.length === 0) {
                alert('Please take photos first to generate an animated GIF!');
                return;
            }

            btnDownloadGif.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating GIF...';
            
            try {
                const gifData = await GifExporter.createAnimatedGif(capturedShots, 400, 300, 600);
                if (gifData && gifData.frames.length > 0) {
                    const link = document.createElement('a');
                    link.download = `SnapBooth_Animation_${Date.now()}.png`;
                    link.href = gifData.frames[0];
                    link.click();
                }
            } catch (err) {
                console.error('GIF generation error:', err);
            }

            btnDownloadGif.innerHTML = '<i class="fa-solid fa-film"></i> Save Animated GIF';
        });
    }

    // Copy to Clipboard
    if (btnCopyClipboard) {
        btnCopyClipboard.addEventListener('click', async () => {
            const finalCanvas = generateCompositeCanvas();
            finalCanvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('Copied Photo Strip to Clipboard! 📋');
                } catch (err) {
                    console.warn('Clipboard write failed:', err);
                    alert('Copy failed or not supported by browser permissions.');
                }
            }, 'image/png');
        });
    }

    // 7. Session Gallery with localStorage Persistence
    const addToGallery = (dataUrl) => {
        const entry = {
            id: Date.now(),
            dataUrl: dataUrl,
            createdAt: new Date().toLocaleString()
        };
        sessionGallery.push(entry);
        saveGalleryToStorage(sessionGallery);
        if (galleryCountBadge) galleryCountBadge.textContent = sessionGallery.length;
        renderGallery();
    };

    const deleteFromGallery = (index) => {
        sessionGallery.splice(index, 1);
        saveGalleryToStorage(sessionGallery);
        if (galleryCountBadge) galleryCountBadge.textContent = sessionGallery.length;
        renderGallery();
    };

    const clearAllGallery = () => {
        if (!confirm('Are you sure you want to delete ALL saved photos? This cannot be undone.')) return;
        sessionGallery.length = 0;
        saveGalleryToStorage(sessionGallery);
        if (galleryCountBadge) galleryCountBadge.textContent = 0;
        renderGallery();
    };

    const renderGallery = () => {
        if (sessionGallery.length === 0) {
            if (galleryEmpty) galleryEmpty.classList.remove('hidden');
            if (galleryGrid) galleryGrid.innerHTML = '';
            return;
        }

        if (galleryEmpty) galleryEmpty.classList.add('hidden');
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        sessionGallery.forEach((entry, idx) => {
            // Support both old format (string) and new format (object)
            const dataUrl = typeof entry === 'string' ? entry : entry.dataUrl;
            const createdAt = typeof entry === 'object' && entry.createdAt ? entry.createdAt : '';

            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${dataUrl}" alt="Photobooth Strip ${idx + 1}">
                ${createdAt ? `<p class="gallery-date"><i class="fa-regular fa-calendar"></i> ${createdAt}</p>` : ''}
                <div class="gallery-actions">
                    <a href="${dataUrl}" download="SnapBooth_${idx + 1}.png" class="btn btn-sm btn-primary flex-1">
                        <i class="fa-solid fa-download"></i> Save
                    </a>
                    <button class="btn btn-sm btn-outline danger-text gallery-delete-btn" title="Delete from gallery">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Wire up delete button
            const deleteBtn = item.querySelector('.gallery-delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteFromGallery(idx);
            });

            galleryGrid.appendChild(item);
        });
    };

    if (btnSessionGallery) {
        btnSessionGallery.addEventListener('click', () => {
            renderGallery();
            galleryModal.classList.remove('hidden');
        });
    }

    if (btnCloseGallery) {
        btnCloseGallery.addEventListener('click', () => {
            galleryModal.classList.add('hidden');
        });
    }

    if (galleryModal) {
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) {
                galleryModal.classList.add('hidden');
            }
        });
    }

    // Wire up the Clear All Gallery button
    const btnClearGallery = document.getElementById('btn-clear-gallery');
    if (btnClearGallery) {
        btnClearGallery.addEventListener('click', clearAllGallery);
    }
});
