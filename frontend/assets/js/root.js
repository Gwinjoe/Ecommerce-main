
import { updateHeaderView } from "./user-details.js";

/**
 * Homepage script — server-driven, paginated product loading
 */

const elements = {
  categoryGrid: document.getElementById('categoriesGrid'),
  productGrid: document.getElementById('productGrid'),
  brandSwiperWrapper: document.getElementById('brandSwiperWrapper'),
  recentSwiperWrapper: document.getElementById('recentSwiperWrapper'),
  categoryDropdown: document.querySelector('.dropdown-options'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  cartCount: document.querySelector('.cart-count'),
  activeFilterBadge: document.getElementById('activeFilterBadge'),
  searchInput: document.getElementById('searchInput'),
  dropdownSelected: document.querySelector('.dropdown-selected')
};

let currency = "NGN";
let allCategories = [];
let allBrands = [];

// Server-driven product state (we fetch pages rather than full list)
const state = {
  products: [],            // accumulated products for current filter (may be multiple pages)
  currentPage: 0,          // last fetched page for current filter
  perPage: 6,              // how many products to fetch per page from server (suits homepage)
  visibleProducts: 6,      // how many cards to show initially (UI logic)
  activeCategory: 'all',
  totalProducts: 0,
  totalPages: 1,
  productSort: '-createdAt', // newest first
  userRequestedSearch: '',   // search keyword if any
  brandSwiper: null,
  recentSwiper: null
};

/* ------------------------- helpers ------------------------- */

const parseDecimal = (v) => {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof v.$numberDecimal !== 'undefined') {
    return parseFloat(v.$numberDecimal || 0) || 0;
  }
  if (typeof v === 'object' && typeof v.toString === 'function') {
    const s = v.toString();
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return parseFloat(v) || 0;
};

const formatCurrency = (value) => {
  const num = parseDecimal(value);
  // using Intl with NGN — caller previously replaced 'NGN' with '₦', keep similar
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(num).replace('NGN', '₦');
};

async function fetchJson(endpoint, { showSpinner = false } = {}) {
  try {
    if (showSpinner) elements.productGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json(); // { success, data, meta }
  } catch (err) {
    console.error('fetchJson error', err);
    return { success: false, data: [], meta: {} };
  } finally {
    if (showSpinner) {
      // leave grid empty or previous content; we don't force clearing here
    }
  }
}

/* ------------------------- rendering ------------------------- */

function createProductCard(product) {
  const price = product.price;
  const formattedPrice = formatCurrency(price);

  const rating = parseDecimal(product.ratings) || 0;

  return `
    <div class="product-card animate-fade" data-category="${product.category?._id || ''}">
      <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${escapeHtml(product.name || '')}">
      <h4>${escapeHtml(product.name || '')}</h4>
      <p class="price">${formattedPrice}</p>
      <div class="card-bottom">
        <div class="rating"><i class="fas fa-star"></i> ${rating}</div>
        <button class="btn-cart" type="button" data-id="${product._id}">Add To Cart</button>
      </div>
    </div>
  `;
}

function createSwiperSlide(product) {
  const price = product.price;
  const formattedPrice = formatCurrency(price);
  const rating = parseDecimal(product.ratings) || 0;

  return `
    <div class="swiper-slide product-card" data-category="${product.category?._id || ''}">
      <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${escapeHtml(product.name || '')}">
      <h4>${escapeHtml(product.name || '')}</h4>
      <p class="price">${formattedPrice}</p>
      <div class="card-bottom">
        <span class="rating">⭐ ${rating}</span>
        <button class="btn btn-cart" type="button" data-id="${product._id}">Add To Cart</button>
      </div>
    </div>
  `;
}

function createRecentSlide(product) {
  const price = product.price;
  const formattedPrice = formatCurrency(price);
  const rating = parseDecimal(product.ratings) || 0;

  return `
    <div class="swiper-slide">
      <div class="product-card">
        <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${escapeHtml(product.name || '')}">
        <h4>${escapeHtml(product.name || '')}</h4>
        <div class="price">${formattedPrice}</div>
        <div class="card-bottom">
          <span class="rating">★ ${rating}</span>
          <button class="btn-cart" type="button" data-id="${product._id}">Add To Cart</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ------------------------- categories & brands ------------------------- */

function renderCategories() {
  if (!elements.categoryGrid || !elements.categoryDropdown) return;
  elements.categoryGrid.innerHTML = '';
  elements.categoryDropdown.innerHTML = '';

  // All option (grid)
  const allGridOption = document.createElement('div');
  allGridOption.className = 'cat-box active';
  allGridOption.dataset.filter = 'all';
  allGridOption.textContent = 'All';
  elements.categoryGrid.appendChild(allGridOption);

  // All option dropdown
  const allDropdownOption = document.createElement('li');
  allDropdownOption.dataset.value = 'all';
  allDropdownOption.textContent = 'All Categories';
  elements.categoryDropdown.appendChild(allDropdownOption);

  allCategories.forEach(category => {
    const gridItem = document.createElement('div');
    gridItem.className = 'cat-box';
    gridItem.dataset.filter = category._id;
    gridItem.textContent = category.name;
    elements.categoryGrid.appendChild(gridItem);

    const dropdownItem = document.createElement('li');
    dropdownItem.dataset.value = category._id;
    dropdownItem.textContent = category.name;
    elements.categoryDropdown.appendChild(dropdownItem);
  });
}

function renderBrandFeature(products) {
  if (!elements.brandSwiperWrapper) return;
  elements.brandSwiperWrapper.innerHTML = '';
  const brandName = document.querySelector('.brand-name')?.textContent || '';

  // Attempt to find the brand by name; fallback to top brands slice
  let brandProducts = [];
  const foundBrand = allBrands.find(b => (brandName && b.name && b.name.includes(brandName.trim())));

  if (foundBrand) {
    brandProducts = products.filter(p => p.brand?._id === foundBrand._id).slice(0, 3);
  }
  if (!brandProducts.length) {
    brandProducts = products.slice(0, 3);
  }

  brandProducts.forEach(p => elements.brandSwiperWrapper.innerHTML += createSwiperSlide(p));

  // init or restart swiper
  if (state.brandSwiper && typeof state.brandSwiper.destroy === 'function') state.brandSwiper.destroy(true, true);
  initBrandSwiper();
}

function renderRecentProducts(products) {
  if (!elements.recentSwiperWrapper) return;
  elements.recentSwiperWrapper.innerHTML = '';

  // We assume 'products' are sorted newest-first from server (default)
  const recentProducts = (products || []).slice(0, 12);

  recentProducts.forEach(p => elements.recentSwiperWrapper.innerHTML += createRecentSlide(p));

  if (state.recentSwiper && typeof state.recentSwiper.destroy === 'function') state.recentSwiper.destroy(true, true);
  initRecentSwiper();
}

/* ------------------------- product fetching & rendering ------------------------- */

/**
 * Build query string from state
 */
function buildProductQuery({ page = 1, perPage = state.perPage } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', perPage);
  if (state.activeCategory && state.activeCategory !== 'all') params.set('category', state.activeCategory);
  if (state.userRequestedSearch) params.set('search', state.userRequestedSearch);
  if (state.productSort) params.set('sort', state.productSort);
  return params.toString();
}

/**
 * Fetch the next page of products for the current filter and append to state.products
 */
async function fetchNextProductsPage() {
  const nextPage = state.currentPage + 1;
  if (nextPage > state.totalPages) return false;

  const q = buildProductQuery({ page: nextPage });
  const resp = await fetchJson(`/api/products?${q}`, { showSpinner: false });
  if (!resp.success) return false;

  const pageItems = Array.isArray(resp.data) ? resp.data : [];
  state.products = state.products.concat(pageItems);
  state.currentPage = resp.meta?.page ?? nextPage;
  state.totalProducts = resp.meta?.total ?? state.totalProducts;
  state.totalPages = resp.meta?.pages ?? state.totalPages;
  return pageItems.length > 0;
}

/**
 * Load first page (or fresh page when filters/search changes)
 */
async function loadFirstProductsPage() {
  const q = buildProductQuery({ page: 1 });
  const resp = await fetchJson(`/api/products?${q}`, { showSpinner: true });
  if (!resp.success) {
    state.products = [];
    state.currentPage = 0;
    state.totalProducts = 0;
    state.totalPages = 1;
    renderProducts(); // will show no products
    return;
  }

  state.products = Array.isArray(resp.data) ? resp.data : [];
  state.currentPage = resp.meta?.page ?? 1;
  state.totalProducts = resp.meta?.total ?? state.products.length;
  state.totalPages = resp.meta?.pages ?? Math.max(1, Math.ceil(state.totalProducts / state.perPage));
}

/**
 * Render products area using accumulated state.products and visibleProducts
 */
function renderProducts() {
  if (!elements.productGrid) return;
  elements.productGrid.innerHTML = '';

  if (!state.products || state.products.length === 0) {
    elements.productGrid.innerHTML = `
      <div class="no-products">
        <i class="fas fa-tools"></i>
        <p>No products found</p>
      </div>`;
    elements.loadMoreBtn && (elements.loadMoreBtn.style.display = 'none');
    return;
  }

  // if a search was performed we might want to use filtered subset — but server already filtered
  const productsToShow = state.products.slice(0, state.visibleProducts);

  elements.productGrid.innerHTML = productsToShow.map(p => createProductCard(p)).join('');

  // show/hide load more —load more will fetch next server page if necessary
  if (state.visibleProducts < Math.min(state.totalProducts, state.products.length) || state.currentPage < state.totalPages) {
    elements.loadMoreBtn && (elements.loadMoreBtn.style.display = 'block');
  } else {
    elements.loadMoreBtn && (elements.loadMoreBtn.style.display = 'none');
  }

  // Update activeFilterBadge (category)
  if (state.activeCategory && state.activeCategory !== 'all') {
    const cat = allCategories.find(c => c._id === state.activeCategory);
    elements.activeFilterBadge && (elements.activeFilterBadge.textContent = cat?.name || '');
  } else {
    elements.activeFilterBadge && (elements.activeFilterBadge.textContent = '');
  }

  animateProductCards();
}

/* ------------------------- events ------------------------- */

function initEventListeners() {
  // Load more logic: when clicked, show more or fetch next page then show
  elements.loadMoreBtn?.addEventListener('click', async () => {
    state.visibleProducts += state.perPage; // show more cards locally

    // If visibleProducts exceeds currently fetched products and server has more pages, fetch next
    if (state.visibleProducts > state.products.length && state.currentPage < state.totalPages) {
      await fetchNextProductsPage();
    }

    renderProducts();
  });

  // Category filtering (grid boxes)
  // dynamic binding: delegate clicks on categoryGrid
  elements.categoryGrid?.addEventListener('click', async (e) => {
    const box = e.target.closest('.cat-box');
    if (!box) return;
    const newCat = box.dataset.filter || 'all';
    if (newCat === state.activeCategory) return;

    state.activeCategory = newCat;
    state.visibleProducts = state.perPage;
    // update active class
    document.querySelectorAll('.cat-box').forEach(b => b.classList.remove('active'));
    box.classList.add('active');
    elements.dropdownSelected && (elements.dropdownSelected.textContent = box.textContent);

    // fetch fresh page from server for this category
    await loadFirstProductsPage();
    renderProducts();

    // update brand feature / recent with new data
    renderBrandFeature(state.products);
    renderRecentProducts(state.products);
  });

  // Dropdown options (category)
  elements.categoryDropdown?.addEventListener('click', async (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const newCat = li.dataset.value || 'all';
    state.activeCategory = newCat;
    state.visibleProducts = state.perPage;
    elements.dropdownSelected && (elements.dropdownSelected.textContent = li.textContent);

    // update active class in grid
    document.querySelectorAll('.cat-box').forEach(box => {
      box.classList.toggle('active', box.dataset.filter === newCat);
    });

    await loadFirstProductsPage();
    renderProducts();
    renderBrandFeature(state.products);
    renderRecentProducts(state.products);
  });

  // Search UI
  document.querySelector('.search-bar button')?.addEventListener('click', async () => {
    const kw = elements.searchInput?.value?.trim() || '';
    state.userRequestedSearch = kw;
    state.visibleProducts = state.perPage;
    await loadFirstProductsPage();
    renderProducts();
    renderBrandFeature(state.products);
    renderRecentProducts(state.products);
  });

  elements.searchInput?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const kw = elements.searchInput.value.trim();
      state.userRequestedSearch = kw;
      state.visibleProducts = state.perPage;
      await loadFirstProductsPage();
      renderProducts();
      renderBrandFeature(state.products);
      renderRecentProducts(state.products);
    }
  });

  // Add to cart (delegated)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-cart');
    if (btn) {
      addToCart(btn.dataset.id);
    }
  });
}

/* ------------------------- cart ------------------------- */

function addToCart(productId) {
  const product = state.products.find(p => p._id === productId) || []; // if not loaded, you'll want to refetch product detail in future
  if (!product) return;

  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const existing = cart.find(i => i.id === productId);
  if (existing) existing.quantity += 1;
  else cart.push({
    id: productId,
    name: product.name,
    price: product.price?.$numberDecimal || product.price,
    image: product.images?.mainImage?.url || '',
    quantity: 1
  });

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showAddToCartFeedback();
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((s, it) => s + (it.quantity || 0), 0);
  elements.cartCount && (elements.cartCount.textContent = total);
}

function showAddToCartFeedback() {
  const feedback = document.createElement('div');
  feedback.className = 'cart-feedback';
  feedback.innerHTML = `<i class="fas fa-check-circle"></i> Added to cart!`;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.classList.add('show'), 10);
  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
}

/* ------------------------- animation & swipers ------------------------- */

function animateProductCards() {
  const productCards = document.querySelectorAll('.product-card.animate-fade');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  productCards.forEach(c => obs.observe(c));
}

function initBrandSwiper() {
  // ensure Swiper is available on the page
  if (typeof Swiper === 'undefined') return;
  state.brandSwiper = new Swiper(".mySwiper", {
    slidesPerView: 1.2,
    spaceBetween: 20,
    loop: true,
    pagination: { el: ".swiper-pagination", clickable: true },
    breakpoints: { 640: { slidesPerView: 1.5 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 2.5 } }
  });
}

function initRecentSwiper() {
  if (typeof Swiper === 'undefined') return;
  state.recentSwiper = new Swiper(".recent-swiper", {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }
  });
}

/* ------------------------- init / boot ------------------------- */

async function initApp() {
  elements.productGrid && (elements.productGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>');

  try {
    // header
    updateHeaderView();

    // categories & brands (small, safe to load all)
    const catsResp = await fetchJson('/api/categories', { showSpinner: false });
    allCategories = catsResp.success ? catsResp.data : [];

    const brandsResp = await fetchJson('/api/brands', { showSpinner: false });
    allBrands = brandsResp.success ? brandsResp.data : [];

    renderCategories();

    // load first page of products (server-side paging) using current activeCategory/search
    await loadFirstProductsPage();

    // render UI pieces
    renderProducts();
    renderBrandFeature(state.products);
    renderRecentProducts(state.products);

    // listeners and extra UI behavior
    initEventListeners();
    initMenuToggle();
    initSmoothScroll();
    initDropdown();
    initScrollReveal();
    initScrollToTop();
    updateYear();

    // set cart count
    updateCartCount();

  } catch (err) {
    console.error('initApp error', err);
    if (elements.productGrid) {
      elements.productGrid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Failed to load products</p></div>`;
    }
  }
}

