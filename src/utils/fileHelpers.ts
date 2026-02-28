import * as FileSystem from 'expo-file-system/legacy';

// Supported file formats
export const SupportedFormats = [
  '.epub',
  '.pdf',
  '.mobi',
  '.azw',
  '.azw3',
] as const;

/**
 * Generate a unique filename with proper extension
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  return `${timestamp}_${randomString}.${extension}`;
};

/**
 * Get file extension from path
 */
export const getFileExtension = (filePath: string): string => {
  return filePath.split('.').pop()?.toLowerCase() || '';
};

/**
 * Validate if file format is supported
 */
export const isSupportedFormat = (filePath: string): boolean => {
  const ext = getFileExtension(filePath);
  return SupportedFormats.some(format => format.slice(1) === ext);
};

/**
 * Copy file to destination
 */
export const copyFile = async (
  sourcePath: string,
  destinationPath: string,
): Promise<string> => {
  try {
    await FileSystem.copyAsync({ from: sourcePath, to: destinationPath });
    return destinationPath;
  } catch (error) {
    console.error('Error copying file:', error);
    throw new Error('Failed to copy file');
  }
};

/**
 * Move file to destination
 */
export const moveFile = async (
  sourcePath: string,
  destinationPath: string,
): Promise<string> => {
  try {
    await FileSystem.moveAsync({ from: sourcePath, to: destinationPath });
    return destinationPath;
  } catch (error) {
    console.error('Error moving file:', error);
    throw new Error('Failed to move file');
  }
};

/**
 * Delete file
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Read file as base64
 */
export const readFileAsBase64 = async (filePath: string): Promise<string> => {
  try {
    return await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file');
  }
};

/**
 * Get app's documents directory
 */
export const getDocumentsDirectory = (): string => {
  return FileSystem.documentDirectory || '';
};

/**
 * Get books directory path
 */
export const getBooksDirectory = (): string => {
  const docDir = FileSystem.documentDirectory;
  return docDir ? `${docDir}books` : '';
};

/**
 * Ensure books directory exists
 */
export const ensureBooksDirectory = async (): Promise<void> => {
  const booksDir = getBooksDirectory();
  if (!booksDir) return;
  const dirInfo = await FileSystem.getInfoAsync(booksDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(booksDir, { intermediates: true });
  }
};

/**
 * Get file info
 */
export const getFileInfo = async (filePath: string): Promise<any> => {
  return await FileSystem.getInfoAsync(filePath);
};

/**
 * Check if file exists
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  return fileInfo.exists;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
