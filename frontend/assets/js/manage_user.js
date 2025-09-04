
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import showStatusModal from "./modal.js";
import { loadingIndicator } from "./loader.js";

console.log("admin-users.js loaded");

/* ---------------------- small helpers ---------------------- */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeInput(input = "") {
  return String(input).trim();
}

async function fetchJson(endpoint, { showSpinner = false } = {}) {
  try {
    if (showSpinner) loadingIndicator.show("Loading...");
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json(); // expects { success, data, meta }
  } catch (err) {
    console.error("fetchJson error:", err, endpoint);
    return { success: false, data: [], meta: {} };
  } finally {
    if (showSpinner) loadingIndicator.hide();
  }
}

/* ---------------------- accessible confirm modal ---------------------- */

function showConfirmModal(message = "Are you sure?", { confirmText = "Delete", cancelText = "Cancel" } = {}) {
  return new Promise((resolve) => {
    if (document.querySelector('.confirm-overlay')) {
      resolve(false);
      return;
    }

    const previousActive = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.cssText = `
      position: fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background: rgba(0,0,0,0.45); z-index: 9999; padding: 16px;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.cssText = `
      background:#fff; padding:18px; border-radius:8px; max-width:460px; width:100%;
      box-shadow:0 10px 30px rgba(0,0,0,0.25); text-align:center; outline: none;
    `;
    dialog.innerHTML = `
      <h2 style="margin:0 0 12px; font-size:18px;">${escapeHtml(message)}</h2>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button class="confirm-cancel" type="button" style="padding:8px 14px; border-radius:6px; background:#eee; border:0;">${escapeHtml(cancelText)}</button>
        <button class="confirm-yes" type="button" style="padding:8px 14px; border-radius:6px; background:#d9534f; color:#fff; border:0;">${escapeHtml(confirmText)}</button>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const yesBtn = dialog.querySelector('.confirm-yes');
    const noBtn = dialog.querySelector('.confirm-cancel');

    const focusable = Array.from(dialog.querySelectorAll('button'));
    const firstFocusable = focusable[0] || yesBtn;
    const lastFocusable = focusable[focusable.length - 1] || noBtn;

    const trap = (e) => {
      if (e.key === 'Tab') {
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
      if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
      document.body.style.overflow = prevBodyOverflow || '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(Boolean(result));
    };

    yesBtn.addEventListener('click', () => cleanup(true));
    noBtn.addEventListener('click', () => cleanup(false));

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    window.addEventListener('keydown', trap);
    setTimeout(() => (firstFocusable || yesBtn).focus(), 10);
  });
}

/* ---------------------- DOM refs & state ---------------------- */

const refs = {
  tableBody: document.getElementById("userTableBody"),
  modal: document.getElementById("userModal"),
  yearSpan: document.querySelector(".year"),
  menuToggle: document.querySelector(".menu-toggle"),
  headerExtras: document.querySelector(".header-extras"),
  themeToggleBtn: document.querySelector(".theme-toggle-btn"),
  languageToggle: document.querySelector(".language-toggle"),
  languageSelector: document.querySelector(".language-selector"),
  notificationBtn: document.querySelector(".notification-btn"),
  settingsBtn: document.querySelector(".settings-btn"),
  userProfile: document.querySelector(".user-profile"),
  scrollTopBtn: document.querySelector(".scroll-top-btn"),
  newsletterForm: document.querySelector(".footer-newsletter"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  pageInfo: document.querySelector("#page-info"),
  firstBtn: document.querySelector("#first-page"),
  prevBtn: document.querySelector("#prev-page"),
  nextBtn: document.querySelector("#next-page"),
  lastBtn: document.querySelector("#last-page"),
  saveButton: () => document.querySelector(".save-user")
};

const state = {
  currentPage: 1,
  perPage: 10,
  totalPages: 1,
  totalUsers: 0,
  currentSort: 'name',
  currentSearch: '',
  pageCache: {}, // key: filter|search|sort|perPage|page
  usersOnPage: []
};

/* ---------------------- UI animations ---------------------- */

if (refs.yearSpan) refs.yearSpan.textContent = new Date().getFullYear();

gsap.from(".sticky-header", { y: -100, opacity: 0, duration: 0.8, ease: "power2.out", delay: 0.2 });
gsap.from(".logo", { x: -50, opacity: 0, duration: 0.8, ease: "power2.out", delay: 0.4 });
gsap.from(".header-extras > *", { x: 50, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", delay: 0.6 });

gsap.from(".footer-column", {
  y: 50, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power2.out",
  scrollTrigger: { trigger: ".site-footer", start: "top 80%", toggleActions: "play none none none" }
});
gsap.from(".footer-bottom", {
  y: 20, opacity: 0, duration: 0.8, ease: "power2.out",
  scrollTrigger: { trigger: ".footer-bottom", start: "top 90%", toggleActions: "play none none none" }
});

/* ---------------------- page cache helpers ---------------------- */

function cacheKey({ page = state.currentPage, perPage = state.perPage, search = state.currentSearch, sort = state.currentSort } = {}) {
  return `${search}|${sort}|${perPage}|${page}`;
}

function buildQuery({ page = 1, perPage = state.perPage, search = state.currentSearch, sort = state.currentSort } = {}) {
  const p = new URLSearchParams();
  p.set("page", page);
  p.set("limit", perPage);
  if (search) p.set("search", search);
  if (sort) p.set("sort", sort);
  return p.toString();
}

/* ---------------------- fetching (paginated) ---------------------- */

async function fetchUsersPage(page = 1, { forceReload = false } = {}) {
  const key = cacheKey({ page });
  if (!forceReload && state.pageCache[key]) return state.pageCache[key];

  const q = buildQuery({ page });
  const resp = await fetchJson(`/api/users?${q}`, { showSpinner: true });
  if (!resp.success) {
    state.pageCache[key] = { data: [], meta: resp.meta || {} };
    return state.pageCache[key];
  }

  const out = { data: Array.isArray(resp.data) ? resp.data : [], meta: resp.meta || {} };
  state.pageCache[key] = out;

  // prefetch next page in idle time
  const currentPage = out.meta?.page ?? page;
  const pages = out.meta?.pages ?? 1;
  if (currentPage < pages) {
    const nextPage = currentPage + 1;
    const nextKey = cacheKey({ page: nextPage });
    if (!state.pageCache[nextKey]) {
      const fetchNext = async () => {
        const r = await fetchJson(`/api/users?${buildQuery({ page: nextPage })}`, { showSpinner: false });
        if (r.success) state.pageCache[nextKey] = { data: r.data || [], meta: r.meta || {} };
      };
      if (typeof window.requestIdleCallback === 'function') requestIdleCallback(fetchNext);
      else setTimeout(fetchNext, 200);
    }
  }

  return out;
}

/* ---------------------- rendering ---------------------- */

function renderTable(users = [], page = 1, totalPages = 1) {
  if (!refs.tableBody) return;
  refs.tableBody.innerHTML = "";

  if (!users || users.length === 0) {
    refs.tableBody.innerHTML = `<tr><td colspan="5" class="no-users">No users found</td></tr>`;
    if (refs.pageInfo) refs.pageInfo.textContent = `Page ${page} of ${totalPages}`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.name || '')}</td>
      <td>${escapeHtml(u.email || '')}</td>
      <td>${escapeHtml(String(u.status ?? ''))}</td>
      <td>${escapeHtml(String(u.admin ?? ''))}</td>
      <td>
        <button class="action-btn" data-action="view" data-id="${u._id}" aria-label="View User"><i class="fas fa-eye"></i></button>
        <button class="action-btn" data-action="edit" data-id="${u._id}" aria-label="Edit User"><i class="fas fa-edit"></i></button>
        <button class="action-btn" data-action="delete" data-id="${u._id}" aria-label="Delete User"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    refs.tableBody.appendChild(tr);
  });

  gsap.from(refs.tableBody.querySelectorAll("tr"), { opacity: 0, y: 10, stagger: 0.03, duration: 0.25 });

  if (refs.pageInfo) refs.pageInfo.textContent = `Page ${page} of ${totalPages}`;

  // update pagination UI
  if (refs.firstBtn) refs.firstBtn.disabled = page === 1;
  if (refs.prevBtn) refs.prevBtn.disabled = page === 1;
  if (refs.nextBtn) refs.nextBtn.disabled = page === totalPages;
  if (refs.lastBtn) refs.lastBtn.disabled = page === totalPages;
}

/* ---------------------- modal open/close/save ---------------------- */

let isModalAnimating = false;

async function openModal(mode = "view", id = "") {
  const modal = refs.modal;
  if (!modal || isModalAnimating) return;
  isModalAnimating = true;

  const titleEl = modal.querySelector("#modalTitle");
  const userIdInput = modal.querySelector("#userId");
  const nameInput = modal.querySelector("#userName");
  const emailInput = modal.querySelector("#userEmail");
  const passwordInput = modal.querySelector("#password");
  const statusInput = modal.querySelector("#userStatus");
  const saveBtn = refs.saveButton ? refs.saveButton() : null;

  // reset
  if (userIdInput) userIdInput.value = "";
  if (nameInput) nameInput.value = "";
  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (statusInput) statusInput.value = "false";

  if (mode === "add") {
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-user-plus"></i> Add User`;
    if (nameInput) nameInput.disabled = false;
    if (emailInput) emailInput.disabled = false;
    if (passwordInput) passwordInput.disabled = false;
    if (statusInput) statusInput.disabled = false;
    if (saveBtn) saveBtn.style.display = "block";
  } else {
    // fetch user detail from server (fresh) or from cache
    let user = null;
    // try to find in cached pages
    for (const k of Object.keys(state.pageCache)) {
      const pageData = state.pageCache[k];
      if (pageData && pageData.data) {
        user = pageData.data.find(u => String(u._id) === String(id));
        if (user) break;
      }
    }
    // if not found, fetch single user
    if (!user) {
      const resp = await fetchJson(`/api/users/${id}`, { showSpinner: true });
      if (resp.success) user = resp.data;
    }

    if (!user) {
      isModalAnimating = false;
      showStatusModal("failed", "User not found");
      return;
    }

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-user-${mode === "edit" ? "edit" : "circle"}"></i> ${mode === "edit" ? "Edit" : "View"} User`;
    if (userIdInput) userIdInput.value = user._id || "";
    if (nameInput) nameInput.value = user.name || "";
    if (emailInput) emailInput.value = user.email || "";
    if (passwordInput) passwordInput.value = "";
    if (statusInput) statusInput.value = user.admin ? "true" : "false";

    const isView = mode === "view";
    if (nameInput) nameInput.disabled = isView;
    if (emailInput) emailInput.disabled = isView;
    if (passwordInput) passwordInput.disabled = isView;
    if (statusInput) statusInput.disabled = isView;
    if (saveBtn) saveBtn.style.display = isView ? "none" : "block";
  }

  modal.classList.add("active");
  gsap.fromTo(modal.querySelector(".modal-content"), { scale: 0.9, opacity: 0 }, {
    scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.7)",
    onComplete: () => { isModalAnimating = false; }
  });
}

