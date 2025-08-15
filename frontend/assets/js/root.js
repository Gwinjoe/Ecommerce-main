// Utility function for API requests
async function fetchData(endpoint) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

// DOM elements
const elements = {
  categoryGrid: document.querySelector('.categories-grid .grid'),
  productGrid: document.getElementById('productGrid'),
  brandSwiperWrapper: document.querySelector('.mySwiper .swiper-wrapper'),
  recentSwiperWrapper: document.querySelector('.recent-swiper .swiper-wrapper'),
  categoryDropdown: document.querySelector('.dropdown-options'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  cartCount: document.querySelector('.cart-count')
};

// Global variables
let allProducts = [];
let allCategories = [];
let allBrands = [];

// Initialize application
async function initApp() {
  // Fetch data from APIs
  allCategories = await fetchData('/api/categories');
  allProducts = await fetchData('/api/products');
  allBrands = await fetchData('/api/brands');

  // Render all components
  renderCategories();
  renderProducts();
  renderBrandFeature();
  renderRecentProducts();

  // Initialize event listeners
  initEventListeners();
  initSwipers();
}

// Render categories in grid and dropdown
function renderCategories() {
  // Clear existing categories
  elements.categoryGrid.innerHTML = '';
  elements.categoryDropdown.innerHTML = '';

  // Add "All" option
  const allGridOption = document.createElement('div');
  allGridOption.className = 'cat-box active';
  allGridOption.dataset.filter = 'all';
  allGridOption.textContent = 'All';
  elements.categoryGrid.appendChild(allGridOption);

  const allDropdownOption = document.createElement('li');
  allDropdownOption.dataset.value = 'all';
  allDropdownOption.textContent = 'All Categories';
  elements.categoryDropdown.appendChild(allDropdownOption);

  // Add categories
  allCategories.forEach(category => {
    // Category grid item
    const gridItem = document.createElement('div');
    gridItem.className = 'cat-box';
    gridItem.dataset.filter = category._id;
    gridItem.textContent = category.name;
    elements.categoryGrid.appendChild(gridItem);

    // Dropdown option
    const dropdownItem = document.createElement('li');
    dropdownItem.dataset.value = category._id;
    dropdownItem.textContent = category.name;
    elements.categoryDropdown.appendChild(dropdownItem);
  });
}

// Create product card HTML
function createProductCard(product) {
  const price = product.price?.$numberDecimal || product.price || 0;
  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(price).replace('NGN', '₦');

  const rating = product.ratings?.$numberDecimal || 0;

  return `
    <div class="product-card animate-fade" data-category="${product.category?._id || ''}">
      <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${product.name}">
      <h4>${product.name}</h4>
      <p class="price">${formattedPrice}</p>
      <div class="card-bottom">
        <div class="rating"><i class="fas fa-star"></i> ${rating}</div>
        <button class="btn-cart" type="button" data-id="${product._id}">Add To Cart</button>
      </div>
    </div>
  `;
}

// Create swiper slide HTML
function createSwiperSlide(product) {
  const price = product.price?.$numberDecimal || product.price || 0;
  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(price).replace('NGN', '₦');

  const rating = product.ratings?.$numberDecimal || 0;

  return `
    <div class="swiper-slide product-card" data-category="${product.category?._id || ''}">
      <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${product.name}">
      <h4>${product.name}</h4>
      <p class="price">${formattedPrice}</p>
      <div class="card-bottom">
        <span class="rating">⭐ ${rating}</span>
        <button class="btn btn-cart" type="button" data-id="${product._id}">Add To Cart</button>
      </div>
    </div>
  `;
}

// Create recent product slide HTML
function createRecentSlide(product) {
  const price = product.price?.$numberDecimal || product.price || 0;
  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(price).replace('NGN', '₦');

  const rating = product.ratings?.$numberDecimal || 0;

  return `
    <div class="swiper-slide">
      <div class="product-card">
        <img src="${product.images?.mainImage?.url || 'assets/images/default-product.png'}" alt="${product.name}">
        <h4>${product.name}</h4>
        <div class="price">${formattedPrice}</div>
        <div class="card-bottom">
          <span class="rating">★ ${rating}</span>
          <button class="btn-cart" type="button" data-id="${product._id}">Add To Cart</button>
        </div>
      </div>
    </div>
  `;
}

// Render products in featured section
function renderProducts() {
  elements.productGrid.innerHTML = '';

  if (allProducts.length === 0) {
    elements.productGrid.innerHTML = `
      <div class="no-products">
        <i class="fas fa-tools"></i>
        <p>No products found</p>
      </div>
    `;
    return;
  }

  // Add initial products (first 6)
  allProducts.slice(0, 6).forEach(product => {
    elements.productGrid.innerHTML += createProductCard(product);
  });

  // Add hidden products (rest)
  allProducts.slice(6).forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card animate-fade hidden';
    card.dataset.category = product.category?._id || '';
    card.innerHTML = createProductCard(product).replace('class="product-card', '');
    elements.productGrid.appendChild(card);
  });

  // Update load more button
  elements.loadMoreBtn.style.display = allProducts.length > 6 ? 'block' : 'none';
}

