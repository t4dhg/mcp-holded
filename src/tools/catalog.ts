import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import { inputs } from '../schemas/index.js';
import { formatToolError, jsonResponse, requireArg, textResponse } from '../tool-utils.js';
import {
  checkConfirmation,
  confirmArg,
  data,
  dataArg,
  idArg,
  listArgs,
  pageResponse,
  paging,
} from './shared.js';

export function registerCatalogTool(server: McpServer) {
  server.registerTool(
    'holded_catalog',
    {
      title: 'Holded catalog',
      description:
        'Products, services, warehouses, price lists and production orders. Actions: list_products (name), get_product, product_stock, create_product, update_product, update_stock (data.warehouse_id, data.stock_variation), delete_product, list_services (include_archived), get_service, create_service, update_service, delete_service, list_warehouses, get_warehouse, warehouse_stock, create_warehouse, update_warehouse, delete_warehouse, list_price_lists, get_price_list, create_price_list, update_price_list, delete_price_list, list_production_orders, get_production_order, create_production_order, update_production_order, delete_production_order.',
      inputSchema: {
        action: z.enum([
          'list_products',
          'get_product',
          'product_stock',
          'create_product',
          'update_product',
          'update_stock',
          'delete_product',
          'list_services',
          'get_service',
          'create_service',
          'update_service',
          'delete_service',
          'list_warehouses',
          'get_warehouse',
          'warehouse_stock',
          'create_warehouse',
          'update_warehouse',
          'delete_warehouse',
          'list_price_lists',
          'get_price_list',
          'create_price_list',
          'update_price_list',
          'delete_price_list',
          'list_production_orders',
          'get_production_order',
          'create_production_order',
          'update_production_order',
          'delete_production_order',
        ]),
        id: idArg,
        name: z.string().optional().describe('Product name filter'),
        include_archived: z.boolean().optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list_products':
            return pageResponse(
              await api.listProducts({ ...paging(args), name: args.name }),
              'product'
            );
          case 'get_product':
            return jsonResponse(await api.getProduct(requireArg(args.id, 'id')));
          case 'product_stock':
            return jsonResponse(await api.getProductStock(requireArg(args.id, 'id')));
          case 'create_product':
            return jsonResponse(
              await api.createProduct(data(inputs.ProductInput, args.data, 'create product')),
              'Product created.'
            );
          case 'update_product': {
            const gate = checkConfirmation('update_product', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateProduct(
                requireArg(args.id, 'id'),
                data(inputs.ProductUpdateInput, args.data, 'update product')
              ),
              'Product updated.'
            );
          }
          case 'update_stock': {
            const gate = checkConfirmation('update_product_stock', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateProductStock(
                requireArg(args.id, 'id'),
                data(inputs.StockUpdateInput, args.data, 'update stock')
              ),
              'Stock updated.'
            );
          }
          case 'delete_product': {
            const gate = checkConfirmation('delete_product', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteProduct(requireArg(args.id, 'id'));
            return textResponse(`Product ${args.id} deleted.`);
          }
          case 'list_services':
            return pageResponse(
              await api.listServices({ ...paging(args), include_archived: args.include_archived }),
              'service'
            );
          case 'get_service':
            return jsonResponse(await api.getService(requireArg(args.id, 'id')));
          case 'create_service':
            return jsonResponse(
              await api.createService(data(inputs.ServiceInput, args.data, 'create service')),
              'Service created.'
            );
          case 'update_service': {
            const gate = checkConfirmation('update_service', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateService(
                requireArg(args.id, 'id'),
                data(inputs.ServiceInput, args.data, 'update service')
              ),
              'Service updated.'
            );
          }
          case 'delete_service': {
            const gate = checkConfirmation('delete_service', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteService(requireArg(args.id, 'id'));
            return textResponse(`Service ${args.id} deleted.`);
          }
          case 'list_warehouses':
            return pageResponse(await api.listWarehouses(), 'warehouse');
          case 'get_warehouse':
            return jsonResponse(await api.getWarehouse(requireArg(args.id, 'id')));
          case 'warehouse_stock':
            return pageResponse(
              await api.getWarehouseStock(requireArg(args.id, 'id'), paging(args)),
              'stock line'
            );
          case 'create_warehouse':
            return jsonResponse(
              await api.createWarehouse(data(inputs.WarehouseInput, args.data, 'create warehouse')),
              'Warehouse created.'
            );
          case 'update_warehouse': {
            const gate = checkConfirmation('update_warehouse', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateWarehouse(
                requireArg(args.id, 'id'),
                data(inputs.WarehouseInput, args.data, 'update warehouse')
              ),
              'Warehouse updated.'
            );
          }
          case 'delete_warehouse': {
            const gate = checkConfirmation('delete_warehouse', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteWarehouse(requireArg(args.id, 'id'));
            return textResponse(`Warehouse ${args.id} deleted.`);
          }
          case 'list_price_lists':
            return pageResponse(await api.listPriceLists(), 'price list');
          case 'get_price_list':
            return jsonResponse(await api.getPriceList(requireArg(args.id, 'id')));
          case 'create_price_list':
            return jsonResponse(
              await api.createPriceList(
                data(inputs.PriceListInput, args.data, 'create price list')
              ),
              'Price list created.'
            );
          case 'update_price_list': {
            const gate = checkConfirmation('update_price_list', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updatePriceList(
                requireArg(args.id, 'id'),
                data(inputs.PriceListInput, args.data, 'update price list')
              ),
              'Price list updated.'
            );
          }
          case 'delete_price_list': {
            const gate = checkConfirmation('delete_price_list', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deletePriceList(requireArg(args.id, 'id'));
            return textResponse(`Price list ${args.id} deleted.`);
          }
          case 'list_production_orders':
            return pageResponse(await api.listProductionOrders(paging(args)), 'production order');
          case 'get_production_order':
            return jsonResponse(await api.getProductionOrder(requireArg(args.id, 'id')));
          case 'create_production_order':
            return jsonResponse(
              await api.createProductionOrder(
                data(inputs.ProductionOrderInput, args.data, 'create production order')
              ),
              'Production order created.'
            );
          case 'update_production_order': {
            const gate = checkConfirmation('update_production_order', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateProductionOrder(
                requireArg(args.id, 'id'),
                data(inputs.ProductionOrderUpdateInput, args.data, 'update production order')
              ),
              'Production order updated.'
            );
          }
          case 'delete_production_order': {
            const gate = checkConfirmation('delete_production_order', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteProductionOrder(requireArg(args.id, 'id'));
            return textResponse(`Production order ${args.id} deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}
