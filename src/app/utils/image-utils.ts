const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function isImageFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.has(extension);
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    imageElement.onload = () => resolve(imageElement);
    imageElement.onerror = (error) => reject(error);
    imageElement.src = url;
  });
}

export async function fileToImageElement(
  file: File,
): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    return { image, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
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
