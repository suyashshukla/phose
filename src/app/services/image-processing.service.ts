import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  /**
   * Loads a File into an HTMLImageElement via an object URL.
   * The caller is responsible for calling URL.revokeObjectURL(url) when done.
   */
  async loadFileAsImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
    const url = URL.createObjectURL(file);
    const img = await this.loadImageFromUrl(url);
    return { img, url };
  }

  /** Loads an image from any URL into an HTMLImageElement. */
  loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load image: ${String(e)}`));
      img.src = url;
    });
  }

  /**
   * Draws an HTMLImageElement onto a canvas and returns it.
   * Useful for normalising image size before passing to face-api.
   */
  drawToCanvas(img: HTMLImageElement, maxSize = 640): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    let { width, height } = img;

    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
    return canvas;
  }
}
