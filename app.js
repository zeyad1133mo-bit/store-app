/* ==========================================================================
   app.js — the catalogue page
   --------------------------------------------------------------------------
   1. Load the products from the backend API (api.js).
   2. Draw the category chips and the product cards (with images).
   3. Filter the cards when the user searches or clicks a category.
   4. Add products to the cart (cart.js) and check out via the API.
   5. Open native <dialog>s for product details and the cart.
   ========================================================================== */

/* ---------- 1. Find the elements we need ---------- */

const grid = document.getElementById('product-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search');
const chipsWrap = document.getElementById('category-chips');
const clearButton = document.getElementById('clear-filters');
const countEl = document.getElementById('result-count');

const cartButton = document.getElementById('cart-button');
const cartCountEl = document.getElementById('cart-count');
const cartDialog = document.getElementById('cart-dialog');
const cartClose = document.getElementById('cart-close');
const cartBody = document.getElementById('cart-body');

const dialog = document.getElementById('product-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogBody = document.getElementById('dialog-body');
const dialogClose = document.getElementById('dialog-close');

/* ---------- 2. Page state ---------- */

let products = [];
let query = '';
let selectedCategory = 'all';
let lastTrigger = null;

/* ---------- 3. Small helpers ---------- */

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

function formatPrice(value) {
  const num = Number(value);
  const text = num % 1 === 0
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `EGP ${text}`;
}

function findProduct(productId) {
  return products.find((product) => product.ProductID === productId);
}

function updateCartCount() {
  const count = Cart.count();
  cartCountEl.textContent = String(count);
  cartCountEl.hidden = count === 0;
}

/* ---------- 4. Draw the product cards ---------- */

/* The cover: a photo when the product has one, otherwise a neutral
   panel with the product's initial. */
function makeCover(product, tagName) {
  const cover = make(tagName, 'product-card__cover');

  if (tagName === 'button') {
    cover.type = 'button';
    cover.append(make('span', 'sr-only', 'View details for '));
  }

  if (product.ImageURL) {
    cover.classList.add('product-card__cover--photo');

    const img = document.createElement('img');
    img.className = 'product-card__cover-img';
    img.src = product.ImageURL;
    img.alt = '';
    cover.append(img, make('span', 'cover-scrim', ''));
  } else {
    const initial = make('span', 'cover-initial', (product.ProductName || '?').trim().charAt(0).toUpperCase());
    initial.setAttribute('aria-hidden', 'true');
    cover.append(initial);
  }

  cover.append(
    make('span', 'cover-name', product.ProductName),
    make('span', 'cover-cat', product.Category || 'Uncategorised')
  );

  return cover;
}

function makeProductCard(product) {
  const card = make('article', 'product-card');
  const cover = makeCover(product, 'button');

  cover.addEventListener('click', () => openProduct(product, cover));

  const body = make('div', 'product-card__body');
  body.append(make('div', 'product-card__title', product.ProductName));

  const metaParts = [];
  if (product.SupplierName) metaParts.push(product.SupplierName);
  body.append(make('div', 'product-card__meta', metaParts.join('') || 'No supplier'));

  const foot = make('div', 'product-card__foot');

  const stock = Number(product.StockQuantity);
  const stockBadge = make(
    'span',
    stock > 0 ? 'badge badge--inline badge--in' : 'badge badge--inline badge--out',
    stock > 0 ? `${stock} in stock` : 'Out of stock'
  );

  const price = make('span', 'product-card__price', formatPrice(product.Price));

  foot.append(stockBadge, price);

  if (stock > 0) {
    const addButton = make('button', 'btn btn--sm btn--ghost', 'Add to cart');
    addButton.type = 'button';
    addButton.addEventListener('click', () => {
      Cart.add(product.ProductID, 1);
      updateCartCount();
    });
    foot.append(addButton);
  }

  body.append(foot);
  card.append(cover, body);
  return card;
}

/* ---------- 5. Filtering ---------- */

function filteredProducts() {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    if (selectedCategory !== 'all' && (product.Category || 'Uncategorised') !== selectedCategory) {
      return false;
    }

    if (!words.length) return true;

    const haystack = [
      product.ProductName,
      product.Category,
      product.SupplierName
    ]
      .join(' ')
      .toLowerCase();

    return words.every((word) => haystack.includes(word));
  });
}

function makeEmptyState(title, message, actionText, action) {
  const box = make('div', 'empty');
  box.append(make('h3', null, title), make('p', null, message));

  if (actionText && action) {
    const button = make('button', 'btn btn--primary', actionText);
    button.type = 'button';
    button.addEventListener('click', action);
    box.append(button);
  }

  return box;
}

/* ---------- 6. Draw everything ---------- */

