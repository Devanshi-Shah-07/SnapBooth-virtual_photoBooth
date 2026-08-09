/* ==========================================================================
   SnapBooth Studio - Commercial Photobooth Canvas Builder (HIGH-RES Edition)
   Renders custom photobooth strips, borders, themes, templates, headers, footers & dates
   Supports: 4-Strip, 3-Strip, 2-Duo, 2x2 Grid, 3x2 Grid, Polaroid, 35mm Film Roll
   Supports: Curated Event Templates (Minimal, Y2K, Wedding, Birthday, College, Corporate)
   ========================================================================== */

class PhotoboothCanvasBuilder {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.shots = [];
        this.layout = 'strip-4';
        this.borderStyle = 'solid';
        this.frameColor = '#FFFFFF';
        this.padding = 20;
        this.cornerRadius = 8;
        this.headerText = 'SNAPBOOTH STUDIO';
        this.footerText = 'MEMORIES • PHOTOBOOTH';
        this.fontFamily = "'Caveat', cursive";
        this.includeDate = true;

        // High-res scale factor (2x for retina-quality output)
        this.scaleFactor = 2;

        // Commercial Event Customization Branding
        this.eventBranding = {
            enabled: false,
            name: '',
            date: '',
            tagline: '',
            color: '#ec4899'
        };

        // Undo / Redo History Stack
        this.history = [];
        this.historyStep = -1;
        this.saveState();

