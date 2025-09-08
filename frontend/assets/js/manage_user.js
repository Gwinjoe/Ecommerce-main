import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { updateHeader } from "./user-details.js";

gsap.registerPlugin(ScrollTrigger);
import showStatusModal from "./modal.js";
import { loadingIndicator } from "./loader.js";


updateHeader()
// initial users fetch (keeps your original approach — relies on module top-level await)
const response = await fetch("/api/users");
const results = await response.json();
const users = results.data;

const tableBody = document.getElementById("userTableBody");
const modal = document.getElementById("userModal");
const yearSpan = document.querySelector(".year");
const menuToggle = document.querySelector(".menu-toggle");
const headerExtras = document.querySelector(".header-extras");
const themeToggleBtn = document.querySelector(".theme-toggle-btn");
const languageToggle = document.querySelector(".language-toggle");
const languageSelector = document.querySelector(".language-selector");
const notificationBtn = document.querySelector(".notification-btn");
const settingsBtn = document.querySelector(".settings-btn");
const userProfile = document.querySelector(".user-profile");
const scrollTopBtn = document.querySelector(".scroll-top-btn");
const newsletterForm = document.querySelector(".footer-newsletter");

let isModalAnimating = false;

// Set current year in footer
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// Header Animations
gsap.from(".sticky-header", { y: -100, opacity: 0, duration: 0.8, ease: "power2.out", delay: 0.2 });
gsap.from(".logo", { x: -50, opacity: 0, duration: 0.8, ease: "power2.out", delay: 0.4 });
gsap.from(".header-extras > *", { x: 50, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", delay: 0.6 });

// Footer Animations
gsap.from(".footer-column", {
  y: 50,
  opacity: 0,
  duration: 0.8,
  stagger: 0.2,
  ease: "power2.out",
  scrollTrigger: { trigger: ".site-footer", start: "top 80%", toggleActions: "play none none none" }
});
gsap.from(".footer-bottom", {
  y: 20,
  opacity: 0,
  duration: 0.8,
  ease: "power2.out",
  scrollTrigger: { trigger: ".footer-bottom", start: "top 90%", toggleActions: "play none none none" }
});

// Scroll to Top Button
if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  ScrollTrigger.create({
    trigger: document.body,
    start: "top -200",
    end: "bottom bottom",
    onUpdate: (self) => {
      scrollTopBtn.classList.toggle("active", self.progress > 0.1);
    }
  });
}

// Menu Toggle
if (menuToggle && headerExtras) {
  menuToggle.addEventListener("click", () => {
    headerExtras.classList.toggle("active");
    gsap.to(headerExtras, {
      height: headerExtras.classList.contains("active") ? "auto" : 0,
      opacity: headerExtras.classList.contains("active") ? 1 : 0,
      duration: 0.3,
      ease: "power2.out"
    });
  });
}

// Theme Toggle
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    const icon = themeToggleBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-moon", !isDark);
      icon.classList.toggle("fa-sun", isDark);
    }
  });
}

// Language Selector
if (languageToggle && languageSelector) {
  languageToggle.addEventListener("click", () => {
    languageSelector.classList.toggle("active");
  });
  document.querySelectorAll(".language-options li").forEach(item => {
    item.addEventListener("click", () => {
      const lang = item.getAttribute("data-lang");
      console.log(`Language selected: ${lang}`);
      languageSelector.classList.remove("active");
    });
  });
}

// Profile Dropdown
if (userProfile) {
  userProfile.addEventListener("click", () => {
    userProfile.classList.toggle("active");
  });
}

// Notification Button
if (notificationBtn) {
  notificationBtn.addEventListener("click", () => {
    console.log("Notifications opened");
  });
}

// Settings Button
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    console.log("Settings opened");
  });
}

