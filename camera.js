/* ==========================================================================
   SnapBooth Studio - Camera Engine
   Webcam feed manager, live preview filter pipeline, countdown sequence, 
   virtual live demo feed, manual power toggle, mobile camera pipeline & snapshot burst
   ========================================================================== */

class CameraEngine {
    constructor() {
        this.videoElement = document.getElementById('webcam-video');
        this.filterCanvas = document.getElementById('live-filter-canvas');
        this.filterCtx = this.filterCanvas.getContext('2d');
        this.fallbackElement = document.getElementById('camera-fallback');
        this.statusText = document.getElementById('camera-status-text');
        this.statusDot = document.querySelector('.status-dot');

        this.currentStream = null;
        this.facingMode = 'user'; // 'user' or 'environment'
        this.activeFilter = 'normal';
        this.isCapturing = false;
        this.isDemoMode = false;
        this.animFrameId = null;
        this.demoAngle = 0;

        // Ensure video element has mobile iOS/Android attributes
        if (this.videoElement) {
            this.videoElement.setAttribute('playsinline', 'true');
            this.videoElement.setAttribute('webkit-playsinline', 'true');
            this.videoElement.setAttribute('muted', 'true');
            this.videoElement.muted = true;
        }

        // Attempt camera initialization on startup
        this.initCamera();
    }

