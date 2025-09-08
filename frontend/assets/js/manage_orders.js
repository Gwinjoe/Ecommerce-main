// manage_orders.js
import { gsap } from "gsap";
import showStatusModal from "./modal.js";
import { loadingIndicator } from "./loader.js";

// Log script loading for debugging
console.log("manage_orders.js loaded");

// Google Analytics event tracking function
function trackEvent(eventName, eventParams = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, eventParams);
  } else {
    // no-op in dev
    // console.warn("Google Analytics not loaded:", eventName, eventParams);
  }
}

// Helper: fetch orders from server
async function fetchOrders() {
  try {
    const response = await fetch("/api/orders");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return payload.success ? payload.data : [];
  } catch (err) {
    console.error("fetchOrders error", err);
    return [];
  }
}

// CSV download helper (unchanged)
function downloadCSV(orders) {
  const headers = ["Order ID", "Customer", "Date", "Amount", "Status"];
  const csvRows = [
    headers.join(","),
    ...orders.map(order =>
      `"${order.payment?.reference || ''}","${order.customer?.name || ''}","${order.createdAt || ''}","${(order.totalPrice && order.totalPrice.$numberDecimal) ? parseFloat(order.totalPrice.$numberDecimal).toFixed(2) : (order.amount || 0).toFixed(2)}","${order.status || ''}"`
    )
  ];
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "orders_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* ------------------- renderOrders & helpers ------------------- */

async function renderOrders(page = 1, sort = "date-desc", filter = "", search = "", startDate = "", endDate = "") {
  const orderList = document.querySelector("#order-list");
  const noOrders = document.querySelector(".no-orders");
  const pageInfo = document.querySelector("#page-info");
  const bulkActions = document.querySelector(".bulk-actions");
  const updateStatusBtn = document.querySelector(".update-status-btn");
  const selectAllCheckbox = document.querySelector("#select-all");

  if (!orderList || !noOrders || !pageInfo || !bulkActions || !updateStatusBtn || !selectAllCheckbox) {
    console.error("Error: Required elements not found", {
      orderList: !!orderList,
      noOrders: !!noOrders,
      pageInfo: !!pageInfo,
      bulkActions: !!bulkActions,
      updateStatusBtn: !!updateStatusBtn,
      selectAllCheckbox: !!selectAllCheckbox
    });
    return { orders: [], totalPages: 1 };
  }

  try {
    // Fetch orders from server (no loader here - you can add if you prefer)
    const itemsPerPage = 5;
    let orders = await fetchOrders();

    // Filtering/searching/sorting (client side based on returned list)
    if (search) {
      orders = orders.filter(order =>
        (order.payment?.reference || '').toLowerCase().includes(search.toLowerCase()) ||
        (order.customer?.name || '').toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filter) {
      orders = orders.filter(order => order.status === filter);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start <= end) {
        orders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= start && orderDate <= end;
        });
      }
    }

    // sort
    orders.sort((a, b) => {
      if (sort === "date-desc") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "date-asc") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "amount-asc") {
        const aAmt = a.totalPrice?.$numberDecimal ? parseFloat(a.totalPrice.$numberDecimal) : (a.amount || 0);
        const bAmt = b.totalPrice?.$numberDecimal ? parseFloat(b.totalPrice.$numberDecimal) : (b.amount || 0);
        return aAmt - bAmt;
      }
      if (sort === "amount-desc") {
        const aAmt = a.totalPrice?.$numberDecimal ? parseFloat(a.totalPrice.$numberDecimal) : (a.amount || 0);
        const bAmt = b.totalPrice?.$numberDecimal ? parseFloat(b.totalPrice.$numberDecimal) : (b.amount || 0);
        return bAmt - aAmt;
      }
      return 0;
    });

    // pagination
    const totalPages = Math.ceil(orders.length / itemsPerPage) || 1;
    page = Math.min(page, totalPages);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedOrders = orders.slice(start, end);

    pageInfo.textContent = `Page ${page} of ${totalPages}`;

    // pagination button enable/disable
    const firstBtn = document.querySelector("#first-page");
    const prevBtn = document.querySelector("#prev-page");
    const nextBtn = document.querySelector("#next-page");
    const lastBtn = document.querySelector("#last-page");
    if (firstBtn && prevBtn && nextBtn && lastBtn) {
      firstBtn.disabled = page === 1;
      prevBtn.disabled = page === 1;
      nextBtn.disabled = page === totalPages;
      lastBtn.disabled = page === totalPages;
    }

    // reset select all
    selectAllCheckbox.checked = false;

    // render table rows
    orderList.innerHTML = "";
    if (!paginatedOrders || paginatedOrders.length === 0) {
      noOrders.classList.add("active");
      bulkActions.style.display = "none";
      gsap.from(noOrders, { opacity: 0, duration: 0.5, ease: "power3.out" });
      return { orders, totalPages };
    }

    noOrders.classList.remove("active");
    paginatedOrders.forEach((order, index) => {
      const row = document.createElement("tr");
      const amount = order.totalPrice?.$numberDecimal ? parseFloat(order.totalPrice.$numberDecimal).toFixed(2) : ((order.amount || 0).toFixed(2));
      row.innerHTML = `
                <td><input type="checkbox" class="select-order" data-id="${order._id}" data-ga-event="select_order"></td>
                <td>${order.payment?.reference || ''}</td>
                <td>${order.customer?.name || ''}</td>
                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                <td>₦${amount}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>
                    <button class="action-btn view-btn" data-id="${order._id}" data-ga-event="view_order"><i class="fas fa-eye"></i></button>
                    <select class="status-select" data-id="${order._id}" data-ga-event="update_status">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            `;
      orderList.appendChild(row);
      gsap.from(row, { opacity: 0, y: 20, duration: 0.5, ease: "power3.out", delay: index * 0.06 });
    });

    // render mobile cards (if small)
    const mobileContainer = document.querySelector(".orders-table");
    if (window.innerWidth <= 768 && mobileContainer) {
      mobileContainer.innerHTML = "";
      paginatedOrders.forEach((order, index) => {
        const card = document.createElement("div");
        card.classList.add("order-card");
        const amount = order.totalPrice?.$numberDecimal ? parseFloat(order.totalPrice.$numberDecimal).toFixed(2) : ((order.amount || 0).toFixed(2));
        card.innerHTML = `
                    <div><input type="checkbox" class="select-order" data-id="${order._id}" data-ga-event="select_order"></div>
                    <div><strong>Order ID:</strong> ${order.payment?.reference || ''}</div>
                    <div><strong>Customer:</strong> ${order.customer?.name || ''}</div>
                    <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
                    <div><strong>Amount:</strong> ₦${amount}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></div>
                    <div class="actions">
                        <button class="action-btn view-btn" data-id="${order._id}" data-ga-event="view_order"><i class="fas fa-eye"></i></button>
                        <select class="status-select" data-id="${order._id}" data-ga-event="update_status">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                `;
        mobileContainer.appendChild(card);
        gsap.from(card, { opacity: 0, y: 20, duration: 0.5, ease: "power3.out", delay: index * 0.06 });
      });
    }

    updateBulkActions(); // update actions visibility
    return { orders, totalPages };
  } catch (error) {
    console.error("Error rendering orders:", error);
    orderList.innerHTML = "";
    noOrders.textContent = "Error loading orders";
    noOrders.classList.add("active");
    bulkActions.style.display = "none";
    gsap.from(noOrders, { opacity: 0, duration: 0.5, ease: "power3.out" });
    return { orders: [], totalPages: 1 };
  }
}

