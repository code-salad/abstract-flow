import { chargeCard, refund } from "./billing";
import { reserveStock } from "./inventory";
import { createServer } from "./server";
import { creditBalance, findUser } from "./users";

const app = createServer();

app.post("/checkout", (req, res) => {
  // validate the cart
  const cart = req.body.cart;
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: "empty cart" });
  }
  const user = findUser({ id: req.userId });
  if (!user) {
    return res.status(404).json({ error: "unknown user" });
  }
  try {
    // charge first, then reserve line items
    const receipt = chargeCard({ user, cart });
    for (const item of cart.items) {
      reserveStock({ sku: item.sku, qty: item.qty });
    }
    return res.json({ receipt });
  } catch (err) {
    refund({ user, receiptId: "pending" });
    return res.status(502).json({ error: String(err) });
  }
});

app.get("/balance/:id", (req, res) => {
  const user = findUser({ id: req.params.id ?? "" });
  if (!user) {
    return res.status(404).json({ error: "unknown user" });
  }
  return res.json({ balance: creditBalance({ user }) });
});
