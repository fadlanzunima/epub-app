export interface BookModel {
  id: string;
  title: string;
  author: string;
  description: string;
  filePath: string;
  fileType: 'epub' | 'pdf' | 'mobi' | 'azw' | 'azw3';
  coverImage?: string;
  addedAt: Date;
  lastReadAt?: Date;
  totalPages: number;
  currentPage: number;
  currentCfi?: string; // EPUB location
  readingTime: number; // minutes
  isFavorite: boolean;
}

export class Book implements BookModel {
  id: string;
  title: string;
  author: string;
  description: string;
  filePath: string;
  fileType: 'epub' | 'pdf' | 'mobi' | 'azw' | 'azw3';
  coverImage?: string;
  addedAt: Date;
  lastReadAt?: Date;
  totalPages: number;
  currentPage: number;
  currentCfi?: string;
  readingTime: number;
  isFavorite: boolean;

  constructor(data: Partial<BookModel> = {}) {
    this.id = data.id || '';
    this.title = data.title || 'Unknown Title';
    this.author = data.author || 'Unknown Author';
    this.description = data.description || '';
    this.filePath = data.filePath || '';
    this.fileType = data.fileType || 'epub';
    this.coverImage = data.coverImage;
    this.addedAt = data.addedAt || new Date();
    this.lastReadAt = data.lastReadAt;
    this.totalPages = data.totalPages || 0;
    this.currentPage = data.currentPage || 0;
    this.currentCfi = data.currentCfi;
    this.readingTime = data.readingTime || 0;
    this.isFavorite = data.isFavorite || false;
  }

  /**
   * Calculate reading progress percentage
   */
  get progress(): number {
    if (this.totalPages === 0) return 0;
    return Math.round((this.currentPage / this.totalPages) * 100);
  }

  /**
   * Check if book is currently being read
   */
  get isReading(): boolean {
    return this.currentPage > 0 && this.currentPage < this.totalPages;
  }

  /**
   * Check if book is completed
   */
  get isCompleted(): boolean {
    return this.totalPages > 0 && this.currentPage >= this.totalPages;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): BookModel {
    return {
      id: this.id,
      title: this.title,
      author: this.author,
      description: this.description,
      filePath: this.filePath,
      fileType: this.fileType,
      coverImage: this.coverImage,
      addedAt: this.addedAt,
      lastReadAt: this.lastReadAt,
      totalPages: this.totalPages,
      currentPage: this.currentPage,
      currentCfi: this.currentCfi,
      readingTime: this.readingTime,
      isFavorite: this.isFavorite,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: BookModel): Book {
    return new Book(json);
  }
}
