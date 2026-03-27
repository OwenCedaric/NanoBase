export interface Document {
  id: string;
  title: string;
  slug: string;
  upload_date: string;
  path: string;
  original_url?: string; // Optional source link
}

export interface IndexData {
  total: number;
  last_updated: string;
  documents: Document[];
}