function renderChips() {
  const categories = Array.from(
    new Set(products.map((product) => product.Category || 'Uncategorised'))
  ).filter(Boolean).sort();

  chipsWrap.replaceChildren();

  const allChip = make('button', 'chip', 'All');
  allChip.type = 'button';
  allChip.dataset.category = 'all';
  allChip.addEventListener('click', () => chooseCategory('all'));
  chipsWrap.append(allChip);

  categories.forEach((category) => {
    const chip = make('button', 'chip', category);
    chip.type = 'button';
    chip.dataset.category = category;
    chip.addEventListener('click', () => chooseCategory(category));
    chipsWrap.append(chip);
  });

  updateChips();
}

function updateChips() {
  chipsWrap.querySelectorAll('[data-category]').forEach((chip) => {
    const active = chip.dataset.category === selectedCategory;
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    chip.classList.toggle('is-active', active);
  });
}

function chooseCategory(category) {
  selectedCategory = category;
  updateChips();
  renderProducts();
}

function resetFilters() {
  query = '';
  selectedCategory = 'all';
  searchInput.value = '';
  updateChips();
  renderProducts();
  searchInput.focus();
}

function renderProducts() {
  const list = filteredProducts();
  const hasFilters = Boolean(query.trim()) || selectedCategory !== 'all';

  countEl.textContent = hasFilters
    ? `${list.length} of ${products.length} ${plural(products.length, 'product', 'products')}`
    : `${products.length} ${plural(products.length, 'product', 'products')}`;

  clearButton.hidden = !hasFilters;

  if (!products.length) {
    grid.replaceChildren(
      makeEmptyState(
        'The shelf is empty',
        'No products yet — please check back soon.'
      )
    );
    return;
  }

  if (!list.length) {
    grid.replaceChildren(
      makeEmptyState(
        'No matches',
        'Nothing matches that search and category. Try a different phrase or clear the filters.',
        'Clear filters',
        resetFilters
      )
    );
    return;
  }

  grid.replaceChildren(...list.map(makeProductCard));
}

/* ---------- 7. The product detail dialog ---------- */