// Render brand feature section
function renderBrandFeature() {
  elements.brandSwiperWrapper.innerHTML = '';

  // Get the brand name from the hero section (iNGCO)
  const brandName = document.querySelector('.brand-name').textContent.replace('iNG', 'iNG').replace('CO', 'CO');

  // Find the brand in our brands list
  const brand = allBrands.find(b => b.name.includes('iNGCO'));

  // Filter products by brand (if found)
  const brandProducts = brand
    ? allProducts.filter(p => p.brand?._id === brand._id)
    : allProducts.slice(0, 3);

  // Add slides
  brandProducts.slice(0, 3).forEach(product => {
    elements.brandSwiperWrapper.innerHTML += createSwiperSlide(product);
  });
}

// Render recent products
function renderRecentProducts() {
  elements.recentSwiperWrapper.innerHTML = '';

  // Get recent products (last 12 added)
  const recentProducts = [...allProducts].reverse().slice(0, 12);

  // Add slides
  recentProducts.forEach(product => {
    elements.recentSwiperWrapper.innerHTML += createRecentSlide(product);
  });
}

// Initialize swiper sliders
function initSwipers() {
  // Main brand swiper
  window.brandSwiper = new Swiper(".mySwiper", {
    slidesPerView: 1.2,
    spaceBetween: 20,
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    breakpoints: {
      640: {
        slidesPerView: 1.5,
      },
      768: {
        slidesPerView: 2,
      },
      1024: {
        slidesPerView: 2.5,
      },
    },
  });

  // Recent products swiper
  window.recentSwiper = new Swiper(".recent-swiper", {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    breakpoints: {
      640: {
        slidesPerView: 2,
      },
      768: {
        slidesPerView: 3,
      },
      1024: {
        slidesPerView: 4,
      },
    },
  });
}

// Initialize event listeners
function initEventListeners() {
  // Load more button
  elements.loadMoreBtn?.addEventListener('click', () => {
    const hiddenCards = document.querySelectorAll('.product-card.hidden');
    const toShow = Math.min(6, hiddenCards.length);

    for (let i = 0; i < toShow; i++) {
      hiddenCards[i].classList.remove('hidden');
    }

    if (document.querySelectorAll('.product-card.hidden').length === 0) {
      elements.loadMoreBtn.style.display = 'none';
    }
  });

  // Category filtering
  document.querySelectorAll('.cat-box').forEach(box => {
    box.addEventListener('click', () => {
      const filter = box.dataset.filter;

      // Update active class
      document.querySelectorAll('.cat-box').forEach(b => b.classList.remove('active'));
      box.classList.add('active');

      // Update dropdown
      document.querySelector('.dropdown-selected').textContent = box.textContent;

      // Filter products
      filterProducts(filter);
    });
  });

  // Dropdown filtering
  document.querySelectorAll('.dropdown-options li').forEach(option => {
    option.addEventListener('click', () => {
      const filter = option.dataset.value;

      // Update dropdown
      document.querySelector('.dropdown-selected').textContent = option.textContent;

      // Update active category box
      document.querySelectorAll('.cat-box').forEach(box => {
        box.classList.remove('active');
        if (box.dataset.filter === filter) {
          box.classList.add('active');
        }
      });

      // Filter products
      filterProducts(filter);
    });
  });

  // Search functionality
  document.querySelector('.search-bar button').addEventListener('click', searchProducts);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchProducts();
  });

  // Add to cart functionality
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-cart')) {
      addToCart(e.target.dataset.id);
    }
  });
}

