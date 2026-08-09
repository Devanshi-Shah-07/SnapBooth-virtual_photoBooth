/* ==========================================================================
   SnapBooth Studio - Main Application Controller
   Connects camera stream, camera power switch, photo deletion, canvas rendering,
   customization tabs, direct browser printing, print size modal, permission recovery 
   & high-capacity IndexedDB gallery
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Engines
    const cameraEngine = new CameraEngine();
    const canvasBuilder = new PhotoboothCanvasBuilder('photobooth-canvas');
    const stickerEngine = new StickerEngine();

    // Session State
    let capturedShots = [];

    // UI Element References
    const btnToggleCameraPower = document.getElementById('btn-toggle-camera-power');
    const btnEnableCam = document.getElementById('btn-enable-cam');
    const btnRequestCamera = document.getElementById('btn-request-camera');
    const btnUnblockHelp = document.getElementById('btn-unblock-help');
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
    const btnOpenPrintModal = document.getElementById('btn-open-print-modal');
    const btnDirectPrint = document.getElementById('btn-direct-print');

    const galleryModal = document.getElementById('gallery-modal');
    const btnSessionGallery = document.getElementById('btn-session-gallery');
    const btnCloseGallery = document.getElementById('btn-close-gallery');
    const btnClearGallery = document.getElementById('btn-clear-gallery');
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryEmpty = document.getElementById('gallery-empty');
    const galleryCountBadge = document.getElementById('gallery-count-badge');

    // Camera Permission Help Modal
    const cameraPermissionModal = document.getElementById('camera-permission-modal');
    const btnClosePermissionModal = document.getElementById('btn-close-permission-modal');
    const btnRetryCameraAccess = document.getElementById('btn-retry-camera-access');
    const btnFallbackDemoMode = document.getElementById('btn-fallback-demo-mode');

    // Print Size Selection Modal
    const printSizeModal = document.getElementById('print-size-modal');
    const btnClosePrintModal = document.getElementById('btn-close-print-modal');
    const btnTriggerPrint = document.getElementById('btn-trigger-print');
    const btnDownloadHighresPrint = document.getElementById('btn-download-highres-print');
    const printSizeCards = document.querySelectorAll('.print-size-card');
    let selectedPrintSize = 'strip-2x6';

    // 2. Non-blocking Gallery & Badge initialization
    const updateGalleryBadgeCount = async () => {
        try {
            if (window.galleryDB) {
                const photos = await window.galleryDB.getAllPhotos();
                if (galleryCountBadge) galleryCountBadge.textContent = photos.length;
            }
        } catch (e) {
            console.warn('Failed to update gallery badge count:', e);
        }
    };

    // Run DB migration safely in background without blocking event listener registration
    (async () => {
        try {
            if (window.galleryDB) {
                await window.galleryDB.migrateFromLocalStorage();
                await updateGalleryBadgeCount();
            }
        } catch (err) {
            console.warn('DB background init warning:', err);
        }
    })();

    // 3. Camera Power Switch & Permission Recovery Handlers
    if (btnToggleCameraPower) {
        btnToggleCameraPower.addEventListener('click', () => cameraEngine.toggleCameraPower());
    }

    if (btnEnableCam) {
        btnEnableCam.addEventListener('click', () => cameraEngine.toggleCameraPower());
    }

    if (btnRequestCamera) {
        btnRequestCamera.addEventListener('click', () => cameraEngine.initCamera());
    }

    if (btnUnblockHelp) {
        btnUnblockHelp.addEventListener('click', () => {
            if (cameraPermissionModal) cameraPermissionModal.classList.remove('hidden');
        });
    }

    if (btnClosePermissionModal) {
        btnClosePermissionModal.addEventListener('click', () => {
            if (cameraPermissionModal) cameraPermissionModal.classList.add('hidden');
        });
    }

    if (btnRetryCameraAccess) {
        btnRetryCameraAccess.addEventListener('click', () => {
            if (cameraPermissionModal) cameraPermissionModal.classList.add('hidden');
            cameraEngine.initCamera();
        });
    }

    if (btnFallbackDemoMode) {
        btnFallbackDemoMode.addEventListener('click', () => {
            if (cameraPermissionModal) cameraPermissionModal.classList.add('hidden');
            cameraEngine.startVirtualDemoFeed();
        });
    }

    if (btnVirtualDemo) {
        btnVirtualDemo.addEventListener('click', () => cameraEngine.startVirtualDemoFeed());
    }

    if (btnSwitchCamera) {
        btnSwitchCamera.addEventListener('click', () => cameraEngine.switchCamera());
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

    // Render Shot Manager Tray Thumbnails
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

            const deleteBtn = thumbItem.querySelector('.shot-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteIndividualShot(index);
            });

            shotsTray.appendChild(thumbItem);
        });
    };

    const deleteIndividualShot = (index) => {
        if (index >= 0 && index < capturedShots.length) {
            capturedShots.splice(index, 1);
            canvasBuilder.setShots(capturedShots);
            renderShotsTray();
        }
    };

    // 4. Filter Selector
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            cameraEngine.setFilter(filter);
        });
    });

    // 5. Capture Button Trigger
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
                            particleCount: 75,
                            spread: 85,
                            origin: { y: 0.7 }
                        });
                    }
                }
            );
        });
    }

    if (btnRetakeAll) {
        btnRetakeAll.addEventListener('click', () => {
            capturedShots = [];
            canvasBuilder.setShots([]);
            renderShotsTray();
        });
    }

    // 6. Customization Tab Navigation
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

    // Layout Cards
    const layoutCards = document.querySelectorAll('.layout-card');
    layoutCards.forEach(card => {
        card.addEventListener('click', () => {
            layoutCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            canvasBuilder.setLayout(card.dataset.layout);
        });
    });

    // Border Style Chips
    const borderChips = document.querySelectorAll('.border-style-chip');
    borderChips.forEach(chip => {
        chip.addEventListener('click', () => {
            borderChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            canvasBuilder.setBorderStyle(chip.dataset.border);
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
            canvasBuilder.setFrameStyle(swatch.dataset.color, framePaddingInput.value, frameCornerInput.value);
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

    // 7. High-Res Canvas Compositor
    const generateCompositeCanvas = (scaleMultiplier = 1) => {
        const baseCanvas = document.getElementById('photobooth-canvas');
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = baseCanvas.width * scaleMultiplier;
        exportCanvas.height = baseCanvas.height * scaleMultiplier;
        const ctx = exportCanvas.getContext('2d');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(baseCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

        const dragLayer = document.getElementById('sticker-drag-layer');
        const stickers = dragLayer.querySelectorAll('.draggable-sticker');
        const layerRect = dragLayer.getBoundingClientRect();
        const scaleX = exportCanvas.width / layerRect.width;
        const scaleY = exportCanvas.height / layerRect.height;

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

    // 8. Direct Reliable Printing Function
    const triggerDirectPrint = () => {
        const finalCanvas = generateCompositeCanvas(2);
        const dataUrl = finalCanvas.toDataURL('image/png', 1.0);

        let printableArea = document.getElementById('printable-area');
        if (!printableArea) {
            printableArea = document.createElement('div');
            printableArea.id = 'printable-area';
            printableArea.className = 'printable-area';
            document.body.appendChild(printableArea);
        }

        printableArea.innerHTML = `<img src="${dataUrl}" alt="Photobooth Print" />`;

        // Small delay to ensure image DOM loading, then trigger browser print dialog
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // Direct Print Button
    if (btnDirectPrint) {
        btnDirectPrint.addEventListener('click', triggerDirectPrint);
    }

    // Download PNG
    if (btnDownloadPng) {
        btnDownloadPng.addEventListener('click', async () => {
            const finalCanvas = generateCompositeCanvas();
            const dataUrl = finalCanvas.toDataURL('image/png', 1.0);

            const link = document.createElement('a');
            link.download = `SnapBooth_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            await saveToHighCapacityGallery(dataUrl);

            if (window.confetti) {
                window.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
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

            btnDownloadGif.innerHTML = '<i class="fa-solid fa-film"></i> Save GIF';
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

    // 9. Print Size Selection Modal
    if (btnOpenPrintModal) {
        btnOpenPrintModal.addEventListener('click', () => {
            if (printSizeModal) printSizeModal.classList.remove('hidden');
        });
    }

    if (btnClosePrintModal) {
        btnClosePrintModal.addEventListener('click', () => {
            if (printSizeModal) printSizeModal.classList.add('hidden');
        });
    }

    printSizeCards.forEach(card => {
        card.addEventListener('click', () => {
            printSizeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedPrintSize = card.dataset.size;
        });
    });

    if (btnTriggerPrint) {
        btnTriggerPrint.addEventListener('click', () => {
            if (printSizeModal) printSizeModal.classList.add('hidden');
            triggerDirectPrint();
        });
    }

    if (btnDownloadHighresPrint) {
        btnDownloadHighresPrint.addEventListener('click', async () => {
            const finalCanvas = generateCompositeCanvas(2);
            const dataUrl = finalCanvas.toDataURL('image/png', 1.0);

            const link = document.createElement('a');
            link.download = `SnapBooth_Print300DPI_${selectedPrintSize}_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            await saveToHighCapacityGallery(dataUrl);
            if (printSizeModal) printSizeModal.classList.add('hidden');
        });
    }

    // 10. IndexedDB Gallery Operations
    const saveToHighCapacityGallery = async (dataUrl) => {
        try {
            if (window.galleryDB) {
                await window.galleryDB.addPhoto(dataUrl);
                await updateGalleryBadgeCount();
            }
        } catch (err) {
            console.error('Failed to save to gallery DB:', err);
        }
    };

    const renderGallery = async () => {
        if (!galleryGrid) return;

        try {
            const photos = await window.galleryDB.getAllPhotos();

            if (photos.length === 0) {
                if (galleryEmpty) galleryEmpty.classList.remove('hidden');
                galleryGrid.innerHTML = '';
                if (galleryCountBadge) galleryCountBadge.textContent = '0';
                return;
            }

            if (galleryEmpty) galleryEmpty.classList.add('hidden');
            galleryGrid.innerHTML = '';
            if (galleryCountBadge) galleryCountBadge.textContent = photos.length;

            photos.forEach((entry) => {
                const dataUrl = entry.dataUrl;
                const createdAt = entry.createdAt || 'Saved Memory';
                const id = entry.id;

                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img src="${dataUrl}" alt="Photobooth Strip">
                    <p class="gallery-date"><i class="fa-regular fa-calendar"></i> ${createdAt}</p>
                    <div class="gallery-actions">
                        <a href="${dataUrl}" download="SnapBooth_${id}.png" class="btn btn-sm btn-primary flex-1">
                            <i class="fa-solid fa-download"></i> Save
                        </a>
                        <button class="btn btn-sm btn-outline danger-text gallery-delete-btn" data-id="${id}" title="Delete from gallery">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;

                const deleteBtn = item.querySelector('.gallery-delete-btn');
                deleteBtn.addEventListener('click', async () => {
                    if (window.galleryDB) {
                        await window.galleryDB.deletePhoto(id);
                        await renderGallery();
                    }
                });

                galleryGrid.appendChild(item);
            });
        } catch (err) {
            console.error('Error rendering gallery:', err);
        }
    };

    if (btnSessionGallery) {
        btnSessionGallery.addEventListener('click', async () => {
            await renderGallery();
            if (galleryModal) galleryModal.classList.remove('hidden');
        });
    }

    if (btnCloseGallery) {
        btnCloseGallery.addEventListener('click', () => {
            if (galleryModal) galleryModal.classList.add('hidden');
        });
    }

    if (galleryModal) {
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) {
                galleryModal.classList.add('hidden');
            }
        });
    }

    if (btnClearGallery) {
        btnClearGallery.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete ALL saved photos from your gallery? This cannot be undone.')) return;
            if (window.galleryDB) {
                await window.galleryDB.clearAll();
                await renderGallery();
            }
        });
    }
});
