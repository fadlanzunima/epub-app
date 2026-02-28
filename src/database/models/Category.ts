export interface CategoryModel {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export class Category implements CategoryModel {
  id: string;
  name: string;
  color: string;
  sortOrder: number;

  constructor(data: Partial<CategoryModel> = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.color = data.color || '#6200EE';
    this.sortOrder = data.sortOrder || 0;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): CategoryModel {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      sortOrder: this.sortOrder,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: CategoryModel): Category {
    return new Category(json);
  }

  /**
   * Get default categories
   */
  static getDefaults(): Category[] {
    return [
      new Category({ id: '1', name: 'Fiction', color: '#E91E63', sortOrder: 0 }),
      new Category({ id: '2', name: 'Non-Fiction', color: '#2196F3', sortOrder: 1 }),
      new Category({ id: '3', name: 'Science', color: '#4CAF50', sortOrder: 2 }),
      new Category({ id: '4', name: 'History', color: '#FF9800', sortOrder: 3 }),
      new Category({ id: '5', name: 'Technology', color: '#9C27B0', sortOrder: 4 }),
    ];
  }
}

/**
 * Junction table for Book-Category many-to-many relationship
 */
export interface BookCategoryModel {
  bookId: string;
  categoryId: string;
}
