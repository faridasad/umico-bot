// src/modules/products/types.ts
export interface ProductAttributes {
  uuid: string;
  external_id: string | null;
  merchant_uuid: string;
  sku: string | null;
  gtin: string | null;
  mpn: string;
  retail_price: number;
  old_price: number;
  availability: string;
  supplier_id: string;
  aux_supplier_id: string | null;
  supplier_price: number | null;
  aux_supplier_price: number | null;
  discount_effective_start_date: string | null;
  discount_effective_end_date: string | null;
  processing_method: string;
  qty: number;
  allow_qty: number;
  effective_start_date: string | null;
  effective_end_date: string | null;
  active: boolean;
  label_ids: string[];
  taxit_enable: boolean;
  max_taxit_monthes: number;
  min_taxit_monthes: number;
  with_additional_service: boolean;
  preferred: boolean;
  discounted: boolean;
  comment_ru: string | null;
  comment_az: string | null;
  stock_control_mode: string;
  manual: boolean;
  show_stock_qty_threshold: number;
  intl_origin_shipping_cost: number | null;
  intl_shipping_cost: number | null;
  price_control_state: string;
  fake_discount: boolean;
  max_installment_months: number;
  installment_enabled: boolean;
  creation_source: string | null;
  product: {
    id: number;
    status: string;
    retail_price: number;
    state: string;
    rrp: number;
    name_az: string;
    name_ru: string;
    category_id: number;
    category_name_ru: string;
    category_name_az: string;
  };
  es_params: {
    indexed_at: string;
    active: boolean;
    retail_price: number;
  };
  marketing_name: {
    ext_id: string;
    name: string;
  };
  deactivation_reason: string | null;
  supplier: {
    ext_id: string;
    name: string;
  };
  supplier_marketing_name: {
    ext_id: string;
    name: string;
  };
}

export interface ProductOffer {
  id: string;
  type: string;
  attributes: ProductAttributes;
  globalDetails?: any;
}

export interface ProductResponse {
  data: ProductOffer[];
  meta: {
    page: number;
    per_page: number;
    total_pages: number;
    total_entries: number;
    tabs: Record<string, any>;
  };
}
