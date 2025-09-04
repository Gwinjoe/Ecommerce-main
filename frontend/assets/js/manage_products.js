import { gsap } from "gsap";
import showStatusModal from "./modal.js";
import { loadingIndicator } from "./loader.js";


// Google Analytics event tracking function
function trackEvent(eventName, eventParams = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, eventParams);
  } else {
    console.warn("Google Analytics not loaded, event not tracked:", eventName, eventParams);
  }
}

/* ---------------------- helpers ---------------------- */

const parseDecimal = (v) => {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof v.$numberDecimal !== 'undefined') {
    return parseFloat(v.$numberDecimal) || 0;
  }
  if (typeof v === 'object' && typeof v.toString === 'function') {
    const n = parseFloat(v.toString());
    return Number.isFinite(n) ? n : 0;
  }
  return parseFloat(v) || 0;
};

const formatCurrency = (value) => {
  const num = parseDecimal(value);
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(num);
};

async function fetchJson(endpoint, { showSpinner = false } = {}) {
  try {
    if (showSpinner) loadingIndicator.show("Loading...");
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json(); // expected: { success, data, meta }
  } catch (err) {
    console.error("fetchJson error:", err, endpoint);
    return { success: false, data: [], meta: {} };
  } finally {
    if (showSpinner) loadingIndicator.hide();
  }
}

/* ---------------------- Accessible confirm modal utility ---------------------- */

/**
 * showConfirmModal(message, options)
 * returns Promise<boolean> resolving to true if confirmed, false otherwise.
 * Accessible: focus trap, ESC to cancel, returns focus to previously focused element.
 */
