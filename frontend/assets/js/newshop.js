document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const elements = {
    menuToggle: document.getElementById('menu-toggle'),
    navMenu: document.getElementById('nav-menu'),
    menuIcon: document.getElementById('menu-icon'),
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    brandFilter: document.getElementById('brandFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    sortPrice: document.getElementById('sortPrice'),
    priceMin: document.getElementById('priceMin'),
    priceMax: document.getElementById('priceMax'),
    minPriceDisplay: document.getElementById('minPrice'),
    maxPriceDisplay: document.getElementById('maxPrice'),
    productGrid: document.getElementById('productGrid'),
    noResults: document.getElementById('noResults'),
    cartCount: document.getElementById('cart-count'),
    pagination: document.getElementById('pagination'),
    quickViewModal: document.getElementById('quickViewModal'),
    modalImage: document.getElementById('modalImage'),
    modalName: document.getElementById('modalName'),
    modalBrand: document.getElementById('modalBrand'),
    modalRating: document.getElementById('modalRating'),
    modalPrice: document.getElementById('modalPrice'),
    modalDescription: document.getElementById('modalDescription'),
    modalAddToCart: document.getElementById('modalAddToCart'),
    compareModal: document.getElementById('compareModal'),
    compareTable: document.getElementById('compareTable'),
    clearCompare: document.getElementById('clearCompare'),
    gridViewBtn: document.getElementById('gridView'),
    listViewBtn: document.getElementById('listView'),
    resetFilters: document.getElementById('resetFilters'),
    autocomplete: document.getElementById('autocomplete'),
    filterSummary: document.getElementById('filterSummary'),
    spinner: document.getElementById('spinner'),
    recentlyViewed: document.getElementById('recentlyViewed')
  };

  // State Management
  let state = {
    products: [],
    categories: [],
    brands: [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('wishlist')) || [],
    compareList: JSON.parse(localStorage.getItem('compare')) || [],
    recentlyViewedList: JSON.parse(localStorage.getItem('recentlyViewed')) || [],
    currentPage: 1,
    itemsPerPage: 8,
    isGridView: true,
    currentFilters: {
      search: '',
      category: 'all',
      brand: 'all',
      rating: 'all',
      minPrice: 0,
      maxPrice: 1000000,
      sort: 'default'
    },
  }
  // Utility Functions
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₦${parseFloat(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Fetch data from API
  const fetchData = async (endpoint) => {
    try {
      elements.spinner.style.display = 'block';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    } finally {
      elements.spinner.style.display = 'none';
    }
  };

  // Initialize the shop
  const initShop = async () => {
    // Load data from API
    state.categories = await fetchData('/api/categories');
    state.brands = await fetchData('/api/brands');
    state.products = await fetchData('/api/products');

    // Populate category filter
    state.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category._id;
      option.textContent = category.name;
      elements.categoryFilter.appendChild(option);
    });

    // Populate brand filter
    state.brands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand._id;
      option.textContent = brand.name;
      elements.brandFilter.appendChild(option);
    });

    // Render initial products
    renderProducts();
    updateCartCount();
    updateFilterSummary();
  };

  // Render products
  const renderProducts = () => {
    elements.productGrid.innerHTML = '';
    elements.noResults.style.display = 'none';

    if (state.products.length === 0) {
      elements.noResults.style.display = 'block';
      console.log("no Products - " + state.products);
      return;
    }


    console.log("Products - " + state.products);

    // Apply filters
    let filteredProducts = state.products//applyFilters();

    if (filteredProducts.length === 0) {
      elements.noResults.style.display = 'block';
      console.log("no filteredProducts - " + filteredProducts);
      return;
    }

    console.log("working - " + filteredProducts);
    // Apply sorting
    filteredProducts = applySorting(filteredProducts);

    // Apply pagination
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);

    // Render products
    paginatedProducts.forEach(product => {
      const productCard = createProductCard(product);
      elements.productGrid.appendChild(productCard);
    });

    // Render pagination
    renderPagination(filteredProducts.length);
  };

  // Create product card
  const createProductCard = (product) => {
    const productCard = document.createElement('div');
    productCard.className = `product-item ${state.isGridView ? '' : 'list'}`;
    productCard.dataset.id = product._id;
    productCard.dataset.category = product.category?._id || '';
    productCard.dataset.brand = product.brand?._id || '';
    productCard.dataset.name = product.name;
    productCard.dataset.price = product.price?.$numberDecimal || product.price || 0;
    productCard.dataset.rating = product.ratings?.$numberDecimal || 0;

    // Create badges (if needed)
    const badges = `
          ${product.isTrending ? '<span class="badge trending">Trending</span>' : ''}
          ${product.isNew ? '<span class="badge new">New</span>' : ''}
          ${product.isBestSeller ? '<span class="badge best">Best Seller</span>' : ''}
        `;

    // Create rating stars
    const ratingValue = parseFloat(product.ratings?.$numberDecimal || 0);
    const ratingStars = '★'.repeat(Math.round(ratingValue)) + '☆'.repeat(5 - Math.round(ratingValue));

    productCard.innerHTML = `
          ${badges}
          <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${product.name}" loading="lazy">
          <h2 class="product-name"><a href="product.html?id=${product._id}" class="product-link">${product.name}</a></h2>
          <p class="brand">${product.brand?.name || 'No Brand'}</p>
          <div class="rating">
            <span class="stars">${ratingStars}</span>
            <span>(${ratingValue.toFixed(1)})</span>
          </div>
          <p class="price">${formatCurrency(productCard.dataset.price)}</p>
          <div class="product-actions">
            <button type="button" class="add-to-cart" aria-label="Add ${product.name} to cart">Add to Cart</button>
            <button type="button" class="quick-view" aria-label="Quick view ${product.name}"><i class="fas fa-eye"></i></button>
            <button type="button" class="wishlist" aria-label="Add ${product.name} to wishlist"><i class="fas fa-heart"></i></button>
            <button type="button" class="compare" aria-label="Compare ${product.name}"><i class="fas fa-balance-scale"></i></button>
          </div>
          <div class="tooltip"></div>
        `;

    return productCard;
  };

  // Apply filters
  const applyFilters = () => {
    return state.products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(state.currentFilters.search.toLowerCase());
      const matchesCategory = state.currentFilters.category === 'all' ||
        (product.category?._id === state.currentFilters.category);
      const matchesBrand = state.currentFilters.brand === 'all' ||
        (product.brand?._id === state.currentFilters.brand);
      const matchesRating = state.currentFilters.rating === 'all' ||
        (parseFloat(product.ratings?.$numberDecimal || 0) >= parseFloat(state.currentFilters.rating));
      const matchesPrice = product.price >= state.currentFilters.minPrice &&
        product.price <= state.currentFilters.maxPrice;

      return matchesSearch && matchesCategory && matchesBrand && matchesRating && matchesPrice;
    });
  };

  // Apply sorting
  const applySorting = (products) => {
    return products.sort((a, b) => {
      const priceA = parseFloat(a.price?.$numberDecimal || a.price || 0);
      const priceB = parseFloat(b.price?.$numberDecimal || b.price || 0);
      const ratingA = parseFloat(a.ratings?.$numberDecimal || 0);
      const ratingB = parseFloat(b.ratings?.$numberDecimal || 0);

      switch (state.currentFilters.sort) {
        case 'low-high':
          return priceA - priceB;
        case 'high-low':
          return priceB - priceA;
        case 'rating':
          return ratingB - ratingA;
        default:
          return 0;
      }
    });
  };

  // Render pagination
  const renderPagination = (totalItems) => {
    elements.pagination.innerHTML = '';
    const pageCount = Math.ceil(totalItems / state.itemsPerPage);

    for (let i = 1; i <= pageCount; i++) {
      const pageLink = document.createElement('a');
      pageLink.href = '#';
      pageLink.textContent = i;
      if (i === state.currentPage) {
        pageLink.classList.add('current');
      }

      pageLink.addEventListener('click', (e) => {
        e.preventDefault();
        state.currentPage = i;
        renderProducts();
      });

      elements.pagination.appendChild(pageLink);
    }
  };

  // Update cart count
  const updateCartCount = () => {
    const totalItems = state.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    elements.cartCount.textContent = totalItems;
  };

  // Update filter summary
  const updateFilterSummary = () => {
    elements.filterSummary.innerHTML = '';

    const filters = [
      { name: 'Search', value: state.currentFilters.search },
      {
        name: 'Category', value: state.currentFilters.category === 'all' ? '' :
          state.categories.find(c => c._id === state.currentFilters.category)?.name
      },
      {
        name: 'Brand', value: state.currentFilters.brand === 'all' ? '' :
          state.brands.find(b => b._id === state.currentFilters.brand)?.name
      },
      { name: 'Rating', value: state.currentFilters.rating === 'all' ? '' : `${state.currentFilters.rating}+ stars` },
      {
        name: 'Price', value: state.currentFilters.minPrice > 0 || state.currentFilters.maxPrice < 100000 ?
          `${formatCurrency(state.currentFilters.minPrice)} - ${formatCurrency(state.currentFilters.maxPrice)}` : ''
      }
    ].filter(f => f.value);

    filters.forEach(filter => {
      const filterTag = document.createElement('div');
      filterTag.className = 'filter-tag';
      filterTag.innerHTML = `
            ${filter.name}: ${filter.value}
            <span aria-label="Remove filter">×</span>
          `;

      filterTag.querySelector('span').addEventListener('click', () => {
        if (filter.name === 'Search') {
          state.currentFilters.search = '';
          elements.searchInput.value = '';
        } else if (filter.name === 'Category') {
          state.currentFilters.category = 'all';
          elements.categoryFilter.value = 'all';
        } else if (filter.name === 'Brand') {
          state.currentFilters.brand = 'all';
          elements.brandFilter.value = 'all';
        } else if (filter.name === 'Rating') {
          state.currentFilters.rating = 'all';
          elements.ratingFilter.value = 'all';
        } else if (filter.name === 'Price') {
          state.currentFilters.minPrice = 0;
          state.currentFilters.maxPrice = 100000;
          elements.priceMin.value = 0;
          elements.priceMax.value = 100000;
          updatePriceDisplay();
        }

        state.currentPage = 1;
        renderProducts();
        updateFilterSummary();
      });

      elements.filterSummary.appendChild(filterTag);
    });
  };

  // Update price display
  const updatePriceDisplay = () => {
    elements.minPriceDisplay.textContent = formatCurrency(elements.priceMin.value);
    elements.maxPriceDisplay.textContent = formatCurrency(elements.priceMax.value);
  };

  // Reset all filters
  const resetFilters = () => {
    state.currentFilters = {
      search: '',
      category: 'all',
      brand: 'all',
      rating: 'all',
      minPrice: 0,
      maxPrice: 100000,
      sort: 'default'
    };

    elements.searchInput.value = '';
    elements.categoryFilter.value = 'all';
    elements.brandFilter.value = 'all';
    elements.ratingFilter.value = 'all';
    elements.sortPrice.value = 'default';
    elements.priceMin.value = 0;
    elements.priceMax.value = 100000;

    state.currentPage = 1;
    updatePriceDisplay();
    renderProducts();
    updateFilterSummary();
  };

  // Toggle view mode
  const toggleViewMode = (isGrid) => {
    state.isGridView = isGrid;
    elements.productGrid.classList.toggle('list', !isGrid);
    elements.gridViewBtn.classList.toggle('active', isGrid);
    elements.listViewBtn.classList.toggle('active', !isGrid);
    renderProducts();
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

  // Event Listeners
  elements.menuToggle.addEventListener('click', () => {
    elements.navMenu.classList.toggle('active');
    elements.menuIcon.classList.toggle('fa-bars');
    elements.menuIcon.classList.toggle('fa-times');
  });

  elements.gridViewBtn.addEventListener('click', () => toggleViewMode(true));
  elements.listViewBtn.addEventListener('click', () => toggleViewMode(false));
  elements.resetFilters.addEventListener('click', resetFilters);

  elements.productGrid.addEventListener('click', (e) => {
    const productCard = e.target.closest('.product-item');
    if (!productCard) return;

    const productId = productCard.dataset.id;
    const product = state.products.find(p => p._id === productId);

    if (!product) return;

    // Add to cart
    if (e.target.closest('.add-to-cart')) {
      const existingItem = state.cart.find(item => item.id === productId);

      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
        state.cart.push({
          id: productId,
          name: product.name,
          price: parseFloat(productCard.dataset.price),
          image: product.images?.mainImage?.url || 'assets/images/default-product.png',
          quantity: 1
        });
      }

      localStorage.setItem('cart', JSON.stringify(state.cart));
      updateCartCount();
      showCartFeedback('Added to cart!');
    }

    // Quick view
    if (e.target.closest('.quick-view')) {
      elements.modalImage.src = product.images?.mainImage?.url || 'assets/images/default-product.png';
      elements.modalImage.alt = product.name;
      elements.modalName.textContent = product.name;
      elements.modalBrand.textContent = product.brand?.name || 'No Brand';

      const ratingValue = parseFloat(product.ratings?.$numberDecimal || 0);
      const ratingStars = '★'.repeat(Math.round(ratingValue)) + '☆'.repeat(5 - Math.round(ratingValue));
      elements.modalRating.innerHTML = `
            <span class="stars">${ratingStars}</span>
            <span>(${ratingValue.toFixed(1)})</span>
          `;

      elements.modalPrice.textContent = formatCurrency(productCard.dataset.price);
      elements.modalDescription.textContent = product.description || 'No description available';
      elements.modalAddToCart.dataset.id = productId;
      elements.quickViewModal.style.display = 'flex';

      // Add to recently viewed
      state.recentlyViewedList = state.recentlyViewedList.filter(id => id !== productId);
      state.recentlyViewedList.unshift(productId);
      if (state.recentlyViewedList.length > 5) state.recentlyViewedList.pop();
      localStorage.setItem('recentlyViewed', JSON.stringify(state.recentlyViewedList));
    }
  });

  elements.modalAddToCart.addEventListener('click', () => {
    const productId = elements.modalAddToCart.dataset.id;
    const productCard = document.querySelector(`.product-item[data-id="${productId}"]`);
    if (!productCard) return;

    const existingItem = state.cart.find(item => item.id === productId);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
      const product = state.products.find(p => p._id === productId);
      if (!product) return;

      state.cart.push({
        id: productId,
        name: product.name,
        price: parseFloat(productCard.dataset.price),
        image: product.images?.mainImage?.url || 'assets/images/default-product.png',
        quantity: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateCartCount();
    showCartFeedback('Added to cart!');
    elements.quickViewModal.style.display = 'none';
  });

  // Update filters
  const updateFilters = () => {
    state.currentFilters.search = elements.searchInput.value;
    state.currentFilters.category = elements.categoryFilter.value;
    state.currentFilters.brand = elements.brandFilter.value;
    state.currentFilters.rating = elements.ratingFilter.value;
    state.currentFilters.minPrice = parseInt(elements.priceMin.value);
    state.currentFilters.maxPrice = parseInt(elements.priceMax.value);
    state.currentFilters.sort = elements.sortPrice.value;

    state.currentPage = 1;
    renderProducts();
    updateFilterSummary();
  };

  // Debounced filter update
  const debouncedUpdate = debounce(updateFilters, 300);

  // Add event listeners for filters
  elements.searchInput.addEventListener('input', debouncedUpdate);
  elements.categoryFilter.addEventListener('change', debouncedUpdate);
  elements.brandFilter.addEventListener('change', debouncedUpdate);
  elements.ratingFilter.addEventListener('change', debouncedUpdate);
  elements.sortPrice.addEventListener('change', debouncedUpdate);
  elements.priceMin.addEventListener('input', () => {
    updatePriceDisplay();
    debouncedUpdate();
  });
  elements.priceMax.addEventListener('input', () => {
    updatePriceDisplay();
    debouncedUpdate();
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      elements.quickViewModal.style.display = 'none';
      elements.compareModal.style.display = 'none';
    });
  });

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === elements.quickViewModal) {
      elements.quickViewModal.style.display = 'none';
    }
    if (e.target === elements.compareModal) {
      elements.compareModal.style.display = 'none';
    }
  });

  // Initialize the shop
  initShop();
  updatePriceDisplay();
});
