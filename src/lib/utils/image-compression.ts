/**
 * Client-side image compression utility
 * Compresses images to stay under 1MB for team chat photos
 */

export interface CompressionOptions {
    maxSizeBytes?: number;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
}

export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<CompressionResult> {
    const {
        maxSizeBytes = 1024 * 1024, // 1MB
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Preserve original MIME type for PNG transparency
        const originalType = file.type;
        const isPng = originalType === 'image/png';
        const outputType = isPng ? 'image/png' : 'image/jpeg';

        if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
        }

        img.onload = () => {
            // Revoke the object URL to prevent memory leak
            URL.revokeObjectURL(img.src);
            // Calculate dimensions maintaining aspect ratio
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Try compression with decreasing quality until under size limit
            let currentQuality = quality;
            const tryCompress = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'));
                            return;
                        }

                        if (blob.size <= maxSizeBytes || currentQuality < 0.1) {
                            const compressed = new File([blob], file.name, {
                                type: outputType,
                            });
                            resolve({
                                file: compressed,
                                originalSize: file.size,
                                compressedSize: blob.size,
                            });
                        } else {
                            currentQuality -= 0.1;
                            tryCompress();
                        }
                    },
                    'image/jpeg',
                    currentQuality
                );
            };

            tryCompress();
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}
