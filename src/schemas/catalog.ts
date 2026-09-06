import { z } from 'zod';
import {
  Address,
  Amount,
  Id,
  NullableAmount,
  NullableId,
  NullableString,
  StringList,
} from './shared.js';

/** GET /products and /{id} (identical). Stock quantities are dot-decimal strings ("1.5"). */
export const ProductStockLevel = z.looseObject({
  warehouse_id: Id,
  stock: Amount,
});

export const Product = z.looseObject({
  id: Id,
  kind: z.string(),
  name: z.string(),
  description: NullableString.optional(),
  type_id: NullableId.optional(),
  price: NullableAmount.optional(),
  taxes: z.array(z.unknown()).optional(),
  total: NullableAmount.optional(),
  has_stock: z.boolean().optional(),
  stock: NullableAmount.optional(),
  barcode: NullableString.optional(),
  sku: NullableString.optional(),
  cost: NullableAmount.optional(),
  purchase_price: NullableAmount.optional(),
  weight: NullableAmount.optional(),
  tags: StringList.optional(),
  category_id: NullableId.optional(),
  factory_code: NullableString.optional(),
  for_sale: z.boolean().optional(),
  for_purchase: z.boolean().optional(),
  sales_channel_id: NullableId.optional(),
  exp_account_id: NullableId.optional(),
  warehouse_id: NullableId.optional(),
  archived: z.boolean().optional(),
  purchase_taxes: z.array(z.unknown()).optional(),
  min_stock: z.unknown().optional(),
  min_stock_alarm: z.boolean().optional(),
  in_pos: z.boolean().optional(),
  supplier_id: NullableId.optional(),
  translations: z.array(z.unknown()).optional(),
  rates: z.array(z.unknown()).optional(),
  attributes: z.array(z.unknown()).optional(),
  variants: z.array(z.unknown()).optional(),
  pack_items: z.array(z.unknown()).optional(),
  stocks: z.array(ProductStockLevel).optional(),
  show_start_date: z.unknown().optional(),
  show_end_date: z.unknown().optional(),
  image: z.unknown().optional(),
});
export type Product = z.infer<typeof Product>;

/** GET /products/{id}/stock. */
export const ProductStock = z.looseObject({
  product_id: Id,
  has_stock: z.boolean(),
  total: Amount,
  available: Amount,
  reserved: Amount,
  in_transit: Amount,
  warehouses: z.array(ProductStockLevel),
});
export type ProductStock = z.infer<typeof ProductStock>;

/** GET /warehouses/{id}/stock items. */
export const WarehouseStockLine = z.looseObject({
  product_id: Id,
  variant_id: NullableId.optional(),
  stock: Amount,
});

/** GET /services and /{id}. */
export const Service = z.looseObject({
  id: Id,
  name: z.string(),
  code: NullableString.optional(),
  description: NullableString.optional(),
  price: NullableAmount.optional(),
  cost: NullableAmount.optional(),
  tags: StringList.optional(),
  taxes: z.array(z.unknown()).optional(),
  sales_channel_id: NullableId.optional(),
  color: NullableString.optional(),
  duration: NullableAmount.optional(),
  archived: z.boolean().optional(),
});
export type Service = z.infer<typeof Service>;

/** GET /warehouses and /{id}. */
export const Warehouse = z.looseObject({
  id: Id,
  user_id: NullableId.optional(),
  name: z.string(),
  notes: NullableString.optional(),
  email: NullableString.optional(),
  phone: NullableString.optional(),
  mobile: NullableString.optional(),
  default: z.boolean().optional(),
  color: NullableString.optional(),
  icon: NullableString.optional(),
  address: Address.nullable().optional(),
});
export type Warehouse = z.infer<typeof Warehouse>;

/** GET /price-lists: account has none; shape from the OpenAPI response. */
export const PriceList = z.looseObject({
  id: Id,
  name: z.string(),
  description: NullableString.optional(),
});

/** GET /production-orders: account has none; shape from the OpenAPI response. */
export const ProductionOrder = z.looseObject({
  id: Id,
  document_number: NullableString.optional(),
  contact_id: NullableId.optional(),
  contact_name: NullableString.optional(),
  supplier_id: NullableId.optional(),
  supplier_name: NullableString.optional(),
  description: NullableString.optional(),
  date: NullableString.optional(),
  due_date: NullableString.optional(),
  cost: NullableAmount.optional(),
  currency: NullableString.optional(),
  tags: StringList.optional(),
  manufactured_product: z.unknown().optional(),
  source_warehouse_id: NullableId.optional(),
  destination_warehouse_id: NullableId.optional(),
  is_built: z.boolean().optional(),
  is_valued: z.boolean().optional(),
});
