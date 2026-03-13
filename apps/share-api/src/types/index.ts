export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface SharedAsset {
  id: string;
  user_id: string;
  storage_key: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  duration_ms: number | null;
  is_public: boolean;
  view_count: number;
  created_at: string;
}

export interface ShareLink {
  id: string;
  asset_id: string;
  slug: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  asset_id: string;
  user_id: string | null;
  author_name: string;
  text: string;
  timestamp_ms: number | null;
  parent_id: string | null;
  created_at: string;
}
