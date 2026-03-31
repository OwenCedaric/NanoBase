export interface Document {
  id: string;
  title: string;
  slug: string;
  upload_date: string;
  path: string;
  original_url?: string; // Optional source link
  series_id?: string;    // Unique ID for the collection
  series_title?: string; // Optional title for the collection
  part_number?: number;  // Order in series (1-indexed)
  total_parts?: number;  // Total number of parts in series
}

export interface IndexData {
  total: number;
  last_updated: string;
  documents: Document[];
}
