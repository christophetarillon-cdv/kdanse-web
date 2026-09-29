export interface TextStyle {
  color?: string; // hex color
  fontSize?: number; // pixels
  fontFamily?: string; // font name
  fontWeight?: 'normal' | 'bold' | '500' | '600' | '700';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface CMSBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'section' | 'image' | 'layout';
  level?: number; // pour les headings (1-6)
  text?: string;
  style?: TextStyle; // styles pour texte
  items?: string[]; // pour les listes
  content?: CMSBlock[]; // pour les sections
  src?: string; // pour les images (URL Firebase Storage)
  alt?: string; // texte alt pour les images
  // pour les layouts
  layoutType?: 'two-columns' | 'three-columns' | 'image-text' | 'text-image';
  columnGap?: number; // écart entre colonnes en %
  parentLayoutId?: string; // id du bloc layout parent (pour les blocs dans colonnes)
  columnIndex?: number; // index de la colonne (0, 1, etc.)
  // pour le visual editor (drag-drop)
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  order?: number;
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
