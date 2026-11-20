/* ==========================================================================
   api.js — the only file that talks to the backend
   --------------------------------------------------------------------------
   The backend (server.js) is the source of truth for the whole system.
   Every page reads and writes through these helpers and nowhere else,
   so there is no localStorage and no duplicated data logic.
   ========================================================================== */

const API = {
  baseUrl: 'http://localhost:3000',

  /* One place that turns fetch results into either data or a clean Error. */
  async request(path, options = {}) {
    let response;

    try {
      response = await fetch(this.baseUrl + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
    } catch (error) {
      throw new Error('Cannot reach the server. Start it with "npm start".');
    }

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      /* Response had no JSON body — that is fine for some endpoints. */
    }

    if (!response.ok) {
      const message = data && data.message
        ? data.message
        : `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },

  /* ---------- reads ---------- */
  getProducts: () => API.request('/products'),
  getSuppliers: () => API.request('/suppliers'),
  getSales: () => API.request('/sales'),

  /* ---------- writes ---------- */
  createProduct: (body) =>
    API.request('/products', { method: 'POST', body: JSON.stringify(body) }),

  deleteProduct: (id) =>
    API.request(`/products/${id}`, { method: 'DELETE' }),

  createSupplier: (body) =>
    API.request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),

  deleteSupplier: (id) =>
    API.request(`/suppliers/${id}`, { method: 'DELETE' }),

  createSale: (body) =>
    API.request('/sales', { method: 'POST', body: JSON.stringify(body) }),

  /* Buy the whole cart in one transaction on the backend. */
  checkout: (items) =>
    API.request('/sales/checkout', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
};