function closeModal() {
  const modal = refs.modal;
  if (!modal || isModalAnimating) return;
  isModalAnimating = true;
  gsap.to(modal.querySelector(".modal-content"), {
    scale: 0.9, opacity: 0, duration: 0.22, ease: "back.in(1.7)",
    onComplete: () => {
      modal.classList.remove("active");
      gsap.set(modal.querySelector(".modal-content"), { scale: 1, opacity: 1 });
      isModalAnimating = false;
    }
  });
}

async function saveUser() {
  const modal = refs.modal;
  if (!modal) return;
  const userIdInput = modal.querySelector("#userId");
  const nameInput = modal.querySelector("#userName");
  const emailInput = modal.querySelector("#userEmail");
  const passwordInput = modal.querySelector("#password");
  const statusInput = modal.querySelector("#userStatus");

  const id = userIdInput?.value || "";
  const name = sanitizeInput(nameInput?.value || "");
  const email = sanitizeInput(emailInput?.value || "");
  const admin = statusInput?.value === "true";
  const password = passwordInput?.value || "";

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showStatusModal("failed", "Invalid input");
    return;
  }

  if (id) {
    // update
    loadingIndicator.show("Updating...");
    try {
      const res = await fetch("/api/edit_user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, email, admin, password })
      });
      const json = await res.json();
      if (json.success) showStatusModal("success", json.message || "Updated");
      else showStatusModal("failed", json.message || "Failed to update");
      // clear cache and reload current page
      Object.keys(state.pageCache).forEach(k => delete state.pageCache[k]);
      await loadPage(state.currentPage, { forceReload: true });
    } catch (err) {
      console.error("saveUser update error", err);
      showStatusModal("failed", "Server error");
    } finally {
      loadingIndicator.hide();
    }
  } else {
    // create
    loadingIndicator.show("Creating...");
    try {
      const res = await fetch("/api/add_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, admin, password })
      });
      const json = await res.json();
      if (json.success) showStatusModal("success", json.message || "Created");
      else showStatusModal("failed", json.message || "Failed to create");
      Object.keys(state.pageCache).forEach(k => delete state.pageCache[k]);
      await loadPage(1, { forceReload: true });
    } catch (err) {
      console.error("saveUser create error", err);
      showStatusModal("failed", "Server error");
    } finally {
      loadingIndicator.hide();
    }
  }

  closeModal();
}