function updateBulkActions() {
  const bulkActions = document.querySelector(".bulk-actions");
  const updateStatusBtn = document.querySelector(".update-status-btn");
  const selectAllCheckbox = document.querySelector("#select-all");
  if (!bulkActions || !updateStatusBtn || !selectAllCheckbox) {
    // console.error("Error: Bulk action elements not found");
    return;
  }

  const selectedCheckboxes = document.querySelectorAll(".select-order:checked");
  selectAllCheckbox.checked = selectedCheckboxes.length > 0 && selectedCheckboxes.length === document.querySelectorAll(".select-order").length;

  if (selectedCheckboxes.length > 0) {
    bulkActions.style.display = "flex";
    updateStatusBtn.disabled = !document.querySelector("#bulk-status").value;
    gsap.from(bulkActions, { opacity: 0, y: 10, duration: 0.3, ease: "power3.out" });
  } else {
    bulkActions.style.display = "none";
    updateStatusBtn.disabled = true;
  }
}

/* ------------------- DOM Ready & Events ------------------- */

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired for manage_orders.js");

  let currentPage = 1;
  let currentSort = "date-desc";
  let currentFilter = "";
  let currentSearch = "";
  let currentStartDate = "";
  let currentEndDate = "";
  let currentOrders = [];

  // initial load
  renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
    .then(({ orders }) => { currentOrders = orders; });

  // search with debounce
  const searchInput = document.querySelector("#search");
  if (searchInput) {
    const debouncedSearch = debounce(() => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
        .then(({ orders }) => { currentOrders = orders; });
      trackEvent("search_orders", { query: currentSearch });
    }, 300);
    searchInput.addEventListener("input", debouncedSearch);
  }

  // sort handler
  const sortSelect = document.querySelector("#sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      currentPage = 1;
      renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
        .then(({ orders }) => { currentOrders = orders; });
      trackEvent("sort_orders", { sort: currentSort });
    });
  }

  // filter handler
  const filterSelect = document.querySelector("#filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      currentFilter = filterSelect.value;
      currentPage = 1;
      renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
        .then(({ orders }) => { currentOrders = orders; });
      trackEvent("filter_orders", { filter: currentFilter });
    });
  }

  // date range
  const startDateInput = document.querySelector("#start-date");
  const endDateInput = document.querySelector("#end-date");
  if (startDateInput && endDateInput) {
    const debouncedDateRange = debounce(() => {
      currentStartDate = startDateInput.value;
      currentEndDate = endDateInput.value;
      if (currentStartDate && currentEndDate && new Date(currentStartDate) > new Date(currentEndDate)) {
        alert("Start date must be before end date");
        startDateInput.value = "";
        endDateInput.value = "";
        currentStartDate = "";
        currentEndDate = "";
      }
      currentPage = 1;
      renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
        .then(({ orders }) => { currentOrders = orders; });
      trackEvent("filter_date_range", { start_date: currentStartDate, end_date: currentEndDate });
    }, 300);
    startDateInput.addEventListener("change", debouncedDateRange);
    endDateInput.addEventListener("change", debouncedDateRange);
  }

  // export CSV
  const exportBtn = document.querySelector(".export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      if (!confirm("Export current orders to CSV?")) return;
      try {
        loadingIndicator.show("Preparing CSV...", { dismissible: false });
        let orders = await fetchOrders();
        // apply same client filters
        if (currentSearch) orders = orders.filter(o => (o.payment?.reference || '').toLowerCase().includes(currentSearch.toLowerCase()) || (o.customer?.name || '').toLowerCase().includes(currentSearch.toLowerCase()));
        if (currentFilter) orders = orders.filter(o => o.status === currentFilter);
        if (currentStartDate && currentEndDate) {
          const s = new Date(currentStartDate), e = new Date(currentEndDate);
          if (s <= e) {
            orders = orders.filter(o => {
              const d = new Date(o.createdAt);
              return d >= s && d <= e;
            });
          }
        }
        // sort
        orders.sort((a, b) => {
          if (currentSort === "date-desc") return new Date(b.createdAt) - new Date(a.createdAt);
          if (currentSort === "date-asc") return new Date(a.createdAt) - new Date(b.createdAt);
          return 0;
        });
        downloadCSV(orders);
        loadingIndicator.hide();
        showStatusModal("success", `Exported ${orders.length} orders`);
        trackEvent("export_csv", { order_count: orders.length });
      } catch (err) {
        console.error("Export error", err);
        loadingIndicator.hide();
        showStatusModal("error", "Failed to export CSV");
      }
    });
  }

  // pagination controls
  const firstBtn = document.querySelector("#first-page");
  const prevBtn = document.querySelector("#prev-page");
  const nextBtn = document.querySelector("#next-page");
  const lastBtn = document.querySelector("#last-page");
  if (firstBtn && prevBtn && nextBtn && lastBtn) {
    firstBtn.addEventListener("click", () => {
      if (currentPage !== 1) {
        currentPage = 1;
        renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
          .then(({ orders }) => { currentOrders = orders; });
        trackEvent("pagination_first");
      }
    });
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
          .then(({ orders }) => { currentOrders = orders; });
        trackEvent("pagination_prev");
      }
    });
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(currentOrders.length / 5);
      if (currentPage < totalPages) {
        currentPage++;
        renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
          .then(({ orders }) => { currentOrders = orders; });
        trackEvent("pagination_next");
      }
    });
    lastBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(currentOrders.length / 5);
      if (currentPage !== totalPages) {
        currentPage = totalPages;
        renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
          .then(({ orders }) => { currentOrders = orders; });
        trackEvent("pagination_last");
      }
    });
  }

  // select all
  const selectAllCheckbox = document.querySelector("#select-all");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
      const checkboxes = document.querySelectorAll(".select-order");
      checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
      });
      updateBulkActions();
      trackEvent("select_all_orders", { checked: selectAllCheckbox.checked });
    });
  }

  // Event delegation: status-select change and view button clicks
  const ordersTableContainer = document.querySelector(".orders-table");
  if (ordersTableContainer) {
    ordersTableContainer.addEventListener("change", async (e) => {
      const target = e.target;
      if (target.classList.contains("select-order")) {
        updateBulkActions();
        trackEvent("select_order", { order_id: target.dataset.id, checked: target.checked });
        return;
      }

      // STATUS SELECT - single order update
      if (target.classList.contains("status-select")) {
        const orderId = target.dataset.id;
        const newStatus = target.value;
        if (!orderId) return;

        // Show loader and call server
        try {
          loadingIndicator.show("Updating order status...", { dismissible: false });
          const res = await fetch("/api/edit_order", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: orderId, status: newStatus })
          });
          const payload = await res.json();
          loadingIndicator.hide();

          if (payload && payload.success) {
            // Success - re-render and show modal
            await renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
              .then(({ orders }) => { currentOrders = orders; });
            showStatusModal("success", payload.message || "Order updated");
          } else {
            // Failure
            showStatusModal("error", (payload && payload.message) ? payload.message : "Failed to update order");
            // revert the select visually by re-rendering (to server state)
            await renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
              .then(({ orders }) => { currentOrders = orders; });
          }
        } catch (err) {
          console.error("update status error", err);
          loadingIndicator.hide();
          showStatusModal("error", "Network error while updating order");
          await renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
            .then(({ orders }) => { currentOrders = orders; });
        }
      }
    });

    // click handler for view button
    ordersTableContainer.addEventListener("click", (e) => {
      const target = e.target.closest(".action-btn.view-btn");
      if (!target) return;
      const id = target.dataset.id;
      gsap.to(target, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.in",
        onComplete: () => {
          gsap.to(target, { scale: 1, duration: 0.1 });
          trackEvent("view_order", { order_id: id });
          window.location.href = `/admin/order_details?id=${id}`;
        }
      });
    });
  } else {
    console.error("Error: .orders-table container not found");
  }

  // Bulk status update
  const updateStatusBtn = document.querySelector(".update-status-btn");
  const bulkStatusSelect = document.querySelector("#bulk-status");
  if (updateStatusBtn && bulkStatusSelect) {
    bulkStatusSelect.addEventListener("change", () => {
      updateBulkActions();
      trackEvent("bulk_status_select", { status: bulkStatusSelect.value });
    });

    updateStatusBtn.addEventListener("click", async () => {
      const selectedCheckboxes = document.querySelectorAll(".select-order:checked");
      if (selectedCheckboxes.length === 0 || !bulkStatusSelect.value) return;
      if (!confirm(`Update status of ${selectedCheckboxes.length} order(s) to ${bulkStatusSelect.value}?`)) return;

      const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id).filter(Boolean);
      if (selectedIds.length === 0) return;

      try {
        loadingIndicator.show("Updating selected orders...", { dismissible: false });
        const res = await fetch("/api/edit_multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedIds, status: bulkStatusSelect.value })
        });
        const payload = await res.json();
        loadingIndicator.hide();

        if (payload && payload.success) {
          // success -> refresh and notify
          await renderOrders(currentPage, currentSort, currentFilter, currentSearch, currentStartDate, currentEndDate)
            .then(({ orders }) => { currentOrders = orders; });
          showStatusModal("success", payload.message || "Selected orders updated");
          trackEvent("bulk_update_status", { status: bulkStatusSelect.value, order_ids: selectedIds });
          bulkStatusSelect.value = "";
          updateBulkActions();
        } else {
          showStatusModal("error", (payload && payload.message) ? payload.message : "Failed to update selected orders");
        }
      } catch (err) {
        console.error("bulk update error", err);
        loadingIndicator.hide();
        showStatusModal("error", "Network error while updating selected orders");
      }
    });
  } else {
    console.error("Error: .update-status-btn or #bulk-status not found");
  }

  // animate cards & controls
  const ordersCard = document.querySelector(".orders-card");
  if (ordersCard) {
    gsap.from(ordersCard, {
      opacity: 0,
      y: 50,
      duration: 0.7,
      ease: "power3.out"
    });
  }
  const controlsAndTable = document.querySelectorAll(".orders-controls, .orders-table, .pagination");
  if (controlsAndTable.length) {
    gsap.from(controlsAndTable, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: "power3.out",
      delay: 0.2
    });
  }
});

