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
  let wishlist = [];
  let filteredWishlist = [];
  let currentPage = 1;
  const itemsPerPage = 8;
  let currentUser = null;

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

  // Get numeric value from price object
  const getNumericValue = (value) => {
    if (value?.$numberDecimal) {
      return parseFloat(value.$numberDecimal);
    }
    return parseFloat(value) || 0;
  };

  // Show cart feedback
  const showCartFeedback = (message) => {
    const feedback = document.createElement('div');
    feedback.className = 'cart-feedback';
    feedback.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.classList.add('show');
      setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(feedback);
        }, 300);
      }, 2000);
    }, 10);
  };

  // Update cart count
  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelector('.cart-count').textContent = totalItems;
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();

      if (data.success) {
        currentUser = data.data;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // Fetch wishlist data
  const fetchWishlist = async () => {
    const wishlistContainer = document.getElementById('wishlist-container');
    wishlistContainer.innerHTML = `
          <div class="loading-spinner">
            <div class="spinner"></div>
          </div>
        `;

    try {
      // Fetch user first
      await fetchCurrentUser();

      // Then fetch wishlist
      const response = await fetch('/api/wishlist');
      const data = await response.json();

      if (data.success) {
        wishlist = data.result;
        filteredWishlist = [...wishlist];
        renderWishlist();
      } else {
        throw new Error('Failed to fetch wishlist');
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      wishlistContainer.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-exclamation-circle"></i>
              <h3>Unable to load wishlist</h3>
              <p>Please try again later</p>
              <button class="btn btn-primary" onclick="fetchWishlist()">Retry</button>
            </div>
          `;
    }
  };

  // Render wishlist
  const renderWishlist = () => {
    const wishlistContainer = document.getElementById('wishlist-container');

    if (filteredWishlist.length === 0) {
      wishlistContainer.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-heart"></i>
              <h3>Your wishlist is empty</h3>
              <p>Add items to your wishlist to see them here</p>
              <a href="shop.html" class="btn btn-primary">Start Shopping</a>
            </div>
          `;
      document.querySelector('.pagination').style.display = 'none';
      return;
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredWishlist.slice(startIndex, endIndex);

    // Generate wishlist HTML
    wishlistContainer.innerHTML = `
          <div class="wishlist-grid">
            ${paginatedItems.map(item => `
              <div class="wishlist-item" data-id="${item._id}">
                <img src="${item.images?.mainImage?.url || 'assets/images/product-placeholder.jpg'}" 
                     alt="${item.name}" class="wishlist-image">
                <div class="wishlist-details">
                  <h3 class="wishlist-name">${item.name}</h3>
                  <div class="wishlist-price">${formatCurrency(item.price)}</div>
                  <span class="wishlist-stock ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <div class="wishlist-actions">
                    <button class="btn btn-outline view-details" data-id="${item._id}">
                      <i class="fas fa-eye"></i> Details
                    </button>
                    <button class="btn btn-primary add-to-cart" data-id="${item._id}" ${item.stock <= 0 ? 'disabled' : ''}>
                      <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-danger remove-item" data-id="${item._id}">
                      <i class="fas fa-trash"></i> Remove
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;

    // Add event listeners
    document.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        const item = wishlist.find(i => i._id === itemId);
        if (item) {
          openItemDetailsModal(item);
        }
      });
    });

    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        const item = wishlist.find(i => i._id === itemId);
        if (item) {
          addToCart(item);
        }
      });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        removeFromWishlist(itemId);
      });
    });

    // Render pagination
    renderPagination();

    // Animate items
    const items = document.querySelectorAll('.wishlist-item');
    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';

      setTimeout(() => {
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, index * 100);
    });
  };

  // Render pagination
  const renderPagination = () => {
    const totalPages = Math.ceil(filteredWishlist.length / itemsPerPage);
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
        renderWishlist();
      });
    });

    // Previous button
    document.querySelector('.prev-page').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderWishlist();
      }
    });

    // Next button
    document.querySelector('.next-page').addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderWishlist();
      }
    });

    // Disable buttons when needed
    document.querySelector('.prev-page').disabled = currentPage === 1;
    document.querySelector('.next-page').disabled = currentPage === totalPages;
  };

  // Open item details modal
  const openItemDetailsModal = (item) => {
    const modal = document.querySelector('.item-details-modal');
    const body = document.querySelector('.item-details-body');

    body.innerHTML = `
          <img src="${item.images?.mainImage?.url || 'assets/images/product-placeholder.jpg'}" 
               alt="${item.name}" class="item-details-image">
          <div class="item-info">
            <div class="info-row">
              <div class="info-label">Name:</div>
              <div class="info-value">${item.name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Price:</div>
              <div class="info-value">${formatCurrency(item.price)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Stock:</div>
              <div class="info-value">
                <span class="wishlist-stock ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                  ${item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
          <div class="item-description">
            <h4>Description</h4>
            <p>${item.description || 'No description available'}</p>
          </div>
          ${item.keyFeatures && item.keyFeatures.length > 0 ? `
          <div class="item-features">
            <h4>Key Features</h4>
            <ul>
              ${item.keyFeatures.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        `;

    modal.classList.add('active');
  };

  // Close item details modal
  document.querySelector('.close-item-details').addEventListener('click', () => {
    const modal = document.querySelector('.item-details-modal');
    modal.classList.remove('active');
  });

  // Add to cart
  const addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === product._id);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
      cart.push({
        id: product._id,
        name: product.name,
        price: getNumericValue(product.price),
        image: product.images?.mainImage?.url || 'assets/images/default-product.png',
        quantity: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showCartFeedback('Added to cart!');
  };

  // Remove from wishlist
  const removeFromWishlist = async (productId) => {
    try {
      if (!currentUser) {
        showCartFeedback('Please log in to manage your wishlist');
        return;
      }

      const response = await fetch("/api/delete_from_wishlist", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: currentUser._id, itemId: productId })
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local wishlist
        wishlist = wishlist.filter(item => item._id !== productId);
        filteredWishlist = filteredWishlist.filter(item => item._id !== productId);

        // Re-render wishlist
        renderWishlist();

        showCartFeedback(data.message || 'Item removed from wishlist');
      } else {
        showCartFeedback(data.message || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      showCartFeedback('Error removing item from wishlist');
    }
  };

  // Filter wishlist
  const filterWishlist = () => {
    const searchTerm = document.getElementById('filter-item').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    filteredWishlist = wishlist.filter(item => {
      // Filter by search term
      const matchesSearch = searchTerm === '' || item.name.toLowerCase().includes(searchTerm);

      // Filter by status
      let matchesStatus = true;
      if (statusFilter === 'in-stock') {
        matchesStatus = item.stock > 0;
      } else if (statusFilter === 'out-of-stock') {
        matchesStatus = item.stock <= 0;
      }

      return matchesSearch && matchesStatus;
    });

    currentPage = 1;
    renderWishlist();
  };

  // Add event listeners to filters
  document.getElementById('filter-item').addEventListener('input', filterWishlist);
  document.getElementById('filter-status').addEventListener('change', filterWishlist);

  // Initialize
  updateCartCount();
  fetchWishlist();
});

