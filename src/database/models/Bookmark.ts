export interface BookmarkModel {
  id: string;
  bookId: string;
  cfi?: string; // EPUB location
  page?: number; // PDF page number
  createdAt: Date;
  note?: string;
}

export class Bookmark implements BookmarkModel {
  id: string;
  bookId: string;
  cfi?: string;
  page?: number;
  createdAt: Date;
  note?: string;

  constructor(data: Partial<BookmarkModel> = {}) {
    this.id = data.id || '';
    this.bookId = data.bookId || '';
    this.cfi = data.cfi;
    this.page = data.page;
    this.createdAt = data.createdAt || new Date();
    this.note = data.note;
  }

  /**
   * Get location string for display
   */
  get location(): string {
    if (this.cfi) {
      return `Location: ${this.cfi}`;
    }
    if (this.page) {
      return `Page ${this.page}`;
    }
    return 'Unknown location';
  }

  /**
   * Serialize to JSON
   */
  toJSON(): BookmarkModel {
    return {
      id: this.id,
      bookId: this.bookId,
      cfi: this.cfi,
      page: this.page,
      createdAt: this.createdAt,
      note: this.note,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: BookmarkModel): Bookmark {
    return new Bookmark(json);
  }

  /**
   * Create a new bookmark for EPUB
   */
  static createForEpub(bookId: string, cfi: string, note?: string): Bookmark {
    return new Bookmark({
      id: generateBookmarkId(),
      bookId,
      cfi,
      note,
      createdAt: new Date(),
    });
  }

  /**
   * Create a new bookmark for PDF
   */
  static createForPdf(bookId: string, page: number, note?: string): Bookmark {
    return new Bookmark({
      id: generateBookmarkId(),
      bookId,
      page,
      note,
      createdAt: new Date(),
    });
  }
}

/**
 * Generate unique bookmark ID
 */
function generateBookmarkId(): string {
  return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