/* ------------------------- misc UI helpers (menu, dropdown, scroll) ------------------------- */

function initMenuToggle() {
  const toggle = document.getElementById("menu-toggle");
  const navMenu = document.getElementById("nav-menu");
  const menuIcon = document.getElementById("menu-icon");
  toggle?.addEventListener("click", () => {
    navMenu.classList.toggle("active");
    menuIcon.classList.toggle("fa-bars");
    menuIcon.classList.toggle("fa-times");
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initDropdown() {
  const dropdown = document.getElementById("categoryDropdown");
  if (!dropdown) return;
  const selected = dropdown.querySelector(".dropdown-selected");
  const options = dropdown.querySelectorAll(".dropdown-options li");
  selected?.addEventListener("click", () => dropdown.classList.toggle("open"));
  options.forEach(option => option.addEventListener("click", () => {
    selected.textContent = option.textContent;
    dropdown.classList.remove("open");
  }));
  document.addEventListener("click", (e) => { if (!dropdown.contains(e.target)) dropdown.classList.remove("open"); });
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
  }, { threshold: 0.1 });
  document.querySelectorAll(".animate-fade-in, .animate-up").forEach(el => observer.observe(el));
}

function initScrollToTop() {
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  window.onscroll = function() { if (scrollTopBtn) scrollTopBtn.style.display = (document.documentElement.scrollTop > 300) ? "block" : "none"; };
  scrollTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function updateYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ------------------------- boot ------------------------- */

document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

