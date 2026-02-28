import * as FileSystem from 'expo-file-system/legacy';
import {
  getDocumentsDirectory,
  getBooksDirectory,
  ensureBooksDirectory,
  copyFile,
  moveFile,
  deleteFile,
  getFileExtension,
  isSupportedFormat,
  fileExists,
  getFileInfo,
} from '../utils/fileHelpers';
import { BookFormat } from '../types';

/**
 * Service for file storage operations
 */
export class StorageService {
  /**
   * Get the app's documents directory path
   */
  static getDocumentsPath(): string {
    return getDocumentsDirectory();
  }

  /**
   * Get the books storage directory path
   */
  static getBooksPath(): string {
    return getBooksDirectory();
  }

  /**
   * Ensure books directory exists
   */
  static async initializeStorage(): Promise<void> {
    await ensureBooksDirectory();
  }

  /**
   * Import a book file into app storage
   */
  static async importBook(
    sourcePath: string,
    fileType: BookFormat,
  ): Promise<{ filePath: string; fileType: BookFormat }> {
    if (!isSupportedFormat(sourcePath)) {
      throw new Error('Unsupported file format');
    }

    const fileName = sourcePath.split('/').pop() || 'unknown';
    const destPath = `${getBooksDirectory()}/${Date.now()}_${fileName}`;

    await copyFile(sourcePath, destPath);

    return { filePath: destPath, fileType };
  }

  /**
   * Move a book file to a new location
   */
  static async moveBook(
    sourcePath: string,
    destinationPath: string,
  ): Promise<string> {
    return await moveFile(sourcePath, destinationPath);
  }

  /**
   * Delete a book file
   */
  static async deleteBook(filePath: string): Promise<void> {
    await deleteFile(filePath);
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    return await fileExists(filePath);
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    const info = await getFileInfo(filePath);
    return info.size || 0;
  }

  /**
   * Get storage usage information
   */
  static async getStorageUsage(): Promise<number> {
    try {
      const booksDir = getBooksDirectory();
      if (!booksDir) return 0;

      const dirInfo = await FileSystem.getInfoAsync(booksDir);
      if (!dirInfo.exists) return 0;

      // Calculate total size of all files in books directory
      const files = await FileSystem.readDirectoryAsync(booksDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${booksDir}/${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return 0;
    }
  }

  /**
   * Create a backup of all book files
   */
  static async createBackup(backupDir: string): Promise<string[]> {
    try {
      const booksDir = getBooksDirectory();
      if (!booksDir) throw new Error('Books directory not available');

      // Ensure backup directory exists
      const backupInfo = await FileSystem.getInfoAsync(backupDir);
      if (!backupInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      const files = await FileSystem.readDirectoryAsync(booksDir);
      const backedUpFiles: string[] = [];

      for (const file of files) {
        const sourcePath = `${booksDir}/${file}`;
        const destPath = `${backupDir}/${file}`;
        await copyFile(sourcePath, destPath);
        backedUpFiles.push(destPath);
      }

      return backedUpFiles;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFiles(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const tempDir = `${cacheDir}temp`;
      const dirInfo = await FileSystem.getInfoAsync(tempDir);

      if (dirInfo.exists) {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  /**
   * Get file MIME type based on extension
   */
  static getMimeType(filePath: string): string {
    const ext = getFileExtension(filePath);
    const mimeTypes: Record<string, string> = {
      epub: 'application/epub+zip',
      pdf: 'application/pdf',
      mobi: 'application/x-mobipocket-ebook',
      azw: 'application/vnd.amazon.ebook',
      azw3: 'application/vnd.amazon.ebook',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Read file as base64
   */
  static async readFileAsBase64(filePath: string): Promise<string> {
    const { readFileAsBase64 } = await import('../utils/fileHelpers');
    return await readFileAsBase64(filePath);
  }

  /**
   * Write base64 data to file
   */
  static async writeBase64ToFile(
    filePath: string,
    base64Data: string,
  ): Promise<void> {
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

export default StorageService;
