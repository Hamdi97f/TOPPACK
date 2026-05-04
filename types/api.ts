/**
 * Shared types for the api-gateway webapp at
 * `https://hycvkzijiwnmcwejvugj.supabase.co/functions/v1/api-gateway`.
 *
 * Field names mirror the API responses (snake_case). UI-side adapters in
 * lib/api-client.ts wrap these with TOPPACK-specific extras (slug, dimensions,
 * etc.) packed inside `description`/`notes` to fit the leaner remote schema.
 */

export interface ApiUser {
  user_id: string;
  email: string;
  is_admin: boolean;
  storage_used?: number;
  storage_limit?: number;
  subscription_status?: string;
  subscription_end?: string;
  last_login?: string;
}

export interface ApiLoginResponse {
  token: string;
  user_id: string;
  email: string;
  is_admin: boolean;
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface ApiOrderItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface ApiOrder {
  id: string;
  status: string;
  total: number;
  customer_name?: string;
  customer_email?: string;
  shipping_address?: string;
  notes?: string;
  created_at?: string;
  user_id?: string;
  order_items: ApiOrderItem[];
}

export interface ApiUploadResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  url?: string;
}
