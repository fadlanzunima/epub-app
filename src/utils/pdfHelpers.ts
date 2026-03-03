/**
 * PDF parsing utilities
 */

import * as FileSystem from 'expo-file-system/legacy';

export interface PdfMetadata {
  title: string;
  author: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Extract metadata from PDF file by parsing the PDF header and info dictionary
 * This is a basic implementation that reads the PDF structure
 */
export const extractPdfMetadata = async (
  filePath: string,
  fallbackTitle?: string,
): Promise<PdfMetadata> => {
  try {
    console.log(
      '📄 pdfHelpers: Extracting metadata from:',
      filePath.substring(0, 50) + '...',
      'fallback:',
      fallbackTitle,
    );

    // Read first 100KB of the file which typically contains metadata
    // Using readAsStringAsync without length limit can cause issues with binary PDFs
    const fileContent = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
      length: 100 * 1024, // Read only first 100KB
      position: 0,
    }).catch(err => {
      console.log('📄 pdfHelpers: Error reading file:', err);
      return null;
    });

    console.log(
      '📄 pdfHelpers: File content length:',
      fileContent ? fileContent.length : 0,
    );

    if (!fileContent) {
      console.log(
        '📄 pdfHelpers: No file content read, using fallback:',
        fallbackTitle,
      );
      return {
        title: fallbackTitle || 'Unknown Title',
        author: 'Unknown Author',
        pageCount: 0,
      };
    }

    // Extract page count from /Type /Pages /Count X
    const pageCountMatch = fileContent.match(
      /\/Type\s*\/Pages[^/]*\/Count\s*(\d+)/i,
    );
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 0;
    console.log('📄 pdfHelpers: Page count found:', pageCount);

    // Extract title from /Title (xxx)
    const titleMatch = fileContent.match(/\/Title\s*\(([^)]+)\)/i);
    console.log(
      '📄 pdfHelpers: Title match:',
      titleMatch ? titleMatch[1] : 'not found',
    );
    const title = titleMatch ? decodePdfString(titleMatch[1]) : '';

    // Extract author from /Author (xxx)
    const authorMatch = fileContent.match(/\/Author\s*\(([^)]+)\)/i);
    const author = authorMatch ? decodePdfString(authorMatch[1]) : '';

    // Extract subject from /Subject (xxx)
    const subjectMatch = fileContent.match(/\/Subject\s*\(([^)]+)\)/i);
    const subject = subjectMatch ? decodePdfString(subjectMatch[1]) : undefined;

    // Extract creator from /Creator (xxx)
    const creatorMatch = fileContent.match(/\/Creator\s*\(([^)]+)\)/i);
    const creator = creatorMatch ? decodePdfString(creatorMatch[1]) : undefined;

    // Extract producer from /Producer (xxx)
    const producerMatch = fileContent.match(/\/Producer\s*\(([^)]+)\)/i);
    const producer = producerMatch
      ? decodePdfString(producerMatch[1])
      : undefined;

    const result = {
      title: title || fallbackTitle || 'Unknown Title',
      author: author || 'Unknown Author',
      subject,
      creator,
      producer,
      pageCount,
    };
    console.log('📄 pdfHelpers: Extracted metadata:', result);
    return result;
  } catch (error) {
    console.error('📄 pdfHelpers: Error extracting PDF metadata:', error);
    return {
      title: 'Unknown Title',
      author: 'Unknown Author',
      pageCount: 0,
    };
  }
};

/**
 * Decode PDF string (handle escaped characters)
 */
function decodePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Get page count from PDF by reading the PDF structure
 */
export const getPdfPageCount = async (filePath: string): Promise<number> => {
  try {
    const fileContent = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    }).catch(() => null);

    if (!fileContent) {
      return 0;
    }

    // Try multiple patterns to find page count
    const patterns = [
      /\/Type\s*\/Pages[^/]*\/Count\s*(\d+)/i,
      /\/Count\s*(\d+)[^/]*\/Type\s*\/Pages/i,
      /\/N\s*(\d+)\s*\/Type\s*\/Pages/i,
    ];

    for (const pattern of patterns) {
      const match = fileContent.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    return 0;
  }
};

/**
 * Get page information (placeholder - would need PDF rendering library for accurate dimensions)
 */
export const getPdfPageInfo = async (
  filePath: string,
  pageNumber: number,
): Promise<PdfPageInfo | null> => {
  // Without a proper PDF library, we can't get accurate page dimensions
  // This would require react-native-pdf or similar
  return {
    pageNumber,
    width: 612, // Standard US Letter width in points
    height: 792, // Standard US Letter height in points
  };
};

/**
 * Generate thumbnail for PDF page
 * Note: This requires a PDF rendering library to be implemented properly
 */
export const generatePdfThumbnail = async (
  _filePath: string,
  _pageNumber: number,
  _width: number = 200,
): Promise<string | null> => {
  // TODO: Implement using react-native-pdf or similar library
  // This would require native PDF rendering capabilities
  console.warn(
    'generatePdfThumbnail: Not implemented without PDF rendering library',
  );
  return null;
};

/**
 * Extract text from PDF page
 * Note: This requires a PDF text extraction library
 */
export const extractPdfText = async (
  _filePath: string,
  _pageNumber?: number,
): Promise<string> => {
  // TODO: Implement using pdf-text-extract or similar library
  // This would require native PDF parsing capabilities
  console.warn(
    'extractPdfText: Not implemented without PDF text extraction library',
  );
  return '';
};

/**
 * Search text in PDF
 * Note: This requires a PDF text extraction library
 */
export const searchPdfText = async (
  _filePath: string,
  _query: string,
): Promise<Array<{ page: number; text: string; rect: any }>> => {
  // TODO: Implement using pdf-text-extract or similar library
  console.warn(
    'searchPdfText: Not implemented without PDF text extraction library',
  );
  return [];
};

/**
 * Check if file is valid PDF by checking file signature
 */
export const isValidPdf = async (filePath: string): Promise<boolean> => {
  try {
    // Check file extension first
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return false;
    }

    // Read first few bytes to check PDF signature
    const header = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    }).catch(() => '');

    // PDF files should start with %PDF
    return header.startsWith('%PDF');
  } catch (error) {
    console.error('Error validating PDF:', error);
    return false;
  }
};

/**
 * Get table of contents from PDF bookmarks
 * Note: This requires a PDF library with bookmark support
 */
export const extractPdfBookmarks = async (
  _filePath: string,
): Promise<Array<{ title: string; page: number; level: number }>> => {
  // TODO: Implement using pdf-bookmark library or similar
  console.warn(
    'extractPdfBookmarks: Not implemented without PDF bookmark library',
  );
  return [];
};
