import { gt, eq, and } from 'drizzle-orm';
import { drizzleDb } from '../db/database';
import { products, Product } from '../db/schema';
import { LocalDb } from '../sync/sync.service';

/**
 * Returns products from the local DB where price > minPrice.
 *
 * Native  → Drizzle typed query against the `products` SQLite table.
 * Web     → in-memory filter via LocalDb (JSON rows from the generic table).
 */
export async function getProductsByMinPrice(minPrice: number): Promise<Product[]> {
  // Native path: use Drizzle with gt() for a typed, efficient SQL query
  if (drizzleDb) {
    return drizzleDb
      .select()
      .from(products)
      .where(
        and(
          gt(products.price, minPrice),
          // exclude locally-deleted rows
          eq(products.syncStatus, 'synced'),
        ),
      );
  }

  // Web fallback: filter the generic JSON rows in memory
  const rows = await LocalDb.getRows('products');
  return rows
    .filter((r) => typeof r.price === 'number' && r.price > minPrice)
    .map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      price: Number(r.price),
      stock: Number(r.stock ?? 0),
      syncStatus: 'synced' as const,
      updatedAt: Number(r.updatedAt ?? 0),
    }));
}

/**
 * Upserts a product row synced from the Excel API into the typed `products` table.
 * Called during sync so the Drizzle table stays in sync with the generic synced_rows table.
 */
export async function upsertProduct(
  row: { id: string; name?: unknown; price?: unknown; stock?: unknown },
): Promise<void> {
  if (!drizzleDb) return;

  await drizzleDb
    .insert(products)
    .values({
      id: row.id,
      name: String(row.name ?? ''),
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      syncStatus: 'synced',
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: products.id,
      set: {
        name: String(row.name ?? ''),
        price: Number(row.price ?? 0),
        stock: Number(row.stock ?? 0),
        syncStatus: 'synced',
        updatedAt: Date.now(),
      },
    });
}
