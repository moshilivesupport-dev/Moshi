export type UserRole = "buyer" | "seller" | "admin";
export type SellerStatus = "none" | "pending" | "approved" | "rejected";
export type StreamStatus = "scheduled" | "live" | "ended" | "killed";

export interface Profile {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  country?: string;
  age?: number;
  gender?: string;
  is_verified: boolean;
  seller_status: SellerStatus;
  bio?: string;
  followers_count: number;
  following_count: number;
  preferred_currency?: string;
  preferred_language?: string;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  category_id?: string;
  stock: number;
  is_active: boolean;
  created_at: string;
}

export interface LiveStream {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  status: StreamStatus;
  stream_url?: string;
  thumbnail_url?: string;
  viewer_count: number;
  peak_viewers: number;
  total_revenue: number;
  started_at?: string;
  ended_at?: string;
}
