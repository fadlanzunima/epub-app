export interface ReadingProgressModel {
  id: string;
  bookId: string;
  date: Date;
  pagesRead: number;
  timeSpent: number; // minutes
}

export class ReadingProgress implements ReadingProgressModel {
  id: string;
  bookId: string;
  date: Date;
  pagesRead: number;
  timeSpent: number;

  constructor(data: Partial<ReadingProgressModel> = {}) {
    this.id = data.id || '';
    this.bookId = data.bookId || '';
    this.date = data.date || new Date();
    this.pagesRead = data.pagesRead || 0;
    this.timeSpent = data.timeSpent || 0;
  }

  /**
   * Get formatted date string
   */
  get formattedDate(): string {
    return this.date.toISOString().split('T')[0];
  }

  /**
   * Serialize to JSON
   */
  toJSON(): ReadingProgressModel {
    return {
      id: this.id,
      bookId: this.bookId,
      date: this.date,
      pagesRead: this.pagesRead,
      timeSpent: this.timeSpent,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: ReadingProgressModel): ReadingProgress {
    return new ReadingProgress(json);
  }

  /**
   * Create a new reading progress entry
   */
  static create(bookId: string, pagesRead: number, timeSpent: number, date?: Date): ReadingProgress {
    return new ReadingProgress({
      id: generateProgressId(),
      bookId,
      date: date || new Date(),
      pagesRead,
      timeSpent,
    });
  }

  /**
   * Aggregate progress by date
   */
  static aggregateByDate(progressList: ReadingProgress[]): Map<string, { pagesRead: number; timeSpent: number }> {
    const aggregated = new Map<string, { pagesRead: number; timeSpent: number }>();

    progressList.forEach(progress => {
      const dateKey = progress.formattedDate;
      const existing = aggregated.get(dateKey);

      if (existing) {
        existing.pagesRead += progress.pagesRead;
        existing.timeSpent += progress.timeSpent;
      } else {
        aggregated.set(dateKey, {
          pagesRead: progress.pagesRead,
          timeSpent: progress.timeSpent,
        });
      }
    });

    return aggregated;
  }

  /**
   * Calculate total stats
   */
  static calculateTotals(progressList: ReadingProgress[]): { totalPages: number; totalTime: number } {
    return progressList.reduce(
      (acc, progress) => ({
        totalPages: acc.totalPages + progress.pagesRead,
        totalTime: acc.totalTime + progress.timeSpent,
      }),
      { totalPages: 0, totalTime: 0 }
    );
  }
}

/**
 * Generate unique progress ID
 */
function generateProgressId(): string {
  return `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
