import { BaseRepository } from './base.repository';
import { ProductModel, toProductModel } from '../models/product.model';
import { SHEETS } from '../../utils/constants';

export class ProductRepository extends BaseRepository<ProductModel> {
  constructor() {
    super(SHEETS.PRODUCTS);
  }

  protected fromRow(row: Record<string, unknown>): ProductModel {
    return toProductModel(row);
  }

  async findByMinPrice(minPrice: number): Promise<ProductModel[]> {
    return this.findWhere(p => p.price > minPrice);
  }

  async findInStock(): Promise<ProductModel[]> {
    return this.findWhere(p => p.stock > 0);
  }
}

export const productRepository = new ProductRepository();
