const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function isImageFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

export async function fileToImageElement(
  file: File,
): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return { img, url };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Draw a canvas frame to a Blob, then wrap it as a File. */
export function canvasToFile(canvas: HTMLCanvasElement, fileName = 'capture.jpg'): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.95,
    );
  });
}