// Filter products by category
function filterProducts(categoryId) {
  const productCards = document.querySelectorAll('#productGrid .product-card');

  productCards.forEach(card => {
    if (categoryId === 'all' || card.dataset.category === categoryId) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });

  // Update swipers
  if (window.brandSwiper) window.brandSwiper.update();
}

// Search products
function searchProducts() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();

  if (!query) {
    // Show all products if search is empty
    document.querySelectorAll('#productGrid .product-card').forEach(card => {
      card.style.display = 'block';
    });
    return;
  }

  let found = false;

  document.querySelectorAll('#productGrid .product-card').forEach(card => {
    const name = card.querySelector('h4').textContent.toLowerCase();
    const description = card.querySelector('.price').textContent.toLowerCase();

    if (name.includes(query) || description.includes(query)) {
      card.style.display = 'block';
      found = true;
    } else {
      card.style.display = 'none';
    }
  });

  // Show message if no results
  const feedback = document.getElementById('search-feedback');
  if (!found) {
    if (!feedback) {
      const feedbackEl = document.createElement('div');
      feedbackEl.id = 'search-feedback';
      feedbackEl.textContent = 'No products found matching your search.';
      feedbackEl.style.cssText = `
        color: #e74c3c;
        font-weight: bold;
        margin-top: 10px;
        text-align: center;
        padding: 10px;
        background: #f8d7da;
        border-radius: 4px;
      `;
      document.querySelector('.search-bar').appendChild(feedbackEl);
    }
  } else if (feedback) {
    feedback.remove();
  }
}

// Add to cart functionality
function addToCart(productId) {
  // Find the product
  const product = allProducts.find(p => p._id === productId);
  if (!product) return;

  // Get existing cart or create new
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  // Check if product already in cart
  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: product.price?.$numberDecimal || product.price,
      image: product.images?.mainImage?.url || 'assets/images/default-product.png',
      quantity: 1
    });
  }

  // Save to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));

  // Update cart count
  updateCartCount();

  // Show feedback
  showAddToCartFeedback();
}

// Update cart count
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = totalItems;
}

// Show add to cart feedback
function showAddToCartFeedback() {
  const feedback = document.createElement('div');
  feedback.className = 'cart-feedback';
  feedback.innerHTML = `
    <i class="fas fa-check-circle"></i> Added to cart!
  `;

  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.classList.add('show');
  }, 10);

  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 300);
  }, 2000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize app
  initApp();

  // Update cart count
  updateCartCount();

  // Existing functionality from your code
  initMenuToggle();
  initSmoothScroll();
  initDropdown();
  initScrollReveal();
  initSearch();
  initScrollToTop();
  updateYear();
});

// Existing functions from your code (with minor adjustments)
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
      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

function initDropdown() {
  const dropdown = document.getElementById("categoryDropdown");
  if (!dropdown) return;

  const selected = dropdown.querySelector(".dropdown-selected");
  const options = dropdown.querySelectorAll(".dropdown-options li");

  selected.addEventListener("click", () => {
    dropdown.classList.toggle("open");
  });

  options.forEach(option => {
    option.addEventListener("click", () => {
      selected.textContent = option.textContent;
      dropdown.classList.remove("open");
    });
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".animate-fade-in, .animate-up").forEach(el => observer.observe(el));
}

function initSearch() {
  // Handled in initEventListeners
}

function initScrollToTop() {
  const scrollTopBtn = document.getElementById("scrollTopBtn");

  window.onscroll = function() {
    if (scrollTopBtn) {
      scrollTopBtn.style.display = (document.documentElement.scrollTop > 300) ? "block" : "none";
    }
  };

  scrollTopBtn?.addEventListener("click", function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function updateYear() {
  document.getElementById("year").textContent = new Date().getFullYear();
}
