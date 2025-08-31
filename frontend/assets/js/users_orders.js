import { updateHeader } from "./user-details.js"
document.addEventListener("DOMContentLoaded", () => {

  updateHeader();
  // Set current year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Toggle mobile menu
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('.nav-list');

  menuToggle.addEventListener('click', () => {
    navList.classList.toggle('active');
    menuToggle.querySelector('i').classList.toggle('fa-bars');
    menuToggle.querySelector('i').classList.toggle('fa-times');
  });

  // Toggle profile dropdown
  const userProfile = document.querySelector('.user-profile');

  userProfile.addEventListener('click', (e) => {
    e.stopPropagation();
    userProfile.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    userProfile.classList.remove('active');
  });

  // Scroll to top button
  const scrollTopBtn = document.querySelector('.scroll-top-btn');
  window.addEventListener('scroll', () => {
    scrollTopBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // State
  let orders = [];
  let filteredOrders = [];
  let currentPage = 1;
  const itemsPerPage = 5;

  // Format currency
  const formatCurrency = (amount) => {
    const value = typeof amount === 'object' && amount.$numberDecimal
      ? parseFloat(amount.$numberDecimal)
      : parseFloat(amount);

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  // Fetch orders from API
  const fetchOrders = async () => {
    const ordersContainer = document.getElementById('orders-container');
    ordersContainer.innerHTML = `
          <div class="loading-spinner">
            <div class="spinner"></div>
          </div>
        `;

    try {
      const response = await fetch("/api/user_orders");
      const { success, result } = await response.json();
      if (success) {
        orders = result;
        filteredOrders = [...orders];
        renderOrders();
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      ordersContainer.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-exclamation-circle"></i>
              <h3>Unable to load orders</h3>
              <p>Please try again later</p>
              <button class="btn btn-primary" onclick="fetchOrders()">Retry</button>
            </div>
          `;
    }
  };

  // Render orders
  const renderOrders = () => {
    const ordersContainer = document.getElementById('orders-container');

    if (filteredOrders.length === 0) {
      ordersContainer.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-shopping-bag"></i>
              <h3>No orders found</h3>
              <p>You haven't placed any orders yet</p>
              <a href="shop.html" class="btn btn-primary">Start Shopping</a>
            </div>
          `;
      document.querySelector('.pagination').style.display = 'none';
      return;
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Generate orders HTML
    ordersContainer.innerHTML = paginatedOrders.map(order => `
          <div class="order-card" data-id="${order._id}">
            <div class="order-header">
              <div>
                <h3>Order #${order.payment.reference}</h3>
                <p class="text-muted">Placed on ${formatDate(order.createdAt)}</p>
              </div>
              <span class="order-status ${getStatusClass(order.status)}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
            <div class="order-body">
              <div class="order-products">
                ${order.products.slice(0, 3).map(product => `
                  <div class="product-item">
                    <img src="assets/images/product-placeholder.jpg" alt="${product.product.name}" class="product-image">
                    <div class="product-details">
                      <div class="product-name">${product.product.name}</div>
                      <div class="product-price">${formatCurrency(product.totalPrice)}</div>
                      <div class="product-quantity">Quantity: ${product.quantity}</div>
                    </div>
                  </div>
                `).join('')}
                ${order.products.length > 3 ? `
                  <p class="text-center">+ ${order.products.length - 3} more items</p>
                ` : ''}
              </div>
              <div class="order-total">
                <strong>Total: ${formatCurrency(order.totalPrice)}</strong>
              </div>
            </div>
            <div class="order-footer">
              <div>
                <p class="text-muted">Payment Method: ${order.payment.method}</p>
              </div>
              <div class="order-actions">
                <button class="btn btn-outline view-details" data-id="${order._id}">View Details</button>
              </div>
            </div>
          </div>
        `).join('');

    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-id');
        const order = orders.find(o => o._id === orderId);
        if (order) {
          openOrderDetailsModal(order);
        }
      });
    });

    // Render pagination
    renderPagination();
  };
  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelector('.cart-count').textContent = totalItems;
  };


  // Render pagination
  const renderPagination = () => {
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const pageNumbers = document.querySelector('.page-numbers');

    if (totalPages <= 1) {
      document.querySelector('.pagination').style.display = 'none';
      return;
    }

    document.querySelector('.pagination').style.display = 'flex';

    let paginationHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
            <button class="pagination-btn page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">
              ${i}
            </button>
          `;
    }

    pageNumbers.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    document.querySelectorAll('.page-number').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.getAttribute('data-page'));
        renderOrders();
      });
    });

    // Previous button
    document.querySelector('.prev-page').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderOrders();
      }
    });

    // Next button
    document.querySelector('.next-page').addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderOrders();
      }
    });

    // Disable buttons when needed
    document.querySelector('.prev-page').disabled = currentPage === 1;
    document.querySelector('.next-page').disabled = currentPage === totalPages;
  };

  // Open order details modal
  const openOrderDetailsModal = (order) => {
    const modal = document.querySelector('.order-details-modal');
    const body = document.querySelector('.order-details-body');

    body.innerHTML = `
          <div class="order-info">
            <div class="info-row">
              <div class="info-label">Order ID</div>
              <div class="info-value">${order.payment.reference}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Order Date</div>
              <div class="info-value">${formatDate(order.createdAt)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Status</div>
              <div class="info-value"><span class="order-status ${getStatusClass(order.status)}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></div>
            </div>
            <div class="info-row">
              <div class="info-label">Payment Method</div>
              <div class="info-value">${order.payment.method} (${order.payment.transactionId})</div>
            </div>
          </div>
          
          <h3>Shipping Address</h3>
          <div class="address-info">
            <p>${order.customer.name}</p>
            <p>${order.customer.address.address}</p>
            <p>${order.customer.address.city}, ${order.customer.address.state}</p>
            <p>${order.customer.address.country}</p>
            <p>Phone: ${order.customer.phone}</p>
            <p>Email: ${order.customer.email}</p>
          </div>
          
          <h3>Order Items</h3>
          <div class="order-products">
            ${order.products.map(product => `
              <div class="product-item">
                <img src="assets/images/product-placeholder.jpg" alt="${product.product.name}" class="product-image">
                <div class="product-details">
                  <div class="product-name">${product.product.name}</div>
                  <div class="product-price">${formatCurrency(product.product.price)} each</div>
                  <div class="product-quantity">Quantity: ${product.quantity}</div>
                  <div class="product-total">${formatCurrency(product.totalPrice)}</div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="order-summary">
            <div class="summary-row">
              <div class="summary-label">Subtotal</div>
              <div class="summary-value">${formatCurrency(order.totalPrice)}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">Shipping</div>
              <div class="summary-value">Free</div>
            </div>
            <div class="summary-row total">
              <div class="summary-label">Total</div>
              <div class="summary-value">${formatCurrency(order.totalPrice)}</div>
            </div>
          </div>
          
          <h3>Order Timeline</h3>
          <div class="order-timeline">
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">${formatDate(order.createdAt)}</div>
                <div class="timeline-title">Order Placed</div>
                <p>Your order has been received</p>
              </div>
            </div>
            ${order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">${formatDate(order.updatedAt)}</div>
                <div class="timeline-title">Order Processing</div>
                <p>Your order is being processed</p>
              </div>
            </div>
            ` : ''}
            ${order.status === 'shipped' || order.status === 'delivered' ? `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">${formatDate(order.updatedAt)}</div>
                <div class="timeline-title">Order Shipped</div>
                <p>Your order has been shipped</p>
              </div>
            </div>
            ` : ''}
            ${order.status === 'delivered' ? `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">${formatDate(order.updatedAt)}</div>
                <div class="timeline-title">Order Delivered</div>
                <p>Your order has been delivered</p>
              </div>
            </div>
            ` : ''}
          </div>
        `;

    modal.classList.add('active');
  };

  // Close order details modal
  document.querySelector('.close-order-details').addEventListener('click', () => {
    const modal = document.querySelector('.order-details-modal');
    modal.classList.remove('active');
  });

  // Filter orders
  const filterOrders = () => {
    const searchTerm = document.getElementById('filter-item').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    filteredOrders = orders.filter(order => {
      // Filter by status
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;

      // Filter by search term
      const searchMatch = searchTerm === '' ||
        order.products.some(product =>
          product.product.name.toLowerCase().includes(searchTerm)
        ) ||
        order.payment.reference.toLowerCase().includes(searchTerm);

      return statusMatch && searchMatch;
    });

    currentPage = 1;
    renderOrders();
  };

  // Add event listeners to filters
  document.getElementById('filter-item').addEventListener('input', filterOrders);
  document.getElementById('filter-status').addEventListener('change', filterOrders);

  // Initialize
  fetchOrders();
});
