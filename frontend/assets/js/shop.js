import { updateHeaderView, useapi } from "./user-details.js";
let ip;
document.addEventListener('DOMContentLoaded', async () => {
  updateHeaderView();
  const { ipapi } = await useapi();
  ip = ipapi;
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
    absoluteMaxPrice: 1000000
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const formatCurrency = (amount) => {
    const value = amount?.$numberDecimal ? parseFloat(amount.$numberDecimal) : parseFloat(amount);
    if (ip.currency !== "NGN") {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: ip.currency,
        minimumFractionDigits: 2
      }).format(amount)
    }
    return `₦${value.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getNumericValue = (value) => {
    if (value?.$numberDecimal) {
      return parseFloat(value.$numberDecimal);
    }
    return parseFloat(value) || 0;
  };

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

  const initShop = async () => {
    state.categories = await fetchData('/api/categories');
    state.brands = await fetchData('/api/brands');
    state.products = await fetchData('/api/products');

    if (ip.currency !== "NGN") {
      state.products.forEach((product) => {
        product.price.$numberDecimal = convert(product.price.$numberDecimal, ip.currency)
      })
    }

    if (state.products.length > 0) {
      const maxPrice = Math.max(...state.products.map(p => getNumericValue(p.price)));
      state.absoluteMaxPrice = Math.ceil(maxPrice / 100) * 100;
    } else {
      state.absoluteMaxPrice = 1000000;
    }

    state.currentFilters.maxPrice = state.absoluteMaxPrice;
    elements.priceMax.max = state.absoluteMaxPrice;
    elements.priceMin.max = state.absoluteMaxPrice;
    elements.priceMax.value = state.absoluteMaxPrice;

    const categoryOptions = document.getElementById('categoryOptions');
    state.categories.forEach(category => {
      const option = document.createElement('div');
      option.className = 'filter-option';
      option.dataset.value = category._id;
      option.textContent = category.name;
      categoryOptions.appendChild(option);
    });

    const brandOptions = document.getElementById('brandOptions');
    state.brands.forEach(brand => {
      const option = document.createElement('div');
      option.className = 'filter-option';
      option.dataset.value = brand._id;
      option.textContent = brand.name;
      brandOptions.appendChild(option);
    });

    document.querySelectorAll('.filter-option').forEach(option => {
      option.addEventListener('click', () => {
        const container = option.parentElement;
        const filterType = container.id.replace('Options', '');

        container.querySelectorAll('.filter-option').forEach(opt => {
          opt.classList.remove('active');
        });

        option.classList.add('active');

        state.currentFilters[filterType] = option.dataset.value;
        state.currentPage = 1;
        renderProducts();
        updateFilterSummary();
      });
    });
    renderProducts();
    updateCartCount();
    updateFilterSummary();
    updatePriceDisplay();
  };

  const renderProducts = () => {
    elements.productGrid.innerHTML = '';
    elements.noResults.style.display = 'none';

    if (state.products.length === 0) {
      elements.noResults.style.display = 'block';
      elements.noResults.textContent = 'No products available. Please check back later.';
      return;
    }

    let filteredProducts = applyFilters();


    if (filteredProducts.length === 0) {
      elements.noResults.style.display = 'block';
      elements.noResults.textContent = 'No products found matching your criteria.';
      return;
    }

    filteredProducts = applySorting(filteredProducts);

    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);

    paginatedProducts.forEach(product => {
      const productCard = createProductCard(product);
      elements.productGrid.appendChild(productCard);
    });

    renderPagination(filteredProducts.length);
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

    const ratingStars = '★'.repeat(fullStars) +
      (halfStar ? '½' : '') +
      '☆'.repeat(emptyStars);

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
            <span>(${ratingValue.toFixed(1)})</span>
          </div>
          <p class="price">${formatCurrency(product.price)}</p>
          <div class="product-actions">
            <button type="button" class="add-to-cart" aria-label="Add ${product.name} to cart">
              Add to Cart
            </button>
            <button type="button" class="quick-view" aria-label="Quick view ${product.name}">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="wishlist" aria-label="Add ${product.name} to wishlist">
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
    return state.products.filter(product => {
      const productPrice = getNumericValue(product.price);
      const productRating = getNumericValue(product.ratings);

      const matchesSearch = product.name.toLowerCase()
        .includes(state.currentFilters.search.toLowerCase());

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
    const pageCount = Math.ceil(totalItems / state.itemsPerPage);

    if (state.currentPage > 1) {
      const prevLink = document.createElement('a');
      prevLink.href = '#';
      prevLink.innerHTML = '&laquo;';
      prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        state.currentPage--;
        renderProducts();
      });
      elements.pagination.appendChild(prevLink);
    }

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

    if (state.currentPage < pageCount) {
      const nextLink = document.createElement('a');
      nextLink.href = '#';
      nextLink.innerHTML = '&raquo;';
      nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        state.currentPage++;
        renderProducts();
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
      {
        name: 'Search',
        value: state.currentFilters.search,
        display: state.currentFilters.search ? `"${state.currentFilters.search}"` : null
      },
      {
        name: 'Category',
        value: state.currentFilters.category,
        display: state.currentFilters.category === 'all' ? null :
          state.categories.find(c => c._id === state.currentFilters.category)?.name
      },
      {
        name: 'Brand',
        value: state.currentFilters.brand,
        display: state.currentFilters.brand === 'all' ? null :
          state.brands.find(b => b._id === state.currentFilters.brand)?.name
      },
      {
        name: 'Rating',
        value: state.currentFilters.rating,
        display: state.currentFilters.rating === 'all' ? null :
          `${state.currentFilters.rating}+ stars`
      },
      {
        name: 'Price',
        value: `${state.currentFilters.minPrice}-${state.currentFilters.maxPrice}`,
        display: state.currentFilters.minPrice > 0 || state.currentFilters.maxPrice < state.absoluteMaxPrice ?
          `${formatCurrency(state.currentFilters.minPrice)} - ${formatCurrency(state.currentFilters.maxPrice)}` : null
      }
    ].filter(f => f.display);

    filters.forEach(filter => {
      const filterTag = document.createElement('div');
      filterTag.className = 'filter-tag';
      filterTag.innerHTML = `
            ${filter.name}: ${filter.display}
            <span aria-label="Remove filter">×</span>
          `;

      filterTag.querySelector('span').addEventListener('click', () => {
        if (filter.name === 'Search') {
          state.currentFilters.search = '';
          elements.searchInput.value = '';
        } else if (filter.name === 'Category') {
          state.currentFilters.category = 'all';
          document.querySelector('#categoryOptions .filter-option[data-value="all"]').click();
        } else if (filter.name === 'Brand') {
          state.currentFilters.brand = 'all';
          document.querySelector('#brandOptions .filter-option[data-value="all"]').click();
        } else if (filter.name === 'Rating') {
          state.currentFilters.rating = 'all';
          document.querySelector('#ratingOptions .filter-option[data-value="all"]').click();
        } else if (filter.name === 'Price') {
          state.currentFilters.minPrice = 0;
          state.currentFilters.maxPrice = state.absoluteMaxPrice;
          elements.priceMin.value = 0;
          elements.priceMax.value = state.absoluteMaxPrice;
          updatePriceDisplay();
        }

        state.currentPage = 1;
        renderProducts();
        updateFilterSummary();
      });

      elements.filterSummary.appendChild(filterTag);
    });
  };

  const updatePriceDisplay = () => {
    elements.minPriceDisplay.textContent = formatCurrency(elements.priceMin.value);
    elements.maxPriceDisplay.textContent = formatCurrency(elements.priceMax.value);
  };

  const resetFilters = () => {
    state.currentFilters = {
      search: '',
      category: 'all',
      brand: 'all',
      rating: 'all',
      minPrice: 0,
      maxPrice: state.absoluteMaxPrice,
      sort: 'default'
    };

    elements.searchInput.value = '';
    elements.sortPrice.value = 'default';
    elements.priceMin.value = 0;
    elements.priceMax.value = state.absoluteMaxPrice;

    document.querySelectorAll('.filter-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.value === 'all') {
        option.classList.add('active');
      }
    });

    state.currentPage = 1;
    updatePriceDisplay();
    renderProducts();
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

  const addToCart = (productId, quantity = 1) => {
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
    updateCartCount();
    showCartFeedback('Added to cart!');
  };

  initShop();

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

    if (e.target.closest('.add-to-cart')) {
      addToCart(productId);
      e.stopPropagation();
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

      elements.modalRating.innerHTML = `
            <span class="stars">${ratingStars}</span>
            <span>(${ratingValue.toFixed(1)})</span>
          `;

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

  const updateFilters = () => {
    state.currentFilters.search = elements.searchInput.value;
    state.currentFilters.sort = elements.sortPrice.value;
    state.currentFilters.minPrice = parseFloat(elements.priceMin.value) || 0;
    state.currentFilters.maxPrice = parseFloat(elements.priceMax.value) || state.absoluteMaxPrice;

    state.currentPage = 1;
    renderProducts();
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
    if (e.target === elements.quickViewModal) {
      elements.quickViewModal.style.display = 'none';
    }
    if (e.target === elements.compareModal) {
      elements.compareModal.style.display = 'none';
    }
  });
});
