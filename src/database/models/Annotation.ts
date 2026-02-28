export interface AnnotationModel {
  id: string;
  bookId: string;
  cfi: string;
  text: string; // highlighted text
  note?: string; // user note
  color: string;
  createdAt: Date;
}

export class Annotation implements AnnotationModel {
  id: string;
  bookId: string;
  cfi: string;
  text: string;
  note?: string;
  color: string;
  createdAt: Date;

  constructor(data: Partial<AnnotationModel> = {}) {
    this.id = data.id || '';
    this.bookId = data.bookId || '';
    this.cfi = data.cfi || '';
    this.text = data.text || '';
    this.note = data.note;
    this.color = data.color || '#FFEB3B'; // Default yellow
    this.createdAt = data.createdAt || new Date();
  }

  /**
   * Check if this annotation has a note
   */
  get hasNote(): boolean {
    return !!this.note && this.note.trim().length > 0;
  }

  /**
   * Get preview text (truncated)
   */
  get previewText(): string {
    if (this.text.length <= 100) {
      return this.text;
    }
    return this.text.substring(0, 100) + '...';
  }

  /**
   * Serialize to JSON
   */
  toJSON(): AnnotationModel {
    return {
      id: this.id,
      bookId: this.bookId,
      cfi: this.cfi,
      text: this.text,
      note: this.note,
      color: this.color,
      createdAt: this.createdAt,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: AnnotationModel): Annotation {
    return new Annotation(json);
  }

  /**
   * Create a new annotation
   */
  static create(
    bookId: string,
    cfi: string,
    text: string,
    color: string = '#FFEB3B',
    note?: string
  ): Annotation {
    return new Annotation({
      id: generateAnnotationId(),
      bookId,
      cfi,
      text,
      color,
      note,
      createdAt: new Date(),
    });
  }
}

/**
 * Generate unique annotation ID
 */
function generateAnnotationId(): string {
  return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
