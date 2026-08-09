/* ==========================================================================
   SnapBooth Studio - Commercial Product Application Controller
   Workflow: LANDING HERO → CAPTURE → CUSTOMIZE → EXPORT & SHARE / PRINT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Core Modules Initialization
    const camera = new CameraEngine();
    const canvasBuilder = new PhotoboothCanvasBuilder('photobooth-canvas');
    const stickerManager = new StickerManager('sticker-drag-layer');

    let capturedShots = [];

    // Initialize High-Capacity IndexedDB Gallery Database
    if (window.galleryDB) {
        try {
            await window.galleryDB.init();
            updateGalleryBadge();
        } catch (dbErr) {
            console.warn('Gallery DB Init Warning:', dbErr);
        }
    }

    // 2. View Switcher Navigation Engine
    const views = {
        landing: document.getElementById('view-landing'),
        capture: document.getElementById('view-capture'),
        editor: document.getElementById('view-editor'),
        result: document.getElementById('view-result')
    };

    const navBtns = {
        landing: document.getElementById('nav-btn-landing'),
        capture: document.getElementById('nav-btn-capture'),
        editor: document.getElementById('nav-btn-editor'),
        result: document.getElementById('nav-btn-result')
    };

    const showView = (viewName) => {
        Object.keys(views).forEach(key => {
            if (views[key]) {
                if (key === viewName) {
                    views[key].classList.remove('hidden');
                } else {
                    views[key].classList.add('hidden');
                }
            }
        });

        Object.keys(navBtns).forEach(key => {
            if (navBtns[key]) {
                if (key === viewName) {
                    navBtns[key].classList.add('active');
                } else {
                    navBtns[key].classList.remove('active');
                }
            }
        });

        // Auto initialize camera if entering capture mode
        if (viewName === 'capture' && !camera.currentStream && !camera.isDemoMode) {
            camera.initCamera();
        }

        // Render result canvas if entering export view
        if (viewName === 'result') {
            renderResultViewPreview();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Navigation Click Handlers
    document.querySelectorAll('.step-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewTarget = btn.getAttribute('data-view').replace('view-', '');
            showView(viewTarget);
        });
    });

    document.getElementById('header-logo-home')?.addEventListener('click', () => showView('landing'));
    document.getElementById('btn-start-photobooth')?.addEventListener('click', () => showView('capture'));
    document.getElementById('btn-proceed-to-customize')?.addEventListener('click', () => {
        if (capturedShots.length === 0) {
            window.toast?.warning('Take at least 1 photo first!');
            return;
        }
        showView('editor');
    });
    document.getElementById('btn-proceed-to-export')?.addEventListener('click', () => showView('result'));
    document.getElementById('btn-restart-photobooth')?.addEventListener('click', () => {
        capturedShots = [];
        renderShotsTray();
        showView('capture');
    });

    // 3. Camera Power & Switch Handlers
    document.getElementById('btn-enable-cam')?.addEventListener('click', () => camera.toggleCameraPower());
    document.getElementById('btn-toggle-camera-power')?.addEventListener('click', () => camera.toggleCameraPower());
    document.getElementById('btn-switch-camera')?.addEventListener('click', () => camera.switchCamera());
    document.getElementById('btn-request-camera')?.addEventListener('click', () => camera.initCamera());
    document.getElementById('btn-virtual-demo')?.addEventListener('click', () => {
        camera.startVirtualDemoFeed();
        window.toast?.info('Virtual Demo Camera Stream Active');
    });

    // Filter Chips Selector
    document.getElementById('filter-bar')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        document.querySelectorAll('#filter-bar .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filterName = chip.getAttribute('data-filter');
        camera.setFilter(filterName);
    });

    // File Upload Fallback
    const fileUploadInput = document.getElementById('file-upload-input');
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
                        showView('editor');
                        window.toast?.success(`${files.length} photo(s) uploaded!`);
                    }
                };
                img.src = URL.createObjectURL(file);
            });
        });
    }

    // 4. Capture Burst & Retake Engine
    const btnStartCapture = document.getElementById('btn-start-capture');
    const delaySelect = document.getElementById('timer-delay-select');

    if (btnStartCapture) {
        btnStartCapture.addEventListener('click', () => {
            if (camera.isCapturing) return;

            const delay = parseInt(delaySelect.value, 10) || 3;
            const shotsNeeded = getLayoutMaxShots(canvasBuilder.layout);

            capturedShots = [];
            renderShotsTray();

            camera.startBurstSequence(
                shotsNeeded,
                delay,
                (shotCanvas) => {
                    capturedShots.push(shotCanvas);
                    renderShotsTray();
                },
                () => {
                    canvasBuilder.setShots(capturedShots);
                    window.toast?.success('Photobooth session complete! Proceeding to Customize...');
                    setTimeout(() => showView('editor'), 600);

                    if (window.confetti) {
                        window.confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
                    }
                }
            );
        });
    }

    // 5. Signature "Magic Snap" Feature
    const triggerMagicSnap = () => {
        showView('capture');
        if (!camera.currentStream && !camera.isDemoMode) {
            camera.startVirtualDemoFeed();
        }

        capturedShots = [];
        renderShotsTray();

        camera.startBurstSequence(
            4,
            2,
            (shotCanvas) => {
                capturedShots.push(shotCanvas);
                renderShotsTray();
            },
            () => {
                canvasBuilder.applyTemplate('y2k');
                canvasBuilder.setShots(capturedShots);
                window.toast?.success('✨ Magic Snap generated your design!');
                showView('result');

                if (window.confetti) {
                    window.confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                }
            }
        );
    };

    document.getElementById('btn-hero-magic-snap')?.addEventListener('click', triggerMagicSnap);
    document.getElementById('btn-magic-snap-capture')?.addEventListener('click', triggerMagicSnap);

    // Shot Manager Tray with Single Shot Retake
    const renderShotsTray = () => {
        const shotsTray = document.getElementById('shots-tray');
        const shotsCountText = document.getElementById('shots-count-text');

        if (!shotsTray) return;

        if (capturedShots.length === 0) {
            shotsTray.innerHTML = '<p class="empty-tray-text">No shots taken yet. Tap "TAKE PHOTO" to begin!</p>';
            if (shotsCountText) shotsCountText.textContent = '0 photos taken';
            return;
        }

        if (shotsCountText) shotsCountText.textContent = `${capturedShots.length} photo(s) taken`;
        shotsTray.innerHTML = '';

        capturedShots.forEach((shotCanvas, index) => {
            const thumbItem = document.createElement('div');
            thumbItem.className = 'shot-thumb-item';

            let src = (shotCanvas instanceof HTMLCanvasElement) ? shotCanvas.toDataURL('image/png') : shotCanvas.src;

            thumbItem.innerHTML = `
                <img src="${src}" alt="Shot ${index + 1}">
                <span class="shot-badge">#${index + 1}</span>
                <button class="shot-retake-btn" title="Retake Shot #${index + 1}" data-index="${index}">
                    <i class="fa-solid fa-rotate-left"></i> Retake
                </button>
            `;

            thumbItem.querySelector('.shot-retake-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                retakeSingleShot(index);
            });

            shotsTray.appendChild(thumbItem);
        });
    };

    const retakeSingleShot = (index) => {
        if (camera.isCapturing) return;

        window.toast?.info(`Retaking Photo #${index + 1}...`);
        camera.startBurstSequence(
            1,
            2,
            (newShotCanvas) => {
                capturedShots[index] = newShotCanvas;
                canvasBuilder.setShots(capturedShots);
                renderShotsTray();
                window.toast?.success(`Photo #${index + 1} updated!`);
            }
        );
    };

    const getLayoutMaxShots = (layoutName) => {
        switch (layoutName) {
            case 'strip-2': return 2;
            case 'strip-3': return 3;
            case 'grid-2x2': return 4;
            case 'grid-3x2': return 6;
            case 'polaroid': return 1;
            case 'strip-4':
            case 'film-roll':
            default: return 4;
        }
    };

    document.getElementById('btn-retake-all')?.addEventListener('click', () => {
        capturedShots = [];
        canvasBuilder.setShots([]);
        renderShotsTray();
        window.toast?.info('Session shots cleared.');
    });

    // 6. Editor Studio Tabs & Controls
    document.querySelectorAll('.tabs-header .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content-container .tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = document.getElementById(btn.getAttribute('data-tab'));
            if (targetTab) targetTab.classList.add('active');
        });
    });

    // Layout Selector Cards
    document.querySelectorAll('.layout-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const layout = card.getAttribute('data-layout');
            canvasBuilder.setLayout(layout);
        });
    });

    // Preset Commercial Template Cards
    document.querySelectorAll('.template-item-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateId = card.getAttribute('data-template');
            canvasBuilder.applyTemplate(templateId);
            window.toast?.success(`Applied ${card.querySelector('h4').textContent} Theme!`);
        });
    });

    // Border Decorator Chips
    document.getElementById('border-style-selector')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        document.querySelectorAll('#border-style-selector .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        canvasBuilder.setBorderStyle(chip.getAttribute('data-border'));
    });

    // Frame Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            canvasBuilder.setFrameStyle(swatch.getAttribute('data-color'), canvasBuilder.padding, canvasBuilder.cornerRadius);
        });
    });

    // Text & Fonts Inputs
    const headerInput = document.getElementById('input-header-text');
    const footerInput = document.getElementById('input-footer-text');
    const fontSelect = document.getElementById('font-family-select');
    const dateToggle = document.getElementById('toggle-date-stamp');

    const updateCanvasText = () => {
        canvasBuilder.setTextOptions(
            headerInput.value,
            footerInput.value,
            fontSelect.value,
            dateToggle.checked
        );
    };

    if (headerInput) headerInput.addEventListener('input', updateCanvasText);
    if (footerInput) footerInput.addEventListener('input', updateCanvasText);
    if (fontSelect) fontSelect.addEventListener('change', updateCanvasText);
    if (dateToggle) dateToggle.addEventListener('change', updateCanvasText);

    // Event Branding Form
    document.getElementById('btn-apply-branding')?.addEventListener('click', () => {
        const name = document.getElementById('branding-event-name')?.value || '';
        const date = document.getElementById('branding-event-date')?.value || '';
        const tagline = document.getElementById('branding-tagline')?.value || '';

        canvasBuilder.setEventBranding({ name, date, tagline });
        window.toast?.success('Custom Event Branding applied!');
    });

    // Undo / Redo / Reset Design Buttons
    document.getElementById('btn-undo')?.addEventListener('click', () => {
        if (canvasBuilder.undo()) window.toast?.info('Undo');
    });
    document.getElementById('btn-redo')?.addEventListener('click', () => {
        if (canvasBuilder.redo()) window.toast?.info('Redo');
    });
    document.getElementById('btn-reset-design')?.addEventListener('click', () => {
        canvasBuilder.resetDesign();
        window.toast?.info('Design reset to default.');
    });

    // 7. Export & Result View
    const renderResultViewPreview = () => {
        const holder = document.getElementById('result-canvas-holder');
        if (!holder) return;
        holder.innerHTML = '';
        const img = new Image();
        img.src = canvasBuilder.toHighResDataURL();
        img.style.maxHeight = '500px';
        img.style.borderRadius = '6px';
        holder.appendChild(img);
    };

    // Download PNG
    document.getElementById('btn-download-png')?.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `SnapBooth-${Date.now()}.png`;
        link.href = canvasBuilder.toHighResDataURL();
        link.click();
        window.toast?.success('PNG Downloaded!');
    });

    // Download GIF
    document.getElementById('btn-download-gif')?.addEventListener('click', () => {
        if (capturedShots.length === 0) {
            window.toast?.warning('No shot frames available for GIF!');
            return;
        }
        window.toast?.info('Generating animated GIF...');

        if (window.GIFEncoder) {
            const encoder = new window.GIFEncoder();
            encoder.setRepeat(0);
            encoder.setDelay(600);
            encoder.start();

            capturedShots.forEach(shot => {
                const tempC = document.createElement('canvas');
                tempC.width = 360; tempC.height = 270;
                const ctx = tempC.getContext('2d');
                ctx.drawImage(shot, 0, 0, 360, 270);
                encoder.addFrame(ctx);
            });

            encoder.finish();
            const binaryGIF = encoder.stream().getData();
            const dataURL = 'data:image/gif;base64,' + encode64(binaryGIF);

            const link = document.createElement('a');
            link.download = `SnapBooth-Animation-${Date.now()}.gif`;
            link.href = dataURL;
            link.click();
            window.toast?.success('GIF Exported!');
        }
    });

    // Direct Print & Print Size Modal Setup
    document.getElementById('btn-direct-print')?.addEventListener('click', () => {
        const printArea = document.getElementById('printable-area');
        if (!printArea) return;
        printArea.innerHTML = `<img src="${canvasBuilder.toHighResDataURL()}" alt="Photobooth Print">`;
        window.toast?.info('Opening print dialog...');
        setTimeout(() => window.print(), 300);
    });

    document.getElementById('btn-trigger-print-now')?.addEventListener('click', () => {
        const printArea = document.getElementById('printable-area');
        if (!printArea) return;
        printArea.innerHTML = `<img src="${canvasBuilder.toHighResDataURL()}" alt="Photobooth Print">`;
        document.getElementById('print-size-modal')?.classList.add('hidden');
        window.toast?.info('Opening print dialog...');
        setTimeout(() => window.print(), 300);
    });

    // QR Code & Share Modal
    document.getElementById('btn-open-qr-share')?.addEventListener('click', () => {
        const qrModal = document.getElementById('qr-share-modal');
        const qrHolder = document.getElementById('qr-canvas-holder');
        if (!qrModal || !qrHolder) return;

        qrHolder.innerHTML = '';
        const qrImg = new Image();
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`;
        qrHolder.appendChild(qrImg);

        qrModal.classList.remove('hidden');
    });

    document.getElementById('btn-native-web-share')?.addEventListener('click', async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SnapBooth Memory',
                    text: 'Check out my photobooth strip from SnapBooth!',
                    url: window.location.href
                });
                window.toast?.success('Shared successfully!');
            } catch (err) {
                console.log('Share error:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            window.toast?.success('Link copied to clipboard!');
        }
    });

    // Save to High-Capacity IndexedDB Gallery
    document.getElementById('btn-save-to-gallery')?.addEventListener('click', async () => {
        const dataURL = canvasBuilder.toHighResDataURL();
        if (window.galleryDB) {
            await window.galleryDB.savePhotoStrip({
                dataURL: dataURL,
                type: 'strip',
                layout: canvasBuilder.layout,
                timestamp: Date.now()
            });
            updateGalleryBadge();
            window.toast?.success('Saved to Session Gallery!');
        }
    });

    async function updateGalleryBadge() {
        const badge = document.getElementById('gallery-count-badge');
        if (!badge || !window.galleryDB) return;
        const count = await window.galleryDB.getPhotoCount();
        badge.textContent = count;
        renderGalleryGrid();
    }

    async function renderGalleryGrid() {
        const grid = document.getElementById('gallery-grid');
        const empty = document.getElementById('gallery-empty');
        if (!grid || !window.galleryDB) return;

        const photos = await window.galleryDB.getAllPhotos();
        if (photos.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        grid.innerHTML = '';

        photos.forEach(item => {
            const card = document.createElement('div');
            card.className = 'gallery-item';
            card.innerHTML = `
                <img src="${item.dataURL}" alt="Saved Strip">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
                    <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                    <button class="btn btn-ghost btn-sm danger-text delete-item-btn" data-id="${item.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            card.querySelector('.delete-item-btn').addEventListener('click', async () => {
                await window.galleryDB.deletePhoto(item.id);
                updateGalleryBadge();
                window.toast?.info('Item deleted from gallery.');
            });

            grid.appendChild(card);
        });
    }

    // Settings Modal Setup
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('hidden');
    });

    // Helper encode64 for GIF stream
    function encode64(input) {
        const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let output = "";
        let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        let i = 0;
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) enc3 = enc4 = 64;
            else if (isNaN(chr3)) enc4 = 64;
            output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
        }
        return output;
    }
});
