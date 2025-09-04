
import { updateHeaderView, useapi, fetchCurrentUser } from "./user-details.js";

document.addEventListener('DOMContentLoaded', async () => {
  updateHeaderView();
  const user = await fetchCurrentUser();

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

  let state = {
    products: [],            // current page items only
    categories: [],
    brands: [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('wishlist')) || [],
    compareList: JSON.parse(localStorage.getItem('compare')) || [],
    recentlyViewedList: JSON.parse(localStorage.getItem('recentlyViewed')) || [],
    currentPage: 1,
    itemsPerPage: 20,
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
    absoluteMaxPrice: 1000000,
    absoluteMinPrice: 0,
    totalProducts: 0,
    totalPages: 1,
    hasFetchedAll: false
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const getNumericValue = (value) => {
    if (value == null) return 0;
    if (typeof value === 'object' && value.$numberDecimal) {
      return parseFloat(value.$numberDecimal) || 0;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return parseFloat(value) || 0;
    }
    return 0;
  };

  const formatCurrency = (amount) => {
    const numeric = getNumericValue(amount);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: "NGN",
      minimumFractionDigits: 2
    }).format(numeric);
  };

  // Basic fetch that returns data array (old-style)
  const fetchData = async (endpoint, { showSpinner = true } = {}) => {
    try {
      if (showSpinner) elements.spinner.style.display = 'block';
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
      if (showSpinner) elements.spinner.style.display = 'none';
    }
  };

  // Fetch JSON and return full object (success, data, meta)
  const fetchJson = async (endpoint, { showSpinner = true } = {}) => {
    try {
      if (showSpinner) elements.spinner.style.display = 'block';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('fetchJson error:', error);
      return { success: false, data: [], meta: {} };
    } finally {
      if (showSpinner) elements.spinner.style.display = 'none';
    }
  };

  // append nodes in batches (for when prefetching next page)
  const appendProductNodes = (products) => {
    const frag = document.createDocumentFragment();
    products.forEach(p => frag.appendChild(createProductCard(p)));
    elements.productGrid.appendChild(frag);
  };

  const scheduleWork = (fn) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(fn, { timeout: 500 });
    } else {
      setTimeout(fn, 50);
    }
  };

  // prefetch next page (lightweight, helps perceived speed)
  const prefetchNextPage = async (page) => {
    if (!page || page > state.totalPages) return;
    try {
      const q = buildQuery({ page, limit: state.itemsPerPage, prefetch: true });
      const resp = await fetchJson(`/api/products?${q}`, { showSpinner: false });
      // We don't attach prefetch results into state.products directly — but you could cache them
      if (resp.success && Array.isArray(resp.data)) {
        // Optionally store in a small cache:
        // prefetchCache[page] = resp.data;
        // For now we just append nothing — this function intentionally light.
      }
    } catch (err) {
      // ignore prefetch errors
    }
  };

  // Build querystring from filters + pagination + sort
  const buildQuery = ({ page = state.currentPage, limit = state.itemsPerPage } = {}) => {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', limit);

    const f = state.currentFilters;
    if (f.search) params.set('search', f.search);
    if (f.category && f.category !== 'all') params.set('category', f.category);
    if (f.brand && f.brand !== 'all') params.set('brand', f.brand);
    if (f.minPrice != null) params.set('minPrice', f.minPrice);
    if (f.maxPrice != null) params.set('maxPrice', f.maxPrice);

    // Map sort selection to server sort param
    switch (f.sort) {
      case 'low-high':
        params.set('sort', 'price');
        break;
      case 'high-low':
        params.set('sort', '-price');
        break;
      case 'rating':
        params.set('sort', '-ratings');
        break;
      default:
        params.set('sort', '-createdAt');
    }

    return params.toString();
  };

  // fetch a page from server using current filters
  const fetchPage = async (page = 1) => {
    try {
      elements.spinner.style.display = 'block';
      state.currentPage = page;

      const q = buildQuery({ page, limit: state.itemsPerPage });
      const resp = await fetchJson(`/api/products?${q}`, { showSpinner: false });

      if (resp.success) {
        state.products = Array.isArray(resp.data) ? resp.data : [];
        state.totalProducts = resp.meta?.total ?? (state.products.length || 0);
        state.totalPages = resp.meta?.pages ?? Math.max(1, Math.ceil(state.totalProducts / state.itemsPerPage));
      } else {
        state.products = [];
        state.totalProducts = 0;
        state.totalPages = 1;
      }

      // render the page
      renderProducts();

      // prefetch next page in idle time
      scheduleWork(() => prefetchNextPage(state.currentPage + 1));
    } catch (err) {
      console.error('fetchPage error', err);
    } finally {
      elements.spinner.style.display = 'none';
    }
  };

  // fetch absolute min/max price from server so slider is accurate
  const fetchPriceRange = async () => {
    try {
      const resp = await fetchJson('/api/products/price-range', { showSpinner: false });
      if (resp.success && resp.data) {
        const { min = 0, max = 1000000 } = resp.data;
        state.absoluteMinPrice = Math.floor(min);
        state.absoluteMaxPrice = Math.ceil(max);
      } else {
        state.absoluteMinPrice = 0;
        state.absoluteMaxPrice = 1000000;
      }
      // update UI controls
      elements.priceMin.min = state.absoluteMinPrice;
      elements.priceMax.max = state.absoluteMaxPrice;
      elements.priceMin.max = state.absoluteMaxPrice;
      elements.priceMin.value = state.absoluteMinPrice;
      elements.priceMax.value = state.absoluteMaxPrice;
      state.currentFilters.minPrice = state.absoluteMinPrice;
      state.currentFilters.maxPrice = state.absoluteMaxPrice;
      updatePriceDisplay();
    } catch (err) {
      console.error('fetchPriceRange error', err);
    }
  };

  // initShop uses server-driven pagination & price-range
  const initShop = async () => {
    state.categories = await fetchData('/api/categories', { showSpinner: false });
    state.brands = await fetchData('/api/brands', { showSpinner: false });

    // populate category/brand options (if present)
    const categoryOptions = document.getElementById('categoryOptions');
    if (categoryOptions) {
      categoryOptions.innerHTML = '';
      const allCat = document.createElement('div');
      allCat.className = 'filter-option active';
      allCat.dataset.value = 'all';
      allCat.textContent = 'All';
      categoryOptions.appendChild(allCat);
      state.categories.forEach(category => {
        const option = document.createElement('div');
        option.className = 'filter-option';
        option.dataset.value = category._id;
        option.textContent = category.name;
        categoryOptions.appendChild(option);
      });
    }

    const brandOptions = document.getElementById('brandOptions');
    if (brandOptions) {
      brandOptions.innerHTML = '';
      const allBrand = document.createElement('div');
      allBrand.className = 'filter-option active';
      allBrand.dataset.value = 'all';
      allBrand.textContent = 'All';
      brandOptions.appendChild(allBrand);
      state.brands.forEach(brand => {
        const option = document.createElement('div');
        option.className = 'filter-option';
        option.dataset.value = brand._id;
        option.textContent = brand.name;
        brandOptions.appendChild(option);
      });
    }

    // wire up filter option clicks
    document.querySelectorAll('.filter-option').forEach(option => {
      option.addEventListener('click', async () => {
        const container = option.parentElement;
        const filterType = container.id.replace('Options', '');
        container.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        state.currentFilters[filterType] = option.dataset.value;
        // fetch page 1 from server with new filter
        await fetchPage(1);
        updateFilterSummary();
      });
    });

    // Price range must be fetched from server first to set accurate slider bounds
    await fetchPriceRange();

    // load first page with the server (this will also set total/products)
    await fetchPage(1);

    updateCartCount();
    updateFilterSummary();
    updatePriceDisplay();
  };

  // renderProducts now renders state.products (server-provided page)
  const renderProducts = () => {
    elements.productGrid.innerHTML = '';
    elements.noResults.style.display = 'none';

    if (!state.products || state.products.length === 0) {
      elements.noResults.style.display = 'block';
      elements.noResults.textContent = 'No products found matching your criteria.';
      renderPagination(0);
      return;
    }

    const frag = document.createDocumentFragment();
    state.products.forEach(product => frag.appendChild(createProductCard(product)));
    elements.productGrid.appendChild(frag);

    // render pagination using totalProducts (server-provided)
    renderPagination(state.totalProducts);
  };

  const createProductCard = (product) => {
    const productCard = document.createElement('div');
    productCard.className = `product-item ${state.isGridView ? '' : 'list'}`;
    productCard.dataset.id = product._id;
    productCard.dataset.category = product.category?._id || '';
    productCard.dataset.brand = product.brand?._id || '';
    productCard.dataset.name = product.name;
    productCard.dataset.price = getNumericValue(product.price);
    productCard.dataset.rating = getNumericValue(product.ratings);

    const badges = `
      ${product.isTrending ? '<span class="badge trending">Trending</span>' : ''}
      ${product.isNew ? '<span class="badge new">New</span>' : ''}
      ${product.isBestSeller ? '<span class="badge best">Best Seller</span>' : ''}
    `;

    const ratingValue = getNumericValue(product.ratings);
    const fullStars = Math.floor(ratingValue);
    const halfStar = ratingValue % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;

    const ratingStars = '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);

    productCard.innerHTML = `
      ${badges}
      <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}"
           alt="${product.name}"
           loading="lazy">
      <h2 class="product-name">
        <a href="/product?id=${product._id}" class="product-link">${product.name}</a>
      </h2>
      <p class="brand">${product.brand?.name || 'No Brand'}</p>
      <div class="rating">
        <span class="stars">${ratingStars}</span>
        <span>(${(ratingValue || 0).toFixed(1)})</span>
      </div>
      <p class="price">${formatCurrency(product.price)}</p>
      <div class="product-actions">
        <button type="button" class="add-to-cart" aria-label="Add ${product.name} to cart">
          Add to Cart
        </button>
        <button type="button" class="quick-view" aria-label="Quick view ${product.name}">
          <i class="fas fa-eye"></i>
        </button>
        <button type="button" class="wishlist" style="color: ${user && user.wishlist && user.wishlist.find(item => item == product._id) ? 'red' : 'white'};" aria-label="Add ${product.name} to wishlist">
          <i class="fas fa-heart"></i>
        </button>
        <button type="button" class="compare" aria-label="Compare ${product.name}">
          <i class="fas fa-balance-scale"></i>
        </button>
      </div>
      <div class="tooltip"></div>
    `;

    return productCard;
  };

  const applyFilters = () => {
    // kept for locally filtering recentlyViewed items only (not used for pages)
    return state.products.filter(product => {
      const productPrice = getNumericValue(product.price);
      const productRating = getNumericValue(product.ratings);

      const matchesSearch = product.name && product.name.toLowerCase()
        .includes((state.currentFilters.search || '').toLowerCase());

      const matchesCategory = state.currentFilters.category === 'all' ||
        (product.category?._id === state.currentFilters.category);

      const matchesBrand = state.currentFilters.brand === 'all' ||
        (product.brand?._id === state.currentFilters.brand);

      const matchesRating = state.currentFilters.rating === 'all' ||
        (productRating >= parseFloat(state.currentFilters.rating));

      const matchesPrice = productPrice >= state.currentFilters.minPrice &&
        productPrice <= state.currentFilters.maxPrice;

      return matchesSearch && matchesCategory && matchesBrand && matchesRating && matchesPrice;
    });
  };

  const applySorting = (products) => {
    // Not used for server-driven pages; kept if you want local sort for small sets
    return products.sort((a, b) => {
      const priceA = getNumericValue(a.price);
      const priceB = getNumericValue(b.price);
      const ratingA = getNumericValue(a.ratings);
      const ratingB = getNumericValue(b.ratings);

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

  const renderPagination = (totalItems) => {
    elements.pagination.innerHTML = '';
    const pageCount = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));
    state.totalPages = pageCount;

    if (state.currentPage > 1) {
      const prevLink = document.createElement('a');
      prevLink.href = '#';
      prevLink.innerHTML = '&laquo;';
      prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        fetchPage(state.currentPage - 1);
      });
      elements.pagination.appendChild(prevLink);
    }

    // show windowed pagination (avoid rendering thousands of page links)
    const maxButtons = 7;
    let start = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(pageCount, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

    for (let i = start; i <= end; i++) {
      const pageLink = document.createElement('a');
      pageLink.href = '#';
      pageLink.textContent = i;
      if (i === state.currentPage) pageLink.classList.add('current');
      pageLink.addEventListener('click', (e) => {
        e.preventDefault();
        fetchPage(i);
      });
      elements.pagination.appendChild(pageLink);
    }

    if (state.currentPage < pageCount) {
      const nextLink = document.createElement('a');
      nextLink.href = '#';
      nextLink.innerHTML = '&raquo;';
      nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        fetchPage(state.currentPage + 1);
      });
      elements.pagination.appendChild(nextLink);
    }
  };

  const updateCartCount = () => {
    const totalItems = state.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    elements.cartCount.textContent = totalItems;
  };

  const updateFilterSummary = () => {
    elements.filterSummary.innerHTML = '';

    const filters = [
      { name: 'Search', value: state.currentFilters.search, display: state.currentFilters.search ? `"${state.currentFilters.search}"` : null },
      { name: 'Category', value: state.currentFilters.category, display: state.currentFilters.category === 'all' ? null : state.categories.find(c => c._id === state.currentFilters.category)?.name },
      { name: 'Brand', value: state.currentFilters.brand, display: state.currentFilters.brand === 'all' ? null : state.brands.find(b => b._id === state.currentFilters.brand)?.name },
      { name: 'Rating', value: state.currentFilters.rating, display: state.currentFilters.rating === 'all' ? null : `${state.currentFilters.rating}+ stars` },
      { name: 'Price', value: `${state.currentFilters.minPrice}-${state.currentFilters.maxPrice}`, display: state.currentFilters.minPrice > state.absoluteMinPrice || state.currentFilters.maxPrice < state.absoluteMaxPrice ? `${formatCurrency(state.currentFilters.minPrice)} - ${formatCurrency(state.currentFilters.maxPrice)}` : null }
    ].filter(f => f.display);

    filters.forEach(filter => {
      const filterTag = document.createElement('div');
      filterTag.className = 'filter-tag';
      filterTag.innerHTML = `${filter.name}: ${filter.display} <span aria-label="Remove filter">×</span>`;

      filterTag.querySelector('span').addEventListener('click', async () => {
        if (filter.name === 'Search') {
          state.currentFilters.search = '';
          elements.searchInput.value = '';
        } else if (filter.name === 'Category') {
          state.currentFilters.category = 'all';
          const el = document.querySelector('#categoryOptions .filter-option[data-value="all"]');
          if (el) el.click();
        } else if (filter.name === 'Brand') {
          state.currentFilters.brand = 'all';
          const el = document.querySelector('#brandOptions .filter-option[data-value="all"]');
          if (el) el.click();
        } else if (filter.name === 'Rating') {
          state.currentFilters.rating = 'all';
          const el = document.querySelector('#ratingOptions .filter-option[data-value="all"]');
          if (el) el.click();
        } else if (filter.name === 'Price') {
          state.currentFilters.minPrice = state.absoluteMinPrice;
          state.currentFilters.maxPrice = state.absoluteMaxPrice;
          elements.priceMin.value = state.absoluteMinPrice;
          elements.priceMax.value = state.absoluteMaxPrice;
          updatePriceDisplay();
        }
        await fetchPage(1);
        updateFilterSummary();
      });

      elements.filterSummary.appendChild(filterTag);
    });
  };

  const updatePriceDisplay = () => {
    elements.minPriceDisplay.textContent = formatCurrency(elements.priceMin.value);
    elements.maxPriceDisplay.textContent = formatCurrency(elements.priceMax.value);
  };

  const resetFilters = async () => {
    state.currentFilters = {
      search: '',
      category: 'all',
      brand: 'all',
      rating: 'all',
      minPrice: state.absoluteMinPrice,
      maxPrice: state.absoluteMaxPrice,
      sort: 'default'
    };

    elements.searchInput.value = '';
    elements.sortPrice.value = 'default';
    elements.priceMin.value = state.absoluteMinPrice;
    elements.priceMax.value = state.absoluteMaxPrice;

    document.querySelectorAll('.filter-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.value === 'all') option.classList.add('active');
    });

    state.currentPage = 1;
    updatePriceDisplay();
    await fetchPage(1);
    updateFilterSummary();
  };

  const toggleViewMode = (isGrid) => {
    state.isGridView = isGrid;
    elements.productGrid.classList.toggle('list', !isGrid);
    elements.gridViewBtn.classList.toggle('active', isGrid);
    elements.listViewBtn.classList.toggle('active', !isGrid);
    renderProducts();
  };

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

  const addToCart = async (productId, quantity = 1) => {
    const product = state.products.find(p => p._id === productId);
    if (!product) return;

    const existingItem = state.cart.find(item => item.id === productId);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      state.cart.push({
        id: productId,
        name: product.name,
        price: getNumericValue(product.price),
        image: product.images?.mainImage?.url || 'assets/images/default-product.png',
        quantity: quantity
      });
    }

    localStorage.setItem('cart', JSON.stringify(state.cart));

    if (user) {
      try {
        const response = await fetch("/api/add_to_cart", {
          method: "PATCH",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ id: user._id, cartItem: productId, quantity: existingItem ? existingItem.quantity : quantity })
        });
        await response.json();
      } catch (err) {
        console.error('addToCart server error', err);
      }
    }
    updateCartCount();
    showCartFeedback('Added to cart!');
  };

  const addToWishlist = async (productId) => {
    if (user) {
      try {
        const response = await fetch("/api/add_to_wishlist", {
          method: "PATCH",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ id: user._id, item: productId }),
        });
        const { success, message } = await response.json();
        if (success) showCartFeedback(message);
      } catch (err) {
        console.error('addToWishlist error', err);
      }
    }
  };

  const removeFromWishlist = async (productId) => {
    if (user) {
      try {
        const response = await fetch("/api/delete_from_wishlist", {
          method: "PATCH",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ userId: user._id, itemId: productId }),
        });
        const { success, message } = await response.json();
        if (success) showCartFeedback(message);
      } catch (err) {
        console.error('removeFromWishlist error', err);
      }
    }
  };

  // start
  await initShop();

  elements.menuToggle.addEventListener('click', () => {
    elements.navMenu.classList.toggle('active');
    elements.menuIcon.classList.toggle('fa-bars');
    elements.menuIcon.classList.toggle('fa-times');
  });

  elements.gridViewBtn.addEventListener('click', () => toggleViewMode(true));
  elements.listViewBtn.addEventListener('click', () => toggleViewMode(false));
  elements.resetFilters.addEventListener('click', resetFilters);

  elements.productGrid.addEventListener('click', async (e) => {
    const productCard = e.target.closest('.product-item');
    if (!productCard) return;

    const productId = productCard.dataset.id;
    const product = state.products.find(p => p._id === productId);

    if (!product) return;

    if (e.target.closest('.add-to-cart')) {
      addToCart(productId);
      e.stopPropagation();
    }

    if (e.target.closest('.wishlist')) {
      const wishbutton = e.target.closest(".wishlist");
      if (wishbutton.style.color === "red") {
        await removeFromWishlist(productId);
        wishbutton.style.color = "white";
        e.stopPropagation();
      } else {
        await addToWishlist(productId);
        wishbutton.style.color = "red";
        e.stopPropagation();
      }
    }

    if (e.target.closest('.quick-view')) {
      elements.modalImage.src = product.images?.mainImage?.url || 'assets/images/default-product.png';
      elements.modalImage.alt = product.name;
      elements.modalName.textContent = product.name;
      elements.modalBrand.textContent = product.brand?.name || 'No Brand';

      const ratingValue = getNumericValue(product.ratings);
      const fullStars = Math.floor(ratingValue);
      const halfStar = ratingValue % 1 >= 0.5 ? 1 : 0;
      const emptyStars = 5 - fullStars - halfStar;
      const ratingStars = '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);

      elements.modalRating.innerHTML = `<span class="stars">${ratingStars}</span><span>(${ratingValue.toFixed(1)})</span>`;
      elements.modalPrice.textContent = formatCurrency(product.price);
      elements.modalDescription.textContent = product.description || 'No description available';
      elements.modalAddToCart.dataset.id = productId;
      elements.quickViewModal.style.display = 'flex';

      state.recentlyViewedList = state.recentlyViewedList.filter(id => id !== productId);
      state.recentlyViewedList.unshift(productId);
      if (state.recentlyViewedList.length > 5) state.recentlyViewedList.pop();
      localStorage.setItem('recentlyViewed', JSON.stringify(state.recentlyViewedList));
      updateRecentlyViewed();
    }
  });

  const updateRecentlyViewed = () => {
    elements.recentlyViewed.innerHTML = '';
    const recentProducts = state.recentlyViewedList
      .map(id => state.products.find(p => p._id === id))
      .filter(p => p);

    recentProducts.forEach(product => {
      const productCard = createProductCard(product);
      productCard.classList.add('recent-product');
      elements.recentlyViewed.appendChild(productCard);
    });
  };

  elements.modalAddToCart.addEventListener('click', () => {
    const productId = elements.modalAddToCart.dataset.id;
    addToCart(productId);
    elements.quickViewModal.style.display = 'none';
  });

  const updateFilters = async () => {
    state.currentFilters.search = elements.searchInput.value;
    state.currentFilters.sort = elements.sortPrice.value;
    state.currentFilters.minPrice = parseFloat(elements.priceMin.value) || state.absoluteMinPrice;
    state.currentFilters.maxPrice = parseFloat(elements.priceMax.value) || state.absoluteMaxPrice;

    // Server-side fetch page 1 with new filters
    await fetchPage(1);
    updateFilterSummary();
  };

  const debouncedUpdate = debounce(updateFilters, 300);

  elements.searchInput.addEventListener('input', debouncedUpdate);
  elements.sortPrice.addEventListener('change', debouncedUpdate);
  elements.priceMin.addEventListener('input', () => {
    updatePriceDisplay();
    debouncedUpdate();
  });
  elements.priceMax.addEventListener('input', () => {
    updatePriceDisplay();
    debouncedUpdate();
  });

  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      elements.quickViewModal.style.display = 'none';
      elements.compareModal.style.display = 'none';
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === elements.quickViewModal) elements.quickViewModal.style.display = 'none';
    if (e.target === elements.compareModal) elements.compareModal.style.display = 'none';
  });
});

