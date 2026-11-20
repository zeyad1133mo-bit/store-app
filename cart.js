/* ==========================================================================
   cart.js — the shopping cart state
   --------------------------------------------------------------------------
   The cart holds only { ProductID, Quantity } pairs. The backend stays the
   source of truth: product names, prices, and stock are always read fresh
   from the API when the cart is rendered, and the final purchase is
   validated and recorded by the /checkout endpoint.

   The list of chosen items itself is saved in localStorage, because it is
   per-browser session state, not store data.
   ========================================================================== */

const Cart = {
  storageKey: 'lumen-store-cart',

  /* ---------- read / write ---------- */

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter(
        (line) => Number.isInteger(line.ProductID) && Number.isInteger(line.Quantity)
      ) : [];
    } catch (error) {
      return [];
    }
  },

  save(lines) {
    localStorage.setItem(this.storageKey, JSON.stringify(lines));
  },

  /* ---------- actions ---------- */

  items() {
    return this.load();
  },

  count() {
    return this.load().reduce((total, line) => total + line.Quantity, 0);
  },

  quantityOf(productId) {
    const line = this.load().find((line) => line.ProductID === productId);
    return line ? line.Quantity : 0;
  },

  add(productId, quantity = 1) {
    const lines = this.load();
    const existing = lines.find((line) => line.ProductID === productId);

    if (existing) {
      existing.Quantity += quantity;
    } else {
      lines.push({ ProductID: productId, Quantity: quantity });
    }

    this.save(lines);
  },

  setQuantity(productId, quantity) {
    let lines = this.load();

    if (quantity < 1) {
      lines = lines.filter((line) => line.ProductID !== productId);
    } else {
      const existing = lines.find((line) => line.ProductID === productId);
      if (existing) existing.Quantity = quantity;
    }

    this.save(lines);
  },

  remove(productId) {
    this.save(this.load().filter((line) => line.ProductID !== productId));
  },

  clear() {
    localStorage.removeItem(this.storageKey);
  }
};
