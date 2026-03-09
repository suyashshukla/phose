import { Injectable } from '@angular/core';
import { isImageFile } from '../utils/image-utils';

@Injectable({ providedIn: 'root' })
export class FileSystemService {
  /** Open the native directory picker and return the chosen handle. */
  async pickDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error(
        'File System Access API is not supported in this browser. Please use Chrome or Edge.',
      );
    }
    return (window as Window & typeof globalThis & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
  }

  /**
   * Recursively collects all supported image files from a directory handle.
   * Calls onProgress with the running count as files are discovered.
   */
  async collectImageFiles(
    directoryHandle: FileSystemDirectoryHandle,
    onProgress?: (count: number) => void,
  ): Promise<File[]> {
    const files: File[] = [];
    await this.walk(directoryHandle, files, onProgress ?? (() => undefined));
    return files;
  }

  private async walk(
    directory: FileSystemDirectoryHandle,
    collectedFiles: File[],
    onProgress: (count: number) => void,
  ): Promise<void> {
    for await (const entry of directory.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        if (isImageFile(file)) {
          collectedFiles.push(file);
          onProgress(collectedFiles.length);
        }
      } else if (entry.kind === 'directory') {
        await this.walk(entry as FileSystemDirectoryHandle, collectedFiles, onProgress);
      }
    }
  }
}
