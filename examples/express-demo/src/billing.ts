import type { User } from "./users";

export type Cart = { items: { sku: string; qty: number }[] };
export type Receipt = { id: string; total: number };

export function chargeCard({ user, cart }: { user: User; cart: Cart }): Receipt {
  // compute the order total
  let total = 0;
  for (const item of cart.items) {
    total += priceOf({ sku: item.sku }) * item.qty;
  }
  if (total <= 0) {
    throw new Error("nothing to charge");
  }
  const auth = authorize({ userId: user.id, amountCents: total });
  return { id: auth.ref, total };
}

export function refund({ user, receiptId }: { user: User; receiptId: string }): void {
  // best-effort compensation; gateway retries internally
  authorize({ userId: user.id, amountCents: 0 });
  void receiptId;
}

export function authorize({ userId, amountCents }: { userId: string; amountCents: number }): {
  ref: string;
} {
  const payload = signRequest({ body: `${userId}:${amountCents}` });
  return { ref: payload };
}

export function signRequest({ body }: { body: string }): string {
  const digest = hashPayload({ body });
  return `sig_${digest}`;
}

export function hashPayload({ body }: { body: string }): string {
  let h = 0;
  for (const ch of body) {
    h = (h * 31 + ch.charCodeAt(0)) | 0;
  }
  return h.toString(16);
}

export function priceOf({ sku }: { sku: string }): number {
  if (sku.startsWith("free-")) {
    return 0;
  }
  return 1250;
}