// Newsletter Subscription
if (newsletterForm) {
  const btn = newsletterForm.querySelector("button");
  const input = newsletterForm.querySelector("input");
  if (btn && input) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
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

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (languageSelector && languageToggle && !languageSelector.contains(e.target) && !languageToggle.contains(e.target)) {
    languageSelector.classList.remove("active");
  }
  if (userProfile && !userProfile.contains(e.target)) {
    userProfile.classList.remove("active");
  }
});

/* ---------------------- helpers ---------------------- */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeInput(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/* ---------------------- Confirmation modal (robust) ---------------------- */

/**
 * showConfirmModal(message, opts) -> Promise<boolean>
 * Creates an accessible confirm dialog, traps focus and returns true if confirmed.
 */
function showConfirmModal(message = "Are you sure?", { confirmText = "Yes", cancelText = "Cancel" } = {}) {
  return new Promise((resolve) => {
    // Remove any leftover overlays (defensive)
    const existing = document.querySelector(".confirm-overlay");
    if (existing) existing.remove();

    const previousActive = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      display:flex;
      align-items:center;
      justify-content:center;
      background: rgba(0,0,0,0.45);
      z-index: 12000;
      padding: 16px;
      backdrop-filter: blur(2px);
    `;

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.style.cssText = `
      background: var(--surface, #fff);
      color: var(--text, #111);
      padding:18px;
      border-radius:12px;
      max-width:480px;
      width:100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      text-align:center;
      font-family: inherit;
      transform: translateY(8px);
      opacity: 0;
    `;

    dialog.innerHTML = `
      <div style="font-size:16px; margin-bottom:16px;">${escapeHtml(message)}</div>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:4px;">
        <button class="confirm-cancel" type="button" style="padding:8px 14px; border-radius:8px; background:#f0f0f0; border:0;">${escapeHtml(cancelText)}</button>
        <button class="confirm-yes" type="button" style="padding:8px 14px; border-radius:8px; background:#d9534f; color:#fff; border:0;">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // animate dialog entrance
    requestAnimationFrame(() => {
      dialog.style.transition = "all 220ms cubic-bezier(.2,.9,.2,1)";
      dialog.style.transform = "translateY(0)";
      dialog.style.opacity = "1";
    });

    const yesBtn = dialog.querySelector(".confirm-yes");
    const noBtn = dialog.querySelector(".confirm-cancel");
    const focusable = Array.from(dialog.querySelectorAll("button"));
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function cleanup(result) {
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      document.body.style.overflow = prevOverflow || "";
      if (previousActive && typeof previousActive.focus === "function") previousActive.focus();
      resolve(Boolean(result));
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === "Tab") {
        // trap focus within dialog
        if (focusable.length === 0) { e.preventDefault(); return; }
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
      }
    }

    yesBtn.addEventListener("click", () => cleanup(true));
    noBtn.addEventListener("click", () => cleanup(false));
    overlay.addEventListener("mousedown", (ev) => { if (ev.target === overlay) cleanup(false); });

    window.addEventListener("keydown", onKey);
    setTimeout(() => { (firstFocusable || yesBtn).focus(); }, 20);
  });
}

/* ---------------------- Table Rendering ---------------------- */

function renderTable(data) {
  if (!tableBody) return;
  tableBody.innerHTML = "";
  data.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${sanitizeInput(user.name)}</td>
            <td>${sanitizeInput(user.email)}</td>
            <td>${sanitizeInput(user.status)}</td>
            <td>${sanitizeInput(user.admin)}</td>
            <td>
                <button class="action-btn" data-action="view" data-id="${user._id.toString()}" aria-label="View User"><i class="fas fa-eye"></i></button>
                <button class="action-btn" data-action="edit" data-id="${user._id.toString()}" aria-label="Edit User"><i class="fas fa-edit"></i></button>
                <button class="action-btn" data-action="delete" data-id="${user._id.toString()}" aria-label="Delete User"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
    tableBody.appendChild(row);
  });
  gsap.from(tableBody.querySelectorAll("tr"), { opacity: 0, y: 10, stagger: 0.06, duration: 0.28 });
}

