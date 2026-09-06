import { deleteOne, patch, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import {
  PriceList,
  Product,
  ProductStock,
  ProductionOrder,
  Service,
  Warehouse,
  WarehouseStockLine,
  inputs,
} from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export function listProducts(params: { limit?: number; cursor?: string; name?: string } = {}) {
  return fetchPage('/products', Product, { ...params });
}

export function getProduct(id: string): Promise<Product> {
  return fetchOne(`/products/${seg(id)}`, Product);
}

export function getProductStock(id: string): Promise<ProductStock> {
  return fetchOne(`/products/${seg(id)}/stock`, ProductStock);
}

export async function createProduct(input: z.infer<typeof inputs.ProductInput>): Promise<Product> {
  const id = await createAndReturnId('/products', input);
  return getProduct(id);
}

export async function updateProduct(
  id: string,
  input: z.infer<typeof inputs.ProductUpdateInput>
): Promise<Product> {
  await put(`/products/${seg(id)}`, input);
  return getProduct(id);
}

/** Applies a stock variation (positive or negative) in one warehouse. */
export function updateProductStock(id: string, input: z.infer<typeof inputs.StockUpdateInput>) {
  return put(`/products/${seg(id)}/stock`, input);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteOne(`/products/${seg(id)}`);
}

export function listServices(
  params: { limit?: number; cursor?: string; include_archived?: boolean } = {}
) {
  return fetchPage('/services', Service, { ...params });
}

export function getService(id: string): Promise<Service> {
  return fetchOne(`/services/${seg(id)}`, Service);
}

export async function createService(input: z.infer<typeof inputs.ServiceInput>): Promise<Service> {
  const id = await createAndReturnId('/services', input);
  return getService(id);
}

export async function updateService(
  id: string,
  input: z.infer<typeof inputs.ServiceInput>
): Promise<Service> {
  await put(`/services/${seg(id)}`, input);
  return getService(id);
}

export async function deleteService(id: string): Promise<void> {
  await deleteOne(`/services/${seg(id)}`);
}

export function listWarehouses(): Promise<Page<Warehouse>> {
  return fetchPage('/warehouses', Warehouse);
}

export function getWarehouse(id: string): Promise<Warehouse> {
  return fetchOne(`/warehouses/${seg(id)}`, Warehouse);
}

export function getWarehouseStock(id: string, params: { limit?: number; cursor?: string } = {}) {
  return fetchPage(`/warehouses/${seg(id)}/stock`, WarehouseStockLine, { ...params });
}

export async function createWarehouse(input: z.infer<typeof inputs.WarehouseInput>) {
  const id = await createAndReturnId('/warehouses', input);
  return getWarehouse(id);
}

export async function updateWarehouse(id: string, input: z.infer<typeof inputs.WarehouseInput>) {
  await patch(`/warehouses/${seg(id)}`, input);
  return getWarehouse(id);
}

export async function deleteWarehouse(id: string): Promise<void> {
  await deleteOne(`/warehouses/${seg(id)}`);
}

export function listPriceLists() {
  return fetchPage('/price-lists', PriceList);
}

export function getPriceList(id: string) {
  return fetchOne(`/price-lists/${seg(id)}`, PriceList);
}

export async function createPriceList(input: z.infer<typeof inputs.PriceListInput>) {
  const id = await createAndReturnId('/price-lists', input);
  return getPriceList(id);
}

export async function updatePriceList(id: string, input: z.infer<typeof inputs.PriceListInput>) {
  await patch(`/price-lists/${seg(id)}`, input);
  return getPriceList(id);
}

export async function deletePriceList(id: string): Promise<void> {
  await deleteOne(`/price-lists/${seg(id)}`);
}

export function listProductionOrders(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/production-orders', ProductionOrder, { ...params });
}

export function getProductionOrder(id: string) {
  return fetchOne(`/production-orders/${seg(id)}`, ProductionOrder);
}

export async function createProductionOrder(input: Record<string, unknown>) {
  const id = await createAndReturnId('/production-orders', input);
  return getProductionOrder(id);
}

export async function updateProductionOrder(id: string, input: Record<string, unknown>) {
  await put(`/production-orders/${seg(id)}`, input);
  return getProductionOrder(id);
}

export async function deleteProductionOrder(id: string): Promise<void> {
  await deleteOne(`/production-orders/${seg(id)}`);
}
