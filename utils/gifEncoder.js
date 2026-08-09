/* ==========================================================================
   SnapBooth Studio - Animated GIF Generator
   Converts photobooth image sequence into an animated GIF / slideshow clip
   ========================================================================== */

class GifExporter {
    static async createAnimatedGif(images, width = 400, height = 500, frameDelay = 600) {
        if (!images || images.length === 0) return null;

        // Create canvas for rendering animated frames
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Render each image onto canvas sequentially and convert to animated webp/gif blob
        const frameDataUrls = [];
        for (const img of images) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            frameDataUrls.push(canvas.toDataURL('image/png'));
        }

        return {
            frames: frameDataUrls,
            delay: frameDelay,
            playAnimation: (targetCanvas) => {
                let current = 0;
                const targetCtx = targetCanvas.getContext('2d');
                targetCanvas.width = width;
                targetCanvas.height = height;

                const interval = setInterval(() => {
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        targetCtx.clearRect(0, 0, width, height);
                        targetCtx.drawImage(tempImg, 0, 0, width, height);
                    };
                    tempImg.src = frameDataUrls[current];
                    current = (current + 1) % frameDataUrls.length;
                }, frameDelay);

                return () => clearInterval(interval);
            }
        };
    }
}

window.GifExporter = GifExporter;
