export interface CMSBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'section';
  level?: number; // pour les headings (1-6)
  text?: string;
  items?: string[]; // pour les listes
  content?: CMSBlock[]; // pour les sections
}

export interface CMSPage {
  id: string;
  slug: string; // URL-friendly identifier
  title: string;
  description?: string;
  content: CMSBlock[];
  published: boolean;
  metadata: {
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string[];
    author?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface CMSPageForm {
  slug: string;
  title: string;
  description?: string;
  published: boolean;
  metadata: {
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string[];
  };
  content: string; // JSON stringified content for easier editing
}
