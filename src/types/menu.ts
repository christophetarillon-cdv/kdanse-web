export interface MenuItem {
  id: string;
  label: string;
  url: string;
  order: number;
  parentId?: string; // pour les sous-menus
  children?: MenuItem[];
}

export interface Menu {
  id: string;
  name: string; // ex: "Main Navigation", "Footer"
  items: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}