/* ---------------------- modal open/close/save ---------------------- */

window.openModal = function(mode, id) {
  if (!modal || isModalAnimating) return;
  isModalAnimating = true;

  modal.classList.remove("active");
  gsap.set(".modal-content", { scale: 1, opacity: 1 });

  const title = document.getElementById("modalTitle");
  const userIdInput = document.getElementById("userId");
  const nameInput = document.getElementById("userName");
  const emailInput = document.getElementById("userEmail");
  const statusInput = document.getElementById("userStatus");
  const saveButton = document.querySelector(".save-user");
  const passwordInput = document.querySelector("#password");

  if (!title || !userIdInput || !nameInput || !emailInput || !statusInput || !saveButton) {
    isModalAnimating = false;
    return;
  }

  userIdInput.value = "";
  nameInput.value = "";
  passwordInput.value = "";
  emailInput.value = "";
  statusInput.value = "false";

  if (mode === "add") {
    title.innerHTML = `<i class="fas fa-user-plus"></i> Add User`;
    nameInput.disabled = false;
    emailInput.disabled = false;
    passwordInput.disabled = false;
    statusInput.disabled = false;
    saveButton.style.display = "block";
  } else {
    const user = users.find(u => u._id === id);
    if (!user) {
      isModalAnimating = false;
      showStatusModal("failed", "User not found");
      return;
    }

    userIdInput.value = user._id;
    nameInput.value = user.name;
    emailInput.value = user.email;
    passwordInput.value = "";
    statusInput.value = user.admin;

    title.innerHTML = `<i class="fas fa-user-${mode === "edit" ? "edit" : ""}"></i> ${mode === "edit" ? "Edit" : "View"} User`;
    nameInput.disabled = mode === "view";
    emailInput.disabled = mode === "view";
    statusInput.disabled = mode === "view";
    passwordInput.disabled = mode === "view";
    saveButton.style.display = mode === "view" ? "none" : "block";
  }

  modal.classList.add("active");
  gsap.fromTo(".modal-content", { scale: 0.8, opacity: 0 }, {
    scale: 1,
    opacity: 1,
    duration: 0.3,
    ease: "back.out(1.7)",
    onComplete: () => {
      isModalAnimating = false;
    }
  });
};

window.closeModal = function() {
  if (!modal || isModalAnimating) return;
  isModalAnimating = true;
  gsap.to(".modal-content", {
    scale: 0.8,
    opacity: 0,
    duration: 0.3,
    ease: "back.in(1.7)",
    onComplete: () => {
      modal.classList.remove("active");
      gsap.set(".modal-content", { scale: 1, opacity: 1 });
      isModalAnimating = false;
    }
  });
};

/* ---------------------- delete with confirmation & robust fetch ---------------------- */