function showConfirmModal(message = "Are you sure?", { confirmText = "Delete", cancelText = "Cancel" } = {}) {
  return new Promise((resolve) => {
    // Prevent multiple modals
    if (document.querySelector('.confirm-overlay')) {
      resolve(false);
      return;
    }

    const previousActive = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.style.cssText = `
      position: fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background: rgba(0,0,0,0.45); z-index: 9999; padding: 16px;
    `;

    // dialog container
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.style.cssText = `
      background:#fff; padding:20px; border-radius:8px; max-width:480px; width:100%;
      box-shadow:0 10px 30px rgba(0,0,0,0.25); text-align:center; outline: none;
    `;

    dialog.innerHTML = `
      <h2 id="confirm-title" style="margin:0 0 12px; font-size:18px; font-weight:600;">${escapeHtml(message)}</h2>
      <div style="margin-bottom:16px;"></div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button class="confirm-cancel" type="button" style="padding:8px 14px; border-radius:6px; background:#eee; border:0;">${escapeHtml(cancelText)}</button>
        <button class="confirm-yes" type="button" style="padding:8px 14px; border-radius:6px; background:#d9534f; color:#fff; border:0;">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // disable background scroll
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const yesBtn = dialog.querySelector('.confirm-yes');
    const noBtn = dialog.querySelector('.confirm-cancel');

    // focus management & trap
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(dialog.querySelectorAll(focusableSelectors)).filter(el => !el.hasAttribute('disabled'));
    let firstFocusable = focusable[0] || yesBtn;
    let lastFocusable = focusable[focusable.length - 1] || noBtn;

    const trap = (e) => {
      if (e.key === 'Tab') {
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      }
    };

    const cleanup = (result) => {
      window.removeEventListener('keydown', trap);
      // restore focus and body overflow
      if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
      document.body.style.overflow = previousBodyOverflow || '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(Boolean(result));
    };

    yesBtn.addEventListener('click', () => cleanup(true));
    noBtn.addEventListener('click', () => cleanup(false));

    // click outside to cancel
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });

    // Attach keyboard trap
    window.addEventListener('keydown', trap);
    // Focus primary
    setTimeout(() => {
      (firstFocusable || yesBtn).focus();
    }, 10);
  });
}

/* ---------------------- UI element refs ---------------------- */

const els = {
  productList: document.querySelector("#product-list"),
  noProducts: document.querySelector(".no-products"),
  pageInfo: document.querySelector("#page-info"),
  bulkActions: document.querySelector(".bulk-actions"),
  deleteSelectedBtn: document.querySelector(".delete-selected-btn"),
  assignCategoryBtn: document.querySelector(".assign-category-btn"),
  selectAllCheckbox: document.querySelector("#select-all"),
  filterSelect: document.querySelector("#filter"),
  bulkCategorySelect: document.querySelector("#bulk-category"),
  searchInput: document.querySelector("#search"),
  sortSelect: document.querySelector("#sort"),
  addProductBtn: document.querySelector(".add-product-btn"),
  productsTableContainer: document.querySelector(".products-table"),
  mobileContainer: document.querySelector(".products-table"),
  firstBtn: document.querySelector("#first-page"),
  prevBtn: document.querySelector("#prev-page"),
  nextBtn: document.querySelector("#next-page"),
  lastBtn: document.querySelector("#last-page"),
  productsCard: document.querySelector(".products-card"),
  controlsAndTable: document.querySelectorAll(".products-controls, .products-table, .pagination"),
  bulkCategorySelectElement: document.querySelector("#bulk-category"),
};

/* ---------------------- state ---------------------- */

const state = {
  currentPage: 1,
  perPage: 20,
  currentSort: "name-asc",
  currentFilter: "",
  currentSearch: "",
  pageCache: {},
  categories: [],
  productsOnPage: [],
  productsTotal: 0,
  productsPages: 1
};

/* ---------------------- init categories ---------------------- */

async function fetchCategories() {
  const resp = await fetchJson("/api/categories", { showSpinner: false });
  return resp.success ? resp.data : [];
}

async function loadCategories() {
  if (!els.filterSelect || !els.bulkCategorySelect) {
    console.error("Error: #filter or #bulk-category not found");
    return;
  }
  try {
    state.categories = await fetchCategories();
    els.filterSelect.innerHTML = '<option value="">All Categories</option>';
    els.bulkCategorySelect.innerHTML = '<option value="">Select Category</option>';
    state.categories.forEach(cat => {
      const o1 = document.createElement("option"); o1.value = cat._id; o1.textContent = cat.name; els.filterSelect.appendChild(o1);
      const o2 = document.createElement("option"); o2.value = cat._id; o2.textContent = cat.name; els.bulkCategorySelect.appendChild(o2);
    });
    gsap.from([els.filterSelect, els.bulkCategorySelect], { opacity: 0, duration: 0.5, ease: "power3.out" });
  } catch (err) {
    console.error("Error fetching categories:", err);
    els.filterSelect.innerHTML = '<option value="">Error loading categories</option>';
    els.bulkCategorySelect.innerHTML = '<option value="">Error loading categories</option>';
    if (els.noProducts) {
      els.noProducts.textContent = "Error loading data";
      els.noProducts.classList.add("active");
    }
  }
}

/* ---------------------- product fetching (paginated) ---------------------- */

function pageCacheKey({ page = 1, perPage = state.perPage, filter = state.currentFilter, search = state.currentSearch, sort = state.currentSort } = {}) {
  return `${filter}|${search}|${sort}|${perPage}|${page}`;
}

function buildProductsQuery({ page = 1, perPage = state.perPage, filter = state.currentFilter, search = state.currentSearch, sort = state.currentSort } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', perPage);
  if (filter) params.set('category', filter);
  if (search) params.set('search', search);
  if (sort) {
    if (sort === 'name-asc') params.set('sort', 'name');
    else if (sort === 'name-desc') params.set('sort', '-name');
    else if (sort === 'price-asc') params.set('sort', 'price');
    else if (sort === 'price-desc') params.set('sort', '-price');
    else params.set('sort', sort);
  }
  return params.toString();
}

async function fetchProductsPage(page = 1, { forceReload = false } = {}) {
  const key = pageCacheKey({ page });
  if (!forceReload && state.pageCache[key]) {
    return state.pageCache[key];
  }

  const q = buildProductsQuery({ page });
  const resp = await fetchJson(`/api/products?${q}`, { showSpinner: true });

  if (!resp.success) {
    state.pageCache[key] = { data: [], meta: resp.meta || {} };
    return state.pageCache[key];
  }

  const out = { data: Array.isArray(resp.data) ? resp.data : [], meta: resp.meta || {} };
  state.pageCache[key] = out;

  if (out.meta && out.meta.pages && out.meta.page < out.meta.pages) {
    const nextPage = (out.meta.page || page) + 1;
    const nextKey = pageCacheKey({ page: nextPage });
    if (!state.pageCache[nextKey]) {
      if (typeof window.requestIdleCallback === 'function') {
        requestIdleCallback(() => fetchJson(`/api/products?${buildProductsQuery({ page: nextPage })}`, { showSpinner: false }).then(r => {
          if (r.success) state.pageCache[nextKey] = { data: r.data || [], meta: r.meta || {} };
        }).catch(() => { }));
      } else {
        setTimeout(() => fetchJson(`/api/products?${buildProductsQuery({ page: nextPage })}`, { showSpinner: false }).then(r => {
          if (r.success) state.pageCache[nextKey] = { data: r.data || [], meta: r.meta || {} };
        }).catch(() => { }), 200);
      }
    }
  }

  return out;
}

/* ---------------------- render products table ---------------------- */

function renderProductsTable(items = [], page = 1, totalPages = 1) {
  if (!els.productList) return;

  els.productList.innerHTML = "";

  if (!items || items.length === 0) {
    els.noProducts && els.noProducts.classList.add("active");
    els.bulkActions && (els.bulkActions.style.display = "none");
    gsap.from(els.noProducts, { opacity: 0, duration: 0.5, ease: "power3.out" });
    return;
  }

  els.noProducts && els.noProducts.classList.remove("active");

  items.forEach((product, idx) => {
    const tr = document.createElement("tr");
    const priceStr = formatCurrency(product.price);
    tr.innerHTML = `
      <td><input type="checkbox" class="select-product" data-id="${product._id}" data-ga-event="select_product"></td>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.category?.name || '')}</td>
      <td>${priceStr}</td>
      <td>${product.stock ?? ''}</td>
      <td><img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${escapeHtml(product.name)}" style="height:40px; width:auto;"></td>
      <td>
        <button class="action-btn edit-btn" data-id="${product._id}" data-ga-event="edit_product"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete-btn" data-id="${product._id}" data-ga-event="delete_product"><i class="fas fa-trash"></i></button>
      </td>
    `;
    els.productList.appendChild(tr);
    gsap.from(tr, { opacity: 0, y: 20, duration: 0.4, ease: "power3.out", delay: idx * 0.03 });
  });

  if (window.innerWidth <= 768 && els.mobileContainer) {
    els.mobileContainer.innerHTML = "";
    items.forEach((product, idx) => {
      const card = document.createElement("div");
      card.className = "product-card";
      const priceStr = formatCurrency(product.price);
      card.innerHTML = `
        <div><input type="checkbox" class="select-product" data-id="${product._id}" data-ga-event="select_product"></div>
        <div><strong>Name:</strong> ${escapeHtml(product.name)}</div>
        <div><strong>Category:</strong> ${escapeHtml(product.category?.name || '')}</div>
        <div><strong>Price:</strong> ${priceStr}</div>
        <div><strong>Stock:</strong> ${product.stock ?? ''}</div>
        <div><img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${escapeHtml(product.name)}" style="height:60px; width:auto;"></div>
        <div class="actions">
          <button class="action-btn edit-btn" data-id="${product._id}" data-ga-event="edit_product"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete-btn" data-id="${product._id}" data-ga-event="delete_product"><i class="fas fa-trash"></i></button>
        </div>
      `;
      els.mobileContainer.appendChild(card);
      gsap.from(card, { opacity: 0, y: 10, duration: 0.35, ease: "power3.out", delay: idx * 0.03 });
    });
  }

  els.pageInfo && (els.pageInfo.textContent = `Page ${page} of ${totalPages}`);

  if (els.firstBtn && els.prevBtn && els.nextBtn && els.lastBtn) {
    els.firstBtn.disabled = page === 1;
    els.prevBtn.disabled = page === 1;
    els.nextBtn.disabled = page === totalPages;
    els.lastBtn.disabled = page === totalPages;
  }

  if (els.selectAllCheckbox) els.selectAllCheckbox.checked = false;

  updateBulkActions();
}

/* ---------------------- load page orchestration ---------------------- */

async function loadPage(page = 1, { forceReload = false } = {}) {
  try {
    const { data, meta } = await fetchProductsPage(page, { forceReload });
    const items = data || [];
    const total = meta?.total ?? items.length;
    const pages = meta?.pages ?? Math.max(1, Math.ceil(total / state.perPage));

    state.currentPage = meta?.page ?? page;
    state.productsOnPage = items;
    state.productsTotal = total;
    state.productsPages = pages;

    renderProductsTable(items, state.currentPage, pages);
  } catch (err) {
    console.error("loadPage error", err);
    if (els.productList) {
      els.productList.innerHTML = "";
      els.noProducts && (els.noProducts.textContent = "Error loading products", els.noProducts.classList.add("active"));
    }
  }
}

/* ---------------------- bulk actions & event handling ---------------------- */

function updateBulkActions() {
  if (!els.bulkActions || !els.deleteSelectedBtn || !els.assignCategoryBtn || !els.selectAllCheckbox) return;
  const selected = document.querySelectorAll(".select-product:checked");
  const allOnPage = document.querySelectorAll(".select-product");
  els.selectAllCheckbox.checked = selected.length > 0 && selected.length === allOnPage.length;

  if (selected.length > 0) {
    els.bulkActions.style.display = "flex";
    els.deleteSelectedBtn.disabled = false;
    els.assignCategoryBtn.disabled = !els.bulkCategorySelectElement?.value;
    gsap.from(els.bulkActions, { opacity: 0, y: 10, duration: 0.3, ease: "power3.out" });
  } else {
    els.bulkActions.style.display = "none";
    els.deleteSelectedBtn.disabled = true;
    els.assignCategoryBtn.disabled = true;
  }
}

/* ---------------------- boot & event wiring ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded fired (admin/products)");

  await loadCategories();
  await loadPage(1);

  if (els.productsCard) {
    gsap.from(els.productsCard, { opacity: 0, y: 50, duration: 0.7, ease: "power3.out" });
  }
  if (els.controlsAndTable && els.controlsAndTable.length) {
    gsap.from(els.controlsAndTable, { opacity: 0, y: 20, duration: 0.5, stagger: 0.05, ease: "power3.out", delay: 0.15 });
  }

  if (els.addProductBtn) {
    els.addProductBtn.addEventListener("click", () => {
      gsap.to(els.addProductBtn, {
        scale: 0.95, duration: 0.08, ease: "power2.in", onComplete: () => {
          gsap.to(els.addProductBtn, { scale: 1, duration: 0.08 });
          trackEvent("add_product_nav");
          window.location.href = "/admin/add_product";
        }
      });
    });
  }

  if (els.searchInput) {
    const debouncedSearch = (function() {
      let t;
      return function() {
        clearTimeout(t);
        t = setTimeout(async () => {
          state.currentSearch = els.searchInput.value.trim();
          state.currentPage = 1;
          // clear page cache for this filter/search/sort so results are fetched fresh
          Object.keys(state.pageCache).forEach(k => {
            if (k.startsWith(`${state.currentFilter}|`)) delete state.pageCache[k];
          });
          await loadPage(1);
          trackEvent("search_products", { query: state.currentSearch });
        }, 300);
      };
    })();
    els.searchInput.addEventListener("input", debouncedSearch);
  }

  if (els.sortSelect) {
    els.sortSelect.addEventListener("change", async () => {
      state.currentSort = els.sortSelect.value;
      state.currentPage = 1;
      Object.keys(state.pageCache).forEach(k => {
        if (k.startsWith(`${state.currentFilter}|${state.currentSearch}|`)) delete state.pageCache[k];
      });
      await loadPage(1);
      trackEvent("sort_products", { sort: state.currentSort });
    });
  }

  if (els.filterSelect) {
    els.filterSelect.addEventListener("change", async () => {
      state.currentFilter = els.filterSelect.value;
      state.currentPage = 1;
      Object.keys(state.pageCache).forEach(k => {
        if (k.startsWith(`${state.currentFilter}|${state.currentSearch}|${state.currentSort}|`)) delete state.pageCache[k];
      });
      await loadPage(1);
      trackEvent("filter_products", { filter: state.currentFilter });
    });
  }

  if (els.firstBtn) els.firstBtn.addEventListener("click", async () => { if (state.currentPage !== 1) { await loadPage(1); trackEvent("pagination_first"); } });
  if (els.prevBtn) els.prevBtn.addEventListener("click", async () => { if (state.currentPage > 1) { await loadPage(state.currentPage - 1); trackEvent("pagination_prev"); } });
  if (els.nextBtn) els.nextBtn.addEventListener("click", async () => { if (state.currentPage < state.productsPages) { await loadPage(state.currentPage + 1); trackEvent("pagination_next"); } });
  if (els.lastBtn) els.lastBtn.addEventListener("click", async () => { if (state.currentPage !== state.productsPages) { await loadPage(state.productsPages); trackEvent("pagination_last"); } });

  if (els.selectAllCheckbox) {
    els.selectAllCheckbox.addEventListener("change", (e) => {
      const checkboxes = document.querySelectorAll(".select-product");
      checkboxes.forEach(cb => cb.checked = els.selectAllCheckbox.checked);
      updateBulkActions();
      trackEvent("select_all_products", { checked: els.selectAllCheckbox.checked });
    });
  }

  if (els.productsTableContainer) {
    els.productsTableContainer.addEventListener("change", (e) => {
      if (e.target && e.target.classList.contains("select-product")) {
        updateBulkActions();
        trackEvent("select_product", { product_id: e.target.dataset.id, checked: e.target.checked });
      }
    });
  }

  // Delegated click events for edit/delete
  document.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest(".action-btn");
    if (!actionBtn) return;

    const id = actionBtn.dataset.id;
    if (actionBtn.classList.contains("edit-btn")) {
      gsap.to(actionBtn, {
        scale: 0.95, duration: 0.08, ease: "power2.in", onComplete: () => {
          gsap.to(actionBtn, { scale: 1, duration: 0.08 });
          trackEvent("edit_product", { product_id: id });
          window.location.href = `/admin/edit_product?id=${id}`;
        }
      });
    } else if (actionBtn.classList.contains("delete-btn")) {
      // Use accessible custom confirm modal instead of native confirm()
      const ok = await showConfirmModal("Are you sure you want to delete this product?", { confirmText: "Delete", cancelText: "Cancel" });
      if (!ok) return;
      loadingIndicator.show("Deleting...");
      const row = actionBtn.closest("tr") || actionBtn.closest(".product-card");
      gsap.to(row, {
        opacity: 0, x: -50, duration: 0.4, ease: "power3.in", onComplete: async () => {
          try {
            const res = await fetch(`/api/delete_product/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) showStatusModal("success", json.message || "Deleted");
            else showStatusModal("failed", json.message || "Failed to delete");
          } catch (err) {
            console.error("delete error", err);
            showStatusModal("failed", "Server error");
          } finally {
            loadingIndicator.hide();
            const keyForCurrent = pageCacheKey({ page: state.currentPage });
            delete state.pageCache[keyForCurrent];
            await loadPage(state.currentPage);
          }
          trackEvent("delete_product", { product_id: id });
        }
      });
    }
  });

  // Bulk delete
  if (els.deleteSelectedBtn) {
    els.deleteSelectedBtn.addEventListener("click", async () => {
      const selected = Array.from(document.querySelectorAll(".select-product:checked")).map(cb => cb.dataset.id);
      if (selected.length === 0) return;

      const ok = await showConfirmModal(`Are you sure you want to delete ${selected.length} product(s)?`, { confirmText: "Delete", cancelText: "Cancel" });
      if (!ok) return;

      loadingIndicator.show("Deleting...");
      const rows = selected.map(id => document.querySelector(`.select-product[data-id="${id}"]`)?.closest("tr")).filter(Boolean);
      gsap.to(rows, { opacity: 0, x: -50, duration: 0.4, ease: "power3.in", stagger: 0.05 });

      try {
        const resp = await fetch("/api/delete_multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedIds: selected })
        });
        const json = await resp.json();
        if (json.success) showStatusModal("success", json.message || "Deleted selected");
        else showStatusModal("failed", json.message || "Failed to delete selected");
      } catch (err) {
        console.error("bulk delete error", err);
        showStatusModal("failed", "Server error");
      } finally {
        loadingIndicator.hide();
        Object.keys(state.pageCache).forEach(k => {
          if (k.startsWith(`${state.currentFilter}|${state.currentSearch}|${state.currentSort}|`)) delete state.pageCache[k];
        });
        await loadPage(Math.max(1, state.currentPage));
        trackEvent("bulk_delete_products", { count: selected.length });
      }
    });
  } else {
    console.error("Error: .delete-selected-btn not found");
  }

  // Bulk assign category
  if (els.assignCategoryBtn && els.bulkCategorySelect) {
    els.bulkCategorySelect.addEventListener("change", () => {
      updateBulkActions();
      trackEvent("bulk_category_select", { category: els.bulkCategorySelect.value });
    });

    els.assignCategoryBtn.addEventListener("click", async () => {
      const selected = Array.from(document.querySelectorAll(".select-product:checked")).map(cb => cb.dataset.id);
      const newCategory = els.bulkCategorySelect.value;
      if (selected.length === 0 || !newCategory) return;
      loadingIndicator.show("Updating...");
      try {
        const resp = await fetch("/api/edit_multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedIds: selected, category: newCategory })
        });
        const json = await resp.json();
        if (json.success) showStatusModal("success", json.message || "Category assigned");
        else showStatusModal("failed", json.message || "Failed to assign category");
      } catch (err) {
        console.error("bulk assign error", err);
        showStatusModal("failed", "Server error");
      } finally {
        loadingIndicator.hide();
        Object.keys(state.pageCache).forEach(k => {
          if (k.startsWith(`${state.currentFilter}|${state.currentSearch}|${state.currentSort}|`)) delete state.pageCache[k];
        });
        await loadPage(state.currentPage);
        els.bulkCategorySelect.value = "";
        updateBulkActions();
        trackEvent("bulk_assign_category", { category: newCategory, count: selected.length });
      }
    });
  } else {
    console.error("Error: .assign-category-btn or #bulk-category not found");
  }

  if (els.productsTableContainer) {
    els.productsTableContainer.addEventListener("change", (e) => {
      if (e.target.classList.contains("select-product")) {
        updateBulkActions();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (state.productsOnPage && state.productsOnPage.length) renderProductsTable(state.productsOnPage, state.currentPage, state.productsPages);
  });

});

/* ---------------------- tiny helpers ---------------------- */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

