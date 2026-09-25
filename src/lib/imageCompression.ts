/**
 * Client-side high-performance image compression utility using HTML5 Canvas.
 * Automatically resizes and converts large photos (e.g. 5MB down to ~30-50KB)
 * into optimized WebP/JPEG before uploading to Supabase Storage.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  previewUrl: string;
}

export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.82,
    mimeType = 'image/webp'
  } = options;

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no compatible o archivo corrupto.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del Canvas.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const deliverResult = (blob: Blob, actualMime: string) => {
          const extension = actualMime === 'image/webp' ? 'webp' : 'jpg';
          const originalName = (file as File).name || 'logo';
          const cleanName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
          const fileName = `${cleanName.replace(/[^a-zA-Z0-9_-]/g, '_')}_opt.${extension}`;

          const compressedFile = new File([blob], fileName, {
            type: actualMime,
            lastModified: Date.now()
          });

          const savingsPercent = originalSize > 0 
            ? Math.max(0, Math.round(((originalSize - blob.size) / originalSize) * 100))
            : 0;

          const previewUrl = URL.createObjectURL(blob);

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: blob.size,
            savingsPercent,
            previewUrl
          });
        };

        // Try preferred MIME format (WebP by default for modern browsers)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to JPEG if WebP encoding is unsupported
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) {
                    reject(new Error('No se pudo generar el archivo comprimido.'));
                    return;
                  }
                  deliverResult(fallbackBlob, 'image/jpeg');
                },
                'image/jpeg',
                quality
              );
              return;
            }
            deliverResult(blob, mimeType);
          },
          mimeType,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
