const stock = new Map<string, number>();

export function reserveStock({ sku, qty }: { sku: string; qty: number }): boolean {
  const available = stock.get(sku) ?? 0;
  if (available < qty) {
    return false;
  }
  stock.set(sku, available - qty);
  return true;
}