function makeQtyField(product, startValue) {
  let quantity = Math.max(1, Math.min(startValue, Number(product.StockQuantity)));

  const field = make('div', 'qty-field');

  const minus = make('button', 'qty-btn', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', 'Decrease quantity');

  const value = make('span', 'qty-value', String(quantity));
  value.setAttribute('aria-live', 'polite');

  const plus = make('button', 'qty-btn', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', 'Increase quantity');

  const max = Number(product.StockQuantity);

  minus.addEventListener('click', () => {
    if (quantity > 1) quantity -= 1;
    value.textContent = String(quantity);
  });

  plus.addEventListener('click', () => {
    if (quantity < max) quantity += 1;
    value.textContent = String(quantity);
  });

  field.append(minus, value, plus);

  return {
    node: field,
    get value() { return quantity; }
  };
}

function makeDetail(product) {
  const detail = make('div', 'detail');

  const coverWrap = make('div', 'detail__cover');
  coverWrap.append(makeCover(product, 'div'));

  const info = make('div', 'detail__info');
  info.append(make('p', 'detail__author', product.SupplierName || 'No supplier'));

  const facts = make('dl', 'detail__facts');
  facts.append(
    make('dt', null, 'Price'),
    make('dd', null, formatPrice(product.Price)),
    make('dt', null, 'Category'),
    make('dd', null, product.Category || 'Uncategorised'),
    make('dt', null, 'Availability'),
    make('dd', null, Number(product.StockQuantity) > 0
      ? `${product.StockQuantity} in stock`
      : 'Out of stock')
  );
  info.append(facts);

  const actions = make('div', 'detail__actions');
  const qtyField = makeQtyField(product, 1);

  const add = make('button', 'btn btn--primary', 'Add to cart');
  add.type = 'button';

  if (Number(product.StockQuantity) > 0) {
    add.addEventListener('click', () => {
      Cart.add(product.ProductID, qtyField.value);
      updateCartCount();
      dialog.close();
    });
    actions.append(qtyField.node, add);
  } else {
    add.disabled = true;
    add.textContent = 'Out of stock';
    actions.append(add);
  }

  info.append(actions);
  detail.append(coverWrap, info);
  return detail;
}

function openProduct(product, trigger) {
  lastTrigger = trigger;
  dialogTitle.textContent = product.ProductName;
  dialogBody.replaceChildren(makeDetail(product));
  dialog.showModal();
}

dialogClose.addEventListener('click', () => dialog.close());

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

dialog.addEventListener('close', () => {
  if (lastTrigger) lastTrigger.focus();
});

/* ---------- 8. The cart dialog ---------- */

function renderCart() {
  const lines = Cart.items();
  let orderTotal = 0;
  let stockProblem = false;

  const list = make('div', 'cart-list');

  lines.forEach((line) => {
    const product = findProduct(line.ProductID);
    if (!product) return;

    const lineTotal = Number(product.Price) * line.Quantity;
    orderTotal += lineTotal;

    const tooMany = line.Quantity > Number(product.StockQuantity);
    if (tooMany) stockProblem = true;

    const row = make('div', 'cart-line');

    if (product.ImageURL) {
      const thumb = document.createElement('img');
      thumb.className = 'cart-line__thumb';
      thumb.src = product.ImageURL;
      thumb.alt = '';
      row.append(thumb);
    }

    const main = make('div', 'cart-line__main');
    main.append(make('div', 'cart-line__name', product.ProductName));
    main.append(make('div', 'cart-line__price', formatPrice(product.Price) + ' each'));

    if (tooMany) {
      main.append(make('div', 'cart-line__warn',
        `Only ${product.StockQuantity} in stock — reduce the quantity.`));
    }

    row.append(main);

    const controls = make('div', 'cart-line__controls');

    const minus = make('button', 'qty-btn', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', `Decrease ${product.ProductName}`);
    minus.addEventListener('click', () => {
      Cart.setQuantity(product.ProductID, line.Quantity - 1);
      updateCartCount();
      renderCart();
    });

    const qty = make('span', 'cart-line__qty', String(line.Quantity));

    const plus = make('button', 'qty-btn', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Increase ${product.ProductName}`);
    plus.addEventListener('click', () => {
      Cart.setQuantity(product.ProductID, line.Quantity + 1);
      updateCartCount();
      renderCart();
    });

    const remove = make('button', 'cart-line__remove', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      Cart.remove(product.ProductID);
      updateCartCount();
      renderCart();
    });

    controls.append(minus, qty, plus);
    row.append(controls);
    row.append(make('div', 'cart-line__total', formatPrice(lineTotal)));
    row.append(remove);

    list.append(row);
  });

  cartBody.replaceChildren();

  if (!lines.length) {
    cartBody.append(
      makeEmptyState(
        'Your cart is empty',
        'Browse the catalogue and add something you like.',
        'Browse products',
        () => cartDialog.close()
      )
    );
    return;
  }

  cartBody.append(list);

  const footer = make('div', 'cart-footer');
  footer.append(make('div', 'cart-footer__total', `Total: ${formatPrice(orderTotal)}`));

  const checkoutButton = make('button', 'btn btn--primary', 'Check out');
  checkoutButton.type = 'button';
  checkoutButton.disabled = stockProblem;

  if (stockProblem) {
    footer.append(make('p', 'cart-footer__note',
      'Fix the quantities above to check out.'));
  }

  checkoutButton.addEventListener('click', checkout);
  footer.append(checkoutButton);

  cartBody.append(footer);
}

async function checkout() {
  const items = Cart.items().map((line) => ({
    ProductID: line.ProductID,
    QuantitySold: line.Quantity
  }));

  cartBody.replaceChildren(make('p', 'cart-checking', 'Placing your order…'));

  try {
    const result = await API.checkout(items);

    Cart.clear();
    updateCartCount();

    const done = make('div', 'empty cart-success');
    done.append(
      make('h3', null, 'Order placed — thank you'),
      make('p', null,
        `${result.Lines.length} ${plural(result.Lines.length, 'item', 'items')} · total ${formatPrice(result.OrderTotal)}. We will get it ready to ship.`),
    );

    const keepShopping = make('button', 'btn btn--primary', 'Keep shopping');
    keepShopping.type = 'button';
    keepShopping.addEventListener('click', () => cartDialog.close());
    done.append(keepShopping);

    cartBody.replaceChildren(done);

    /* Stock changed on the server — refresh the catalogue. */
    await start({ keepDialog: true });
  } catch (error) {
    cartBody.replaceChildren();
    renderCart();
    cartBody.prepend(make('p', 'error cart-error', error.message));
  }
}

function openCart() {
  renderCart();
  cartDialog.showModal();
}

cartButton.addEventListener('click', openCart);
cartClose.addEventListener('click', () => cartDialog.close());

cartDialog.addEventListener('click', (event) => {
  if (event.target === cartDialog) cartDialog.close();
});

/* ---------- 9. Search and filter events ---------- */

searchInput.addEventListener('input', () => {
  query = searchInput.value;
  renderProducts();
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  query = searchInput.value;
  renderProducts();
});

clearButton.addEventListener('click', resetFilters);

/* ---------- 10. Start the page ---------- */

async function start({ keepDialog = false } = {}) {
  try {
    products = await API.getProducts();
  } catch (error) {
    grid.replaceChildren(
      makeEmptyState(
        'Cannot reach the server',
        error.message,
        'Try again',
        () => start()
      )
    );
    countEl.textContent = 'Offline';
    return false;  }

  renderChips();
  renderProducts();

  /* Keep an open cart dialog in sync with the fresh stock numbers,
     unless it is showing the checkout success message (empty cart). */
  if (keepDialog && cartDialog.open && Cart.count() > 0) renderCart();

  return true;
}

updateCartCount();
start();