        this.render();
    }

    saveState() {
        // Limit history to 20 steps
        if (this.historyStep < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyStep + 1);
        }
        const state = {
            layout: this.layout,
            borderStyle: this.borderStyle,
            frameColor: this.frameColor,
            padding: this.padding,
            cornerRadius: this.cornerRadius,
            headerText: this.headerText,
            footerText: this.footerText,
            fontFamily: this.fontFamily,
            includeDate: this.includeDate,
            eventBranding: { ...this.eventBranding }
        };
        this.history.push(JSON.stringify(state));
        this.historyStep = this.history.length - 1;
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            const state = JSON.parse(this.history[this.historyStep]);
            this.applyState(state);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            const state = JSON.parse(this.history[this.historyStep]);
            this.applyState(state);
            return true;
        }
        return false;
    }

    applyState(state) {
        this.layout = state.layout;
        this.borderStyle = state.borderStyle;
        this.frameColor = state.frameColor;
        this.padding = state.padding;
        this.cornerRadius = state.cornerRadius;
        this.headerText = state.headerText;
        this.footerText = state.footerText;
        this.fontFamily = state.fontFamily;
        this.includeDate = state.includeDate;
        this.eventBranding = state.eventBranding || { enabled: false, name: '', date: '', tagline: '', color: '#ec4899' };
        this.render();
    }

    resetDesign() {
        this.layout = 'strip-4';
        this.borderStyle = 'solid';
        this.frameColor = '#FFFFFF';
        this.padding = 20;
        this.cornerRadius = 8;
        this.headerText = 'SNAPBOOTH STUDIO';
        this.footerText = 'MEMORIES • PHOTOBOOTH';
        this.fontFamily = "'Caveat', cursive";
        this.includeDate = true;
        this.eventBranding = { enabled: false, name: '', date: '', tagline: '', color: '#ec4899' };
        this.saveState();
        this.render();
    }

    // Curated Commercial Event Templates
    applyTemplate(templateId) {
        switch (templateId) {
            case 'minimal':
                this.layout = 'strip-4';
                this.borderStyle = 'solid';
                this.frameColor = '#FFFFFF';
                this.padding = 24;
                this.cornerRadius = 0;
                this.headerText = 'SNAPBOOTH';
                this.footerText = 'MEMORIES';
                this.fontFamily = "'Outfit', sans-serif";
                this.includeDate = true;
                break;
            case 'y2k':
                this.layout = 'strip-4';
                this.borderStyle = 'neon';
                this.frameColor = 'pattern-checker';
                this.padding = 20;
                this.cornerRadius = 12;
                this.headerText = 'Y2K VIBES • 2000s';
                this.footerText = '★ PARTY SNAP ★';
                this.fontFamily = "'Space Grotesk', sans-serif";
                this.includeDate = true;
                break;
            case 'wedding':
                this.layout = 'strip-4';
                this.borderStyle = 'solid';
                this.frameColor = '#E6E6FA';
                this.padding = 22;
                this.cornerRadius = 8;
                this.headerText = 'OUR WEDDING DAY';
                this.footerText = 'FOREVER & ALWAYS';
                this.fontFamily = "'Playfair Display', serif";
                this.includeDate = true;
                break;
            case 'birthday':
                this.layout = 'strip-4';
                this.borderStyle = 'dots';
                this.frameColor = '#FFD1DC';
                this.padding = 20;
                this.cornerRadius = 14;
                this.headerText = 'HAPPY BIRTHDAY';
                this.footerText = 'BEST DAY EVER 🎉';
                this.fontFamily = "'Dancing Script', cursive";
                this.includeDate = true;
                break;
            case 'college':
                this.layout = 'grid-2x2';
                this.borderStyle = 'stitch';
                this.frameColor = '#FDFD96';
                this.padding = 18;
                this.cornerRadius = 6;
                this.headerText = 'COLLEGE FEST 2026';
                this.footerText = 'CAMPUS MEMORIES';
                this.fontFamily = "'Bebas Neue', sans-serif";
                this.includeDate = true;
                break;
            case 'corporate':
                this.layout = 'strip-4';
                this.borderStyle = 'solid';
                this.frameColor = '#121212';
                this.padding = 24;
                this.cornerRadius = 4;
                this.headerText = 'ANNUAL GALA 2026';
                this.footerText = 'VIP ACCESS • SNAPBOOTH';
                this.fontFamily = "'Outfit', sans-serif";
                this.includeDate = true;
                break;
            default:
                break;
        }
        this.saveState();
        this.render();
    }

    setEventBranding(branding) {
        this.eventBranding = { ...this.eventBranding, ...branding, enabled: true };
        if (branding.name) this.headerText = branding.name;
        if (branding.tagline) this.footerText = branding.tagline;
        this.saveState();
        this.render();
    }

    setShots(shotsArray) {
        this.shots = shotsArray;
        this.render();
    }

    setLayout(layoutName) {
        this.layout = layoutName;
        this.saveState();
        this.render();
    }

    setBorderStyle(borderStyleName) {
        this.borderStyle = borderStyleName;
        this.saveState();
        this.render();
    }

    setFrameStyle(color, padding, cornerRadius) {
        this.frameColor = color;
        this.padding = parseInt(padding, 10);
        this.cornerRadius = parseInt(cornerRadius, 10);
        this.saveState();
        this.render();
    }

    setTextOptions(header, footer, font, includeDate) {
        this.headerText = header;
        this.footerText = footer;
        this.fontFamily = font;
        this.includeDate = includeDate;
        this.saveState();
        this.render();
    }

    render() {
        const S = this.scaleFactor;
        const photoWidth = 360 * S;
        const photoHeight = 270 * S;
        let pad = this.padding * S;
        
        let sideMargin = (this.borderStyle === 'film') ? 45 * S : 0;
        if (this.layout === 'film-roll') sideMargin = 50 * S;

        const headerHeight = (this.headerText.trim() !== '') ? 60 * S : 20 * S;
        const footerHeight = 70 * S;

        let canvasWidth = 0;
        let canvasHeight = 0;
        let photoCoords = [];

        switch (this.layout) {
            case 'strip-2': {
                canvasWidth = photoWidth + (pad * 2) + (sideMargin * 2);
                canvasHeight = headerHeight + (photoHeight * 2) + (pad * 3) + footerHeight;
                for (let i = 0; i < 2; i++) {
                    const y = headerHeight + pad + i * (photoHeight + pad);
                    photoCoords.push({ x: pad + sideMargin, y: y, w: photoWidth, h: photoHeight });
                }
                break;
            }
            case 'strip-3': {
                canvasWidth = photoWidth + (pad * 2) + (sideMargin * 2);
                canvasHeight = headerHeight + (photoHeight * 3) + (pad * 4) + footerHeight;
                for (let i = 0; i < 3; i++) {
                    const y = headerHeight + pad + i * (photoHeight + pad);
                    photoCoords.push({ x: pad + sideMargin, y: y, w: photoWidth, h: photoHeight });
                }
                break;
            }
            case 'grid-2x2': {
                canvasWidth = (photoWidth * 2) + (pad * 3) + (sideMargin * 2);
                canvasHeight = headerHeight + (photoHeight * 2) + (pad * 3) + footerHeight;
                photoCoords = [
                    { x: pad + sideMargin, y: headerHeight + pad, w: photoWidth, h: photoHeight },
                    { x: (pad * 2) + sideMargin + photoWidth, y: headerHeight + pad, w: photoWidth, h: photoHeight },
                    { x: pad + sideMargin, y: headerHeight + (pad * 2) + photoHeight, w: photoWidth, h: photoHeight },
                    { x: (pad * 2) + sideMargin + photoWidth, y: headerHeight + (pad * 2) + photoHeight, w: photoWidth, h: photoHeight }
                ];
                break;
            }
            case 'grid-3x2': {
                canvasWidth = (photoWidth * 2) + (pad * 3) + (sideMargin * 2);
                canvasHeight = headerHeight + (photoHeight * 3) + (pad * 4) + footerHeight;
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 2; col++) {
                        const x = pad + sideMargin + col * (photoWidth + pad);
                        const y = headerHeight + pad + row * (photoHeight + pad);
                        photoCoords.push({ x: x, y: y, w: photoWidth, h: photoHeight });
                    }
                }
                break;
            }
            case 'polaroid': {
                canvasWidth = photoWidth + (pad * 2);
                canvasHeight = pad + photoHeight + 120 * S;
                photoCoords = [{ x: pad, y: pad + 15 * S, w: photoWidth, h: photoHeight }];
                break;
            }
            case 'film-roll': {
                sideMargin = 50 * S;
                canvasWidth = photoWidth + (pad * 2) + (sideMargin * 2);
                canvasHeight = headerHeight + (photoHeight * 4) + (pad * 5) + footerHeight;
                for (let i = 0; i < 4; i++) {
                    const y = headerHeight + pad + i * (photoHeight + pad);
                    photoCoords.push({ x: pad + sideMargin, y: y, w: photoWidth, h: photoHeight });
                }
                break;
            }
            case 'strip-4':
            default: {
                canvasWidth = photoWidth + (pad * 2) + (sideMargin * 2);
                canvasHeight = headerHeight + (photoHeight * 4) + (pad * 5) + footerHeight;
                for (let i = 0; i < 4; i++) {
                    const y = headerHeight + pad + i * (photoHeight + pad);
                    photoCoords.push({ x: pad + sideMargin, y: y, w: photoWidth, h: photoHeight });
                }
                break;
            }
        }

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        // Scale CSS display size
        this.canvas.style.width = (canvasWidth / S) + 'px';
        this.canvas.style.height = (canvasHeight / S) + 'px';

        // Enable high-quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // 1. Frame Background
        this.drawFrameBackground(canvasWidth, canvasHeight);

        // 2. Special Border Decorators
        this.drawSpecialBorders(canvasWidth, canvasHeight, sideMargin);

        // 3. Draw Photos
        this.drawPhotos(photoCoords);

        // 4. Captions & Date & Event Branding
        this.drawCaptions(canvasWidth, canvasHeight, headerHeight);

        if (this.onRenderComplete) {
            this.onRenderComplete(this.canvas);
        }
    }

    drawFrameBackground(w, h) {
        this.ctx.save();

        if (this.layout === 'film-roll' || this.borderStyle === 'film') {
            this.ctx.fillStyle = '#111115';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.restore();
            return;
        }

        if (this.frameColor === 'gradient-sunset') {
            const grad = this.ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#ff7e5f');
            grad.addColorStop(1, '#feb47b');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);
        } else if (this.frameColor === 'pattern-checker') {
            const checkSize = 20 * this.scaleFactor;
            for (let x = 0; x < w; x += checkSize) {
                for (let y = 0; y < h; y += checkSize) {
                    const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
                    this.ctx.fillStyle = isEven ? '#111827' : '#ffffff';
                    this.ctx.fillRect(x, y, checkSize, checkSize);
                }
            }
        } else {
            this.ctx.fillStyle = this.frameColor;
            this.ctx.fillRect(0, 0, w, h);
        }

        this.ctx.restore();
    }

    drawSpecialBorders(w, h, sideMargin) {
        const S = this.scaleFactor;
        this.ctx.save();

        // 1. 35mm Film Roll Sprockets
        if (this.layout === 'film-roll' || this.borderStyle === 'film') {
            const holeW = 16 * S;
            const holeH = 22 * S;
            const holeSpacing = 36 * S;

            this.ctx.fillStyle = '#FFFFFF';

            for (let y = 20 * S; y < h - 20 * S; y += holeSpacing) {
                this.ctx.beginPath();
                this.ctx.roundRect(14 * S, y, holeW, holeH, 4 * S);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.roundRect(w - 30 * S, y, holeW, holeH, 4 * S);
                this.ctx.fill();

                this.ctx.fillStyle = '#f59e0b';
                this.ctx.font = `700 ${11 * S}px "Space Grotesk", sans-serif`;
                const frameNum = Math.floor(y / holeSpacing) + 1;
                this.ctx.fillText(`KODAK 400 • ${frameNum}A`, 34 * S, y + 14 * S);
                this.ctx.fillStyle = '#FFFFFF';
            }
        }

        // 2. Postage Stamp Scalloped Border
        if (this.borderStyle === 'stamp') {
            const radius = 10 * S;
            const spacing = 24 * S;
            this.ctx.fillStyle = '#0b0f19';

            for (let x = spacing; x < w; x += spacing) {
                this.ctx.beginPath();
                this.ctx.arc(x, 0, radius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(x, h, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            for (let y = spacing; y < h; y += spacing) {
                this.ctx.beginPath();
                this.ctx.arc(0, y, radius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(w, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 3. Cyber Neon Electric Glow
        if (this.borderStyle === 'neon') {
            this.ctx.strokeStyle = '#00f2fe';
            this.ctx.shadowColor = '#00f2fe';
            this.ctx.shadowBlur = 15 * S;
            this.ctx.lineWidth = 4 * S;
            this.ctx.strokeRect(10 * S, 10 * S, w - 20 * S, h - 20 * S);

            this.ctx.strokeStyle = '#ff3366';
            this.ctx.shadowColor = '#ff3366';
            this.ctx.shadowBlur = 20 * S;
            this.ctx.lineWidth = 2 * S;
            this.ctx.strokeRect(18 * S, 18 * S, w - 36 * S, h - 36 * S);
        }

        // 4. Polka Dots
        if (this.borderStyle === 'dots') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            const dotRadius = 4 * S;
            const step = 20 * S;
            for (let x = step / 2; x < w; x += step) {
                for (let y = step / 2; y < h; y += step) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // 5. Dashed Stitching Outline
        if (this.borderStyle === 'stitch') {
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.lineWidth = 3 * S;
            this.ctx.setLineDash([8 * S, 6 * S]);
            this.ctx.strokeRect(12 * S, 12 * S, w - 24 * S, h - 24 * S);
        }

        this.ctx.restore();
    }

    drawPhotos(coords) {
        coords.forEach((coord, idx) => {
            this.ctx.save();
            const { x, y, w, h } = coord;
            const S = this.scaleFactor;

            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            if (this.cornerRadius > 0) {
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, w, h, this.cornerRadius * S);
                this.ctx.clip();
            }

            if (this.shots[idx]) {
                const img = this.shots[idx];
                const srcW = img.width || img.videoWidth || w;
                const srcH = img.height || img.videoHeight || h;
                const srcAspect = srcW / srcH;
                const dstAspect = w / h;

                let sx = 0, sy = 0, sw = srcW, sh = srcH;
                if (srcAspect > dstAspect) {
                    sw = srcH * dstAspect;
                    sx = (srcW - sw) / 2;
                } else {
                    sh = srcW / dstAspect;
                    sy = (srcH - sh) / 2;
                }

                this.ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
            } else {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
                this.ctx.fillRect(x, y, w, h);

                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
                this.ctx.lineWidth = 2 * S;
                this.ctx.setLineDash([6 * S, 6 * S]);
                this.ctx.strokeRect(x + 4 * S, y + 4 * S, w - 8 * S, h - 8 * S);

                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                this.ctx.font = `${20 * S}px "Outfit", sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(`📸 Shot #${idx + 1}`, x + (w / 2), y + (h / 2));
            }

            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
            this.ctx.lineWidth = 1 * S;
            this.ctx.setLineDash([]);
            this.ctx.strokeRect(x, y, w, h);

            this.ctx.restore();
        });
    }

    drawCaptions(w, h, headerHeight) {
        const S = this.scaleFactor;
        this.ctx.save();

        let textColor = '#1e293b';
        if (this.frameColor === '#121212' || this.frameColor === 'pattern-checker' || this.layout === 'film-roll' || this.borderStyle === 'film') {
            textColor = '#f8fafc';
        }

        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = 'center';

        if (this.layout !== 'polaroid' && this.headerText.trim() !== '') {
            this.ctx.font = `700 ${22 * S}px ${this.fontFamily}`;
            this.ctx.fillText(this.headerText.toUpperCase(), w / 2, headerHeight / 2 + 10 * S);
        }

        if (this.layout === 'polaroid') {
            const captionY = h - 65 * S;
            this.ctx.font = `700 ${28 * S}px ${this.fontFamily}`;
            this.ctx.fillText(this.headerText || 'SNAPBOOTH MEMORY', w / 2, captionY);

            if (this.includeDate) {
                const today = this.eventBranding.enabled && this.eventBranding.date
                    ? this.eventBranding.date
                    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                this.ctx.font = `400 ${16 * S}px ${this.fontFamily}`;
                this.ctx.fillText(today, w / 2, captionY + 30 * S);
            }
        } else {
            const footerY = h - 45 * S;
            this.ctx.font = `600 ${16 * S}px ${this.fontFamily}`;
            this.ctx.fillText(this.footerText, w / 2, footerY);

            if (this.includeDate) {
                const today = this.eventBranding.enabled && this.eventBranding.date
                    ? this.eventBranding.date
                    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                this.ctx.font = `400 ${13 * S}px 'Space Grotesk', sans-serif`;
                this.ctx.fillStyle = (textColor === '#f8fafc') ? '#94a3b8' : '#64748b';
                this.ctx.fillText(`• ${today} •`, w / 2, footerY + 22 * S);
            }
        }

        this.ctx.restore();
    }

    toHighResDataURL() {
        return this.canvas.toDataURL('image/png', 1.0);
    }
}

window.PhotoboothCanvasBuilder = PhotoboothCanvasBuilder;
