export interface CMSBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'section';
  level?: number; // pour les headings (1-6)
  text?: string;
  items?: string[]; // pour les listes
  content?: CMSBlock[]; // pour les sections
}

export interface CMSMetadata {
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  author?: string;
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content: CMSBlock[];
  published: boolean;
  metadata: CMSMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface CMSPageForm {
  slug: string;
  title: string;
  description?: string;
  published: boolean;
  metadata: CMSMetadata;
  content?: string;
}
