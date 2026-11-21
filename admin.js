/* ==========================================================================
   admin.js — the "Manage store" page
   --------------------------------------------------------------------------
   Everything on this page goes through api.js: adding products and
   suppliers, recording sales, and deleting. The page always re-reads the
   lists from the API after a change, so the backend stays the single
   source of truth.
   ========================================================================== */

/* ---------- elements ---------- */

const message = document.getElementById('form-message');
const apiStatus = document.getElementById('api-status');
const apiRetry = document.getElementById('api-retry');

const productForm = document.getElementById('add-product-form');
const productName = document.getElementById('product-name');
const productPrice = document.getElementById('product-price');
const productStock = document.getElementById('product-stock');
const productCategory = document.getElementById('product-category');
const productSupplier = document.getElementById('product-supplier');
const productImage = document.getElementById('product-image');

const supplierForm = document.getElementById('add-supplier-form');
const supplierName = document.getElementById('supplier-name');
const supplierContact = document.getElementById('supplier-contact');

const productTableBody = document.getElementById('product-table-body');
const productCount = document.getElementById('product-count');
const supplierTableBody = document.getElementById('supplier-table-body');
const supplierCount = document.getElementById('supplier-count');
const saleTableBody = document.getElementById('sale-table-body');
const saleCount = document.getElementById('sale-count');

/* ---------- state ---------- */

let products = [];
let suppliers = [];
let sales = [];

/* ---------- small helpers ---------- */

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMessage(text, isSuccess) {
  message.textContent = text;
  message.className = isSuccess ? 'notice' : 'error';
  message.hidden = false;
}

function hideMessage() {
  message.hidden = true;
}

function formatPrice(value) {
  const num = Number(value);
  const text = num % 1 === 0
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `EGP ${text}`;
}

function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

/* ---------- render: products ---------- */

function renderProducts() {
  productCount.textContent = `${products.length} ${products.length === 1 ? 'product' : 'products'}`;
  productTableBody.replaceChildren();

  if (!products.length) {
    const row = document.createElement('tr');
    const cell = make('td', 'table-state', 'No products yet. Add one with the form above.');
    cell.colSpan = 7;
    row.append(cell);
    productTableBody.append(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement('tr');

    const photo = make('td', null);
    if (product.ImageURL) {
      const img = document.createElement('img');
      img.src = product.ImageURL;
      img.alt = '';
      img.className = 'admin-thumb';
      photo.append(img);
    } else {
      photo.append(make('span', 'admin-thumb admin-thumb--empty', '—'));
    }

    const actions = make('td', null);
    actions.style.whiteSpace = 'nowrap';

    const sellButton = make('button', 'btn btn--sm btn--accent', 'Sell');
    sellButton.type = 'button';
    sellButton.addEventListener('click', () => sellProduct(product));

    const deleteButton = make('button', 'btn btn--sm btn--ghost', 'Delete');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => deleteProduct(product));

    actions.append(sellButton, ' ', deleteButton);

    row.append(
      photo,
      make('td', null, product.ProductName),
      make('td', null, product.Category || '—'),
      make('td', null, formatPrice(product.Price)),
      make('td', null, String(product.StockQuantity)),
      make('td', null, product.SupplierName || '—'),
      actions
    );

    productTableBody.append(row);
  });
}

/* ---------- render: suppliers ---------- */

function renderSuppliers() {
  supplierCount.textContent = `${suppliers.length} ${suppliers.length === 1 ? 'supplier' : 'suppliers'}`;
  supplierTableBody.replaceChildren();

  /* Keep the product form's dropdown in sync too. */
  productSupplier.replaceChildren(make('option', null, 'No supplier'));
  suppliers.forEach((supplier) => {
    const option = make('option', null, supplier.SupplierName);
    option.value = String(supplier.SupplierID);
    productSupplier.append(option);
  });

  if (!suppliers.length) {
    const row = document.createElement('tr');
    const cell = make('td', 'table-state', 'No suppliers yet. Add one with the form above.');
    cell.colSpan = 4;
    row.append(cell);
    supplierTableBody.append(row);
    return;
  }

  suppliers.forEach((supplier) => {
    const row = document.createElement('tr');

    const actions = make('td', null);
    const deleteButton = make('button', 'btn btn--sm btn--ghost', 'Delete');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => deleteSupplier(supplier));
    actions.append(deleteButton);

    row.append(
      make('td', null, String(supplier.SupplierID)),
      make('td', null, supplier.SupplierName),
      make('td', null, supplier.ContactNumber || '—'),
      actions
    );

    supplierTableBody.append(row);
  });
}

/* ---------- render: sales ---------- */