/* ---------------------- delete user ---------------------- */

async function deleteUserById(id) {
  const ok = await showConfirmModal("Are you sure you want to delete this user?", { confirmText: "Delete", cancelText: "Cancel" });
  if (!ok) return;

  loadingIndicator.show("Deleting user...");
  try {
    const res = await fetch(`/api/delete_user/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) showStatusModal("success", json.message || "Deleted");
    else showStatusModal("failed", json.message || "Failed to delete");
  } catch (err) {
    console.error("delete user error", err);
    showStatusModal("failed", "Server error");
  } finally {
    loadingIndicator.hide();
    // clear cache & reload current page (adjust page if needed)
    Object.keys(state.pageCache).forEach(k => delete state.pageCache[k]);
    // If deleting the last item on page, move back a page
    await loadPage(state.currentPage, { forceReload: true });
  }
}

/* ---------------------- load & orchestration ---------------------- */

async function loadPage(page = 1, { forceReload = false } = {}) {
  try {
    const { data, meta } = await fetchUsersPage(page, { forceReload });
    const items = data || [];
    const total = meta?.total ?? items.length;
    const pages = meta?.pages ?? Math.max(1, Math.ceil(total / state.perPage));

    state.currentPage = meta?.page ?? page;
    state.totalPages = pages;
    state.totalUsers = total;
    state.usersOnPage = items;

    renderTable(items, state.currentPage, pages);
  } catch (err) {
    console.error("loadPage error", err);
    if (refs.tableBody) refs.tableBody.innerHTML = `<tr><td colspan="5">Error loading users</td></tr>`;
  }
}

/* ---------------------- UI wiring (delegation) ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  // basic header controls (mirrors original)
  if (refs.menuToggle && refs.headerExtras) {
    refs.menuToggle.addEventListener("click", () => {
      refs.headerExtras.classList.toggle("active");
      gsap.to(refs.headerExtras, {
        height: refs.headerExtras.classList.contains("active") ? "auto" : 0,
        opacity: refs.headerExtras.classList.contains("active") ? 1 : 0,
        duration: 0.3, ease: "power2.out"
      });
    });
  }

  if (refs.themeToggleBtn) {
    refs.themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      const i = refs.themeToggleBtn.querySelector("i");
      i && i.classList.toggle("fa-moon", !isDark);
      i && i.classList.toggle("fa-sun", isDark);
    });
  }

  // scroll to top trigger
  if (refs.scrollTopBtn) {
    refs.scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    ScrollTrigger.create({
      trigger: document.body,
      start: "top -200",
      end: "bottom bottom",
      onUpdate: (self) => refs.scrollTopBtn.classList.toggle("active", self.progress > 0.1)
    });
  }

  // initial load page 1
  await loadPage(1);

  // animate containers
  const productsCard = document.querySelector(".products-card");
  if (productsCard) gsap.from(productsCard, { opacity: 0, y: 40, duration: 0.6, ease: "power2.out" });
  const controls = document.querySelectorAll(".users-controls, .users-table, .pagination");
  if (controls && controls.length) gsap.from(controls, { opacity: 0, y: 12, stagger: 0.05, duration: 0.35 });

  // delegated action buttons (view/edit/delete)
  if (refs.tableBody) {
    refs.tableBody.addEventListener("click", async (e) => {
      const btn = e.target.closest(".action-btn");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "view") openModal("view", id);
      else if (action === "edit") openModal("edit", id);
      else if (action === "delete") deleteUserById(id);
    });
  }

  // pagination buttons (if present)
  if (refs.firstBtn) refs.firstBtn.addEventListener("click", async () => { if (state.currentPage !== 1) await loadPage(1); });
  if (refs.prevBtn) refs.prevBtn.addEventListener("click", async () => { if (state.currentPage > 1) await loadPage(state.currentPage - 1); });
  if (refs.nextBtn) refs.nextBtn.addEventListener("click", async () => { if (state.currentPage < state.totalPages) await loadPage(state.currentPage + 1); });
  if (refs.lastBtn) refs.lastBtn.addEventListener("click", async () => { if (state.currentPage !== state.totalPages) await loadPage(state.totalPages); });

  // search (server-driven)
  if (refs.searchInput) {
    let t;
    refs.searchInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        state.currentSearch = sanitizeInput(refs.searchInput.value);
        // purge cache for this search/sort
        Object.keys(state.pageCache).forEach(k => delete state.pageCache[k]);
        state.currentPage = 1;
        await loadPage(1, { forceReload: true });
      }, 300);
    });
  }

  // sort (server-driven)
  if (refs.sortSelect) {
    refs.sortSelect.addEventListener("change", async () => {
      state.currentSort = refs.sortSelect.value || 'name';
      Object.keys(state.pageCache).forEach(k => delete state.pageCache[k]);
      state.currentPage = 1;
      await loadPage(1, { forceReload: true });
    });
  }

  // modal save button
  const saveBtn = refs.saveButton ? refs.saveButton() : null;
  if (saveBtn) saveBtn.addEventListener("click", saveUser);

  // modal close via elements inside modal (if any) and global close function
  document.addEventListener("click", (e) => {
    if (e.target.matches(".modal-close") || e.target.closest(".modal-close")) {
      closeModal();
    }
  });

  // Newsletter subscription (kept from original)
  if (refs.newsletterForm) {
    const btn = refs.newsletterForm.querySelector("button");
    const input = refs.newsletterForm.querySelector("input");
    if (btn && input) {
      btn.addEventListener("click", () => {
        const email = input.value.trim();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          console.log(`Subscribed with email: ${email}`);
          input.value = "";
        } else {
          console.log("Invalid email");
        }
      });
    }
  }
});