window.deleteUser = async function(id) {
  try {
    // show confirm - returns true when confirmed
    const confirmed = await showConfirmModal("Are you sure you want to delete this user?", { confirmText: "Delete", cancelText: "Cancel" });
    if (!confirmed) return;

    loadingIndicator.show("Deleting user...");
    console.log("Attempting to delete user:", id);

    const res = await fetch(`/api/delete_user/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" } // kept for clarity; server may ignore body for DELETE
    });

    // handle HTTP errors first
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("deleteUser: server returned non-OK:", res.status, text);
      loadingIndicator.hide();
      showStatusModal("failed", `Server returned ${res.status}`);
      return;
    }

    // parse JSON safely
    let json;
    try {
      json = await res.json();
    } catch (err) {
      console.warn("deleteUser: response not JSON", err);
      json = { success: false };
    }

    if (json && json.success) {
      // remove locally if present
      const idx = users.findIndex(u => u._id === id);
      if (idx !== -1) users.splice(idx, 1);
      renderTable(users);
      loadingIndicator.hide();
      showStatusModal("success", json.message || "User deleted");
    } else {
      loadingIndicator.hide();
      showStatusModal("failed", (json && json.message) ? json.message : "Failed to delete user");
    }
  } catch (err) {
    console.error("deleteUser error:", err);
    loadingIndicator.hide();
    showStatusModal("failed", "Server error");
  }
};

/* ---------------------- save (create/update user) ---------------------- */

window.saveUser = async function() {
  const userIdInput = document.getElementById("userId");
  const nameInput = document.getElementById("userName");
  const emailInput = document.getElementById("userEmail");
  const passwordInput = document.getElementById("password");
  const statusInput = document.getElementById("userStatus");

  if (!userIdInput || !nameInput || !emailInput || !statusInput) return;

  const id = userIdInput.value;
  const name = sanitizeInput(nameInput.value.trim());
  const email = sanitizeInput(emailInput.value.trim());
  const status = statusInput.value;
  const password = passwordInput.value;

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showStatusModal("failed", "Invalid input");
    return;
  }

  if (id) {
    // update
    loadingIndicator.show("Updating...");
    const user = users.find(u => u._id == id);
    if (user) {
      user.name = name;
      user.email = email;
      user.status = status;
      try {
        const response = await fetch("/api/edit_user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name, email, admin: status, password })
        });
        if (!response.ok) {
          const t = await response.text().catch(() => "");
          console.error("saveUser update server error:", response.status, t);
          showStatusModal("failed", `Server ${response.status}`);
        } else {
          const j = await response.json().catch(() => ({ success: false }));
          if (j.success) showStatusModal("success", j.message || "Updated");
          else showStatusModal("failed", j.message || "Failed to update");
        }
      } catch (err) {
        console.error("saveUser update error", err);
        showStatusModal("failed", "Server error");
      } finally {
        loadingIndicator.hide();
      }
    } else {
      loadingIndicator.hide();
      showStatusModal("failed", "User not found");
    }
  } else {
    // create
    loadingIndicator.show("Creating...");
    try {
      const response = await fetch("/api/add_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, admin: status, password })
      });
      if (!response.ok) {
        const t = await response.text().catch(() => "");
        console.error("saveUser create server error:", response.status, t);
        showStatusModal("failed", `Server ${response.status}`);
      } else {
        const j = await response.json().catch(() => ({ success: false }));
        if (j.success) showStatusModal("success", j.message || "Created");
        else showStatusModal("failed", j.message || "Failed to create");
      }
    } catch (err) {
      console.error("saveUser create error", err);
      showStatusModal("failed", "Server error");
    } finally {
      loadingIndicator.hide();
    }
  }

  closeModal();
  await renderNewUsers();
};

/* ---------------------- Event Delegation ---------------------- */

if (tableBody) {
  tableBody.addEventListener("click", (e) => {
    const button = e.target.closest(".action-btn");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "view" || action === "edit") {
      openModal(action, id);
    } else if (action === "delete") {
      deleteUser(id);
    }
  });
}

// Search & Sort
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

if (searchInput) {
  searchInput.addEventListener("input", function() {
    const value = this.value.toLowerCase().trim();
    const filtered = users.filter(u => u.name.toLowerCase().includes(value) || u.email.toLowerCase().includes(value));
    renderTable(filtered);
  });
}

if (sortSelect) {
  sortSelect.addEventListener("change", function() {
    const val = this.value;
    if (val === "name") {
      users.sort((a, b) => a.name.localeCompare(b.name));
    } else if (val === "email") {
      users.sort((a, b) => a.email.localeCompare(b.email));
    }
    renderTable(users);
  });
}

async function renderNewUsers() {
  try {
    const response = await fetch("/api/users");
    const results = await response.json();
    renderTable(results.data);
  } catch (err) {
    console.error("renderNewUsers error:", err);
  }
}

// Initial Render
renderTable(users);