function renderSales() {
  saleCount.textContent = `${sales.length} ${sales.length === 1 ? 'sale' : 'sales'}`;
  saleTableBody.replaceChildren();

  if (!sales.length) {
    const row = document.createElement('tr');
    const cell = make('td', 'table-state', 'No sales recorded yet. Use the Sell button above.');
    cell.colSpan = 4;
    row.append(cell);
    saleTableBody.append(row);
    return;
  }

  sales.forEach((sale) => {
    const row = document.createElement('tr');

    row.append(
      make('td', null, sale.ProductName || `#${sale.ProductID}`),
      make('td', null, String(sale.QuantitySold)),
      make('td', null, formatDate(sale.SaleDate)),
      make('td', null, formatPrice(sale.TotalAmount))
    );

    saleTableBody.append(row);
  });
}

/* ---------- data loading ---------- */

async function loadData() {
  apiStatus.textContent = 'Checking the API…';

  const [productsResult, suppliersResult, salesResult] = await Promise.allSettled([
    API.getProducts(),
    API.getSuppliers(),
    API.getSales()
  ]);

  const ok = productsResult.status === 'fulfilled'
    && suppliersResult.status === 'fulfilled'
    && salesResult.status === 'fulfilled';

  if (!ok) {
    apiStatus.textContent = 'Not connected. Start the backend with "npm start".';
    return false;
  }

  products = productsResult.value;
  suppliers = suppliersResult.value;
  sales = salesResult.value;

  apiStatus.textContent = 'Connected — data comes live from the API.';
  return true;
}

async function refresh() {
  hideMessage();
  const ok = await loadData();
  if (ok) {
    renderProducts();
    renderSuppliers();
    renderSales();
  }
}

/* ---------- actions: products ---------- */

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage();

  const name = productName.value.trim();
  const priceText = productPrice.value.trim();
  const stockText = productStock.value.trim();

  if (!name) {
    showMessage('Please enter a product name.', false);
    productName.focus();
    return;
  }

  const price = Number(priceText);
  if (priceText === '' || Number.isNaN(price) || price < 0) {
    showMessage('Please enter a price of 0 or more.', false);
    productPrice.focus();
    return;
  }

  const stock = Number(stockText);
  if (stockText === '' || !Number.isInteger(stock) || stock < 0) {
    showMessage('Please enter a whole stock quantity of 0 or more.', false);
    productStock.focus();
    return;
  }

  const supplierId = productSupplier.value ? Number(productSupplier.value) : null;

  try {
    await API.createProduct({
      ProductName: name,
      Price: price,
      StockQuantity: stock,
      Category: productCategory.value.trim() || null,
      SupplierID: supplierId,
      ImageURL: productImage.value.trim() || null
    });

    productForm.reset();
    await refresh();
    showMessage(`"${name}" was added to the catalogue.`, true);
  } catch (error) {
    showMessage(error.message, false);
  }
});

async function deleteProduct(product) {
  hideMessage();

  const shouldDelete = window.confirm(
    `Delete "${product.ProductName}"? Sales history will block this if the product was ever sold.`
  );

  if (!shouldDelete) return;

  try {
    await API.deleteProduct(product.ProductID);
    await refresh();
    showMessage(`"${product.ProductName}" was deleted.`, true);
  } catch (error) {
    showMessage(error.message, false);
  }
}

/* ---------- actions: suppliers ---------- */

supplierForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage();

  const name = supplierName.value.trim();
  if (!name) {
    showMessage('Please enter a supplier name.', false);
    supplierName.focus();
    return;
  }

  const contact = supplierContact.value.trim();
  if (contact.length > 15) {
    showMessage('Contact number must be 15 characters or fewer.', false);
    supplierContact.focus();
    return;
  }

  try {
    await API.createSupplier({
      SupplierName: name,
      ContactNumber: contact || null
    });

    supplierForm.reset();
    await refresh();
    showMessage(`Supplier "${name}" was added.`, true);
  } catch (error) {
    showMessage(error.message, false);
  }
});

async function deleteSupplier(supplier) {
  hideMessage();

  const shouldDelete = window.confirm(
    `Delete supplier "${supplier.SupplierName}"? This fails while products still reference them.`
  );

  if (!shouldDelete) return;

  try {
    await API.deleteSupplier(supplier.SupplierID);
    await refresh();
    showMessage(`Supplier "${supplier.SupplierName}" was deleted.`, true);
  } catch (error) {
    showMessage(error.message, false);
  }
}

/* ---------- actions: sales ---------- */

async function sellProduct(product) {
  hideMessage();

  const answer = window.prompt(
    `How many "${product.ProductName}" were sold? ${product.StockQuantity} in stock.`,
    '1'
  );

  if (answer === null) return;

  const quantity = Number(answer);
  if (!Number.isInteger(quantity) || quantity < 1) {
    showMessage('Please enter a whole quantity of 1 or more.', false);
    return;
  }

  try {
    const result = await API.createSale({
      ProductID: product.ProductID,
      QuantitySold: quantity
    });

    await refresh();
    showMessage(
      `Sold ${quantity} × "${product.ProductName}". Total: ${formatPrice(result.TotalAmount)}.`,
      true
    );
  } catch (error) {
    showMessage(error.message, false);
  }
}

/* ---------- start ---------- */

apiRetry.addEventListener('click', refresh);
refresh();