    // Clean, universal mobile-compatible camera stream accessor
    async getMediaStream() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (navigator.getUserMedia) {
                return new Promise((resolve, reject) => {
                    navigator.getUserMedia({ video: true }, resolve, reject);
                });
            }
            if (navigator.webkitGetUserMedia) {
                return new Promise((resolve, reject) => {
                    navigator.webkitGetUserMedia({ video: true }, resolve, reject);
                });
            }
            throw new Error('MediaDevicesNotSupported');
        }

        // Simplest, most reliable mobile constraints
        const constraintTiers = [
            { video: true },
            { video: { facingMode: this.facingMode } },
            { video: { facingMode: 'user' } },
            { video: { facingMode: 'environment' } }
        ];

        let lastError = null;
        for (const constraints of constraintTiers) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Mobile camera stream acquired:', constraints);
                return stream;
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    }

    async initCamera() {
        this.isDemoMode = false;
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }

        const fallbackText = document.getElementById('fallback-status-text');

        try {
            const stream = await this.getMediaStream();
            this.currentStream = stream;
            this.videoElement.srcObject = stream;

            // Hide fallback overlay when camera stream is live
            this.fallbackElement.classList.add('hidden');
            this.fallbackElement.style.display = 'none';
            this.setCameraState('READY');
            this.updatePowerBtnState(true);

            // Handle mobile video play user interaction requirements
            const playPromise = this.videoElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    const unlockVideo = () => {
                        this.videoElement.play();
                        document.removeEventListener('click', unlockVideo);
                        document.removeEventListener('touchstart', unlockVideo);
                    };
                    document.addEventListener('click', unlockVideo, { once: true });
                    document.addEventListener('touchstart', unlockVideo, { once: true });
                });
            }

            this.videoElement.onloadedmetadata = () => {
                this.filterCanvas.width = this.videoElement.videoWidth || 640;
                this.filterCanvas.height = this.videoElement.videoHeight || 480;
            };

            this.renderLiveFilters();

        } catch (err) {
            console.warn('Camera access error on phone/desktop:', err);
            this.fallbackElement.classList.remove('hidden');
            this.fallbackElement.style.display = 'flex';
            this.updatePowerBtnState(false);

            if (fallbackText) {
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    this.setCameraState('BLOCKED');
                    fallbackText.innerHTML = `<strong>Camera Permission Blocked:</strong><br><span style="font-size: 0.85rem;">Tap the 🔒 <strong>Lock icon</strong> in your browser bar at the top → <strong>Permissions</strong> → <strong>Allow Camera</strong>, then tap "Turn On Camera"!</span>`;
                } else {
                    this.setCameraState('OFF');
                    fallbackText.textContent = 'Camera is offline. Tap "Turn On Camera" to grant access or try Virtual Demo Stream below!';
                }
            }
        }
    }

    setCameraState(stateName) {
        if (!this.statusText) return;
        switch (stateName) {
            case 'READY':
                this.statusText.textContent = 'Camera Ready';
                if (this.statusDot) this.statusDot.style.background = '#10b981';
                break;
            case 'COUNTDOWN':
                this.statusText.textContent = 'Countdown...';
                if (this.statusDot) this.statusDot.style.background = '#f59e0b';
                break;
            case 'CAPTURING':
                this.statusText.textContent = 'Capturing Photo...';
                if (this.statusDot) this.statusDot.style.background = '#ec4899';
                break;
            case 'CAPTURED':
                this.statusText.textContent = 'Photo Captured!';
                if (this.statusDot) this.statusDot.style.background = '#3b82f6';
                break;
            case 'BLOCKED':
                this.statusText.textContent = 'Camera Access Blocked';
                if (this.statusDot) this.statusDot.style.background = '#f97316';
                break;
            case 'OFF':
            default:
                this.statusText.textContent = 'Camera Off';
                if (this.statusDot) this.statusDot.style.background = '#ef4444';
                break;
        }
    }

    toggleCameraPower() {
        if ((this.currentStream && this.currentStream.active) || this.isDemoMode) {
            this.stopCamera();
        } else {
            this.initCamera();
        }
    }

    stopCamera() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        this.isDemoMode = false;

        if (this.fallbackElement) {
            this.fallbackElement.classList.remove('hidden');
            this.fallbackElement.style.display = 'flex';
        }

        const fallbackText = document.getElementById('fallback-status-text');
        if (fallbackText) {
            fallbackText.textContent = 'Camera is powered off. Tap "Turn On Camera" to start!';
        }

        if (this.statusText) this.statusText.textContent = 'Camera Off';
        if (this.statusDot) this.statusDot.style.background = '#ef4444';

        this.updatePowerBtnState(false);
    }

    updatePowerBtnState(isOn) {
        const miniPowerBtn = document.getElementById('btn-toggle-camera-power');
        const headerPowerBtn = document.getElementById('btn-enable-cam');
        const headerBtnText = document.getElementById('btn-enable-cam-text');

        if (miniPowerBtn) {
            if (isOn) {
                miniPowerBtn.className = 'icon-btn active-power';
                miniPowerBtn.title = 'Turn Camera Off';
            } else {
                miniPowerBtn.className = 'icon-btn power-off';
                miniPowerBtn.title = 'Turn Camera On';
            }
        }

        if (headerPowerBtn) {
            if (isOn) {
                headerPowerBtn.className = 'btn btn-secondary btn-sm active-power';
                if (headerBtnText) headerBtnText.textContent = 'Camera On';
            } else {
                headerPowerBtn.className = 'btn btn-primary btn-sm power-off';
                if (headerBtnText) headerBtnText.textContent = 'Turn On Camera';
            }
        }
    }

    // Launch virtual simulated live selfie camera feed
    startVirtualDemoFeed() {
        this.isDemoMode = true;
        this.fallbackElement.classList.add('hidden');
        this.fallbackElement.style.display = 'none';
        this.statusText.textContent = 'Virtual Demo Stream Live';
        if (this.statusDot) this.statusDot.style.background = '#3b82f6';
        this.updatePowerBtnState(true);

        this.filterCanvas.width = 640;
        this.filterCanvas.height = 480;

        const loop = () => {
            if (!this.isDemoMode) return;

            const w = this.filterCanvas.width;
            const h = this.filterCanvas.height;

            this.filterCtx.save();

            const bgGrad = this.filterCtx.createLinearGradient(0, 0, w, h);
            bgGrad.addColorStop(0, '#1e1b4b');
            bgGrad.addColorStop(0.5, '#312e81');
            bgGrad.addColorStop(1, '#4338ca');
            this.filterCtx.fillStyle = bgGrad;
            this.filterCtx.fillRect(0, 0, w, h);

            this.demoAngle += 0.03;
            const headOffset = Math.sin(this.demoAngle) * 12;

            // Character Body & Head
            this.filterCtx.fillStyle = '#ff3366';
            this.filterCtx.beginPath();
            this.filterCtx.ellipse(w / 2, h + 20, 140, 180, 0, 0, Math.PI * 2);
            this.filterCtx.fill();

            this.filterCtx.fillStyle = '#fde047';
            this.filterCtx.beginPath();
            this.filterCtx.arc(w / 2 + headOffset, h / 2 - 20, 90, 0, Math.PI * 2);
            this.filterCtx.fill();

            // Eyes & Glasses
            this.filterCtx.fillStyle = '#09090b';
            this.filterCtx.beginPath();
            this.filterCtx.arc(w / 2 - 35 + headOffset, h / 2 - 30, 16, 0, Math.PI * 2);
            this.filterCtx.arc(w / 2 + 35 + headOffset, h / 2 - 30, 16, 0, Math.PI * 2);
            this.filterCtx.fill();

            this.filterCtx.strokeStyle = '#09090b';
            this.filterCtx.lineWidth = 6;
            this.filterCtx.beginPath();
            this.filterCtx.moveTo(w / 2 - 35 + headOffset, h / 2 - 30);
            this.filterCtx.lineTo(w / 2 + 35 + headOffset, h / 2 - 30);
            this.filterCtx.stroke();

            // Smile
            this.filterCtx.strokeStyle = '#09090b';
            this.filterCtx.lineWidth = 5;
            this.filterCtx.beginPath();
            this.filterCtx.arc(w / 2 + headOffset, h / 2 + 5, 30, 0.2, Math.PI - 0.2);
            this.filterCtx.stroke();

            // Cheeks
            this.filterCtx.fillStyle = '#f43f5e';
            this.filterCtx.beginPath();
            this.filterCtx.arc(w / 2 - 50 + headOffset, h / 2, 14, 0, Math.PI * 2);
            this.filterCtx.arc(w / 2 + 50 + headOffset, h / 2, 14, 0, Math.PI * 2);
            this.filterCtx.fill();

            // Floating Sparkles
            this.filterCtx.fillStyle = '#fef08a';
            this.filterCtx.font = '24px sans-serif';
            this.filterCtx.fillText('✨', 100 + Math.cos(this.demoAngle) * 20, 120);
            this.filterCtx.fillText('💖', 480 + Math.sin(this.demoAngle) * 20, 140);
            this.filterCtx.fillText('⭐', 520, 320 + Math.cos(this.demoAngle) * 15);

            this.filterCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.filterCtx.font = '600 14px "Outfit", sans-serif';
            this.filterCtx.fillText('VIRTUAL CAMERA STREAM LIVE', 20, h - 20);

            this.filterCtx.restore();

            this.applyFilterEffect(this.filterCtx, w, h, this.activeFilter);

            this.animFrameId = requestAnimationFrame(loop);
        };

        loop();
    }

    switchCamera() {
        this.facingMode = (this.facingMode === 'user') ? 'environment' : 'user';
        this.initCamera();
    }

    setFilter(filterName) {
        this.activeFilter = filterName;

        if (this.videoElement) {
            this.videoElement.className = `filter-${filterName}`;
        }
    }

    renderLiveFilters() {
        if (this.isDemoMode) return;

        if (!this.videoElement || this.videoElement.paused || this.videoElement.ended) {
            this.animFrameId = requestAnimationFrame(() => this.renderLiveFilters());
            return;
        }

        const width = this.filterCanvas.width;
        const height = this.filterCanvas.height;

        this.filterCtx.save();
        if (this.facingMode === 'user') {
            this.filterCtx.translate(width, 0);
            this.filterCtx.scale(-1, 1);
        }

        this.filterCtx.drawImage(this.videoElement, 0, 0, width, height);
        this.filterCtx.restore();

        this.applyFilterEffect(this.filterCtx, width, height, this.activeFilter);

        this.animFrameId = requestAnimationFrame(() => this.renderLiveFilters());
    }

    applyFilterEffect(ctx, width, height, filterName) {
        switch (filterName) {
            case 'vintage':
                ctx.fillStyle = 'rgba(255, 180, 50, 0.12)';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(100, 40, 0, 0.08)';
                ctx.globalCompositeOperation = 'color-burn';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
                break;

            case 'bw':
                const imgData = ctx.getImageData(0, 0, width, height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11);
                    const factor = 1.2;
                    const val = Math.min(255, Math.max(0, (avg - 128) * factor + 128));
                    data[i] = val; data[i + 1] = val; data[i + 2] = val;
                }
                ctx.putImageData(imgData, 0, 0);
                break;

            case 'sepia':
                const sepiaData = ctx.getImageData(0, 0, width, height);
                const d = sepiaData.data;
                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i], g = d[i + 1], b = d[i + 2];
                    d[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    d[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    d[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
                ctx.putImageData(sepiaData, 0, 0);
                break;

            case 'cyber':
                ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(255, 51, 102, 0.12)';
                ctx.globalCompositeOperation = 'screen';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
                break;

            case 'golden':
                ctx.fillStyle = 'rgba(255, 170, 0, 0.18)';
                ctx.fillRect(0, 0, width, height);
                break;

            case 'pastel':
                ctx.fillStyle = 'rgba(244, 114, 182, 0.08)';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
                ctx.globalCompositeOperation = 'screen';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
                break;

            default:
                break;
        }
    }

    triggerFlash() {
        const flashEl = document.getElementById('shutter-flash');
        if (!flashEl) return;
        flashEl.classList.add('flash-active');
        setTimeout(() => {
            flashEl.classList.remove('flash-active');
        }, 120);
    }

    captureFrame() {
        this.triggerFlash();
        if (window.soundSynth) {
            window.soundSynth.playShutterSound();
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.filterCanvas.width || 640;
        tempCanvas.height = this.filterCanvas.height || 480;
        const tempCtx = tempCanvas.getContext('2d');

        // Enable high-quality image smoothing for sharp captures
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';

        if (this.isDemoMode) {
            tempCtx.drawImage(this.filterCanvas, 0, 0);
        } else {
            tempCtx.drawImage(this.filterCanvas, 0, 0);
        }

        return tempCanvas;
    }

    async startBurstSequence(totalShots = 4, delaySeconds = 3, onShotCaptured, onComplete) {
        if (this.isCapturing) return;
        this.isCapturing = true;

        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownNumber = document.getElementById('countdown-number');
        const progressOverlay = document.getElementById('shot-progress-overlay');
        const progressText = document.getElementById('shot-progress-text');
        const dotsContainer = document.getElementById('shot-dots');

        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalShots; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dotsContainer.appendChild(dot);
        }

        progressOverlay.classList.remove('hidden');
        countdownOverlay.classList.remove('hidden');

        const capturedCanvases = [];

        for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
            this.setCameraState('COUNTDOWN');
            progressText.textContent = `Photo ${shotIndex + 1} of ${totalShots}`;
            
            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach((d, idx) => {
                if (idx <= shotIndex) d.classList.add('filled');
            });

            for (let sec = delaySeconds; sec > 0; sec--) {
                countdownNumber.textContent = sec;
                if (window.soundSynth) window.soundSynth.playBeep(700, 0.08);
                await new Promise(res => setTimeout(res, 1000));
            }

            this.setCameraState('CAPTURING');
            if (window.soundSynth) window.soundSynth.playSnapBeep();
            countdownNumber.textContent = '📸';
            await new Promise(res => setTimeout(res, 200));

            const shotCanvas = this.captureFrame();
            capturedCanvases.push(shotCanvas);

            if (onShotCaptured) {
                onShotCaptured(shotCanvas, shotIndex);
            }

            await new Promise(res => setTimeout(res, 500));
        }

        countdownOverlay.classList.add('hidden');
        progressOverlay.classList.add('hidden');
        this.isCapturing = false;
        this.setCameraState('CAPTURED');

        if (onComplete) {
            onComplete(capturedCanvases);
        }
    }
}

window.CameraEngine = CameraEngine;
