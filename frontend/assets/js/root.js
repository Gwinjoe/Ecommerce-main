import { updateHeaderView } from "./user-details.js"

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
let currency = "NGN";
let allProducts = [];
let allCategories = [];
let allBrands = [];
let filteredProducts = [];
let visibleProducts = 6;
let activeCategory = 'all';
let brandSwiper, recentSwiper;

const elements = {
  categoryGrid: document.getElementById('categoriesGrid'),
  productGrid: document.getElementById('productGrid'),
  brandSwiperWrapper: document.getElementById('brandSwiperWrapper'),
  recentSwiperWrapper: document.getElementById('recentSwiperWrapper'),
  categoryDropdown: document.querySelector('.dropdown-options'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  cartCount: document.querySelector('.cart-count'),
  activeFilterBadge: document.getElementById('activeFilterBadge')
};

async function initApp() {
  elements.productGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  try {
    allCategories = await fetchData('/api/categories');
    allProducts = await fetchData('/api/products');
    allBrands = await fetchData('/api/brands');

    renderCategories();
    renderProducts();
    renderBrandFeature();
    renderRecentProducts();

    initEventListeners();
    initSwipers();
  } catch (error) {
    console.error('Error initializing app:', error);

  }
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
    currency: currency,
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
    currency: currency,
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
    currency: currency,
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

  // Filter products based on active category
  if (activeCategory === 'all') {
    filteredProducts = [...allProducts];
  } else {
    filteredProducts = allProducts.filter(product =>
      product.category?._id === activeCategory
    );
  }

  // Update active filter badge
  if (activeCategory !== 'all') {
    const activeCategoryObj = allCategories.find(cat => cat._id === activeCategory);
    elements.activeFilterBadge.textContent = activeCategoryObj?.name || '';
  } else {
    elements.activeFilterBadge.textContent = '';
  }

  // Check if no products in this category
  if (filteredProducts.length === 0) {
    elements.productGrid.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>No products found in this category</p>
                    </div>
                `;
    elements.loadMoreBtn.style.display = 'none';
    return;
  }

  // Add initial products
  const productsToShow = filteredProducts.slice(0, visibleProducts);

  productsToShow.forEach(product => {
    elements.productGrid.innerHTML += createProductCard(product);
  });

  // Update load more button
  if (filteredProducts.length > visibleProducts) {
    elements.loadMoreBtn.style.display = 'block';
  } else {
    elements.loadMoreBtn.style.display = 'none';
  }

  // Animate visible cards
  animateProductCards();
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

  // Reinitialize swiper
  if (brandSwiper) {
    brandSwiper.destroy(true, true);
  }
  initBrandSwiper();
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

  // Reinitialize swiper
  if (recentSwiper) {
    recentSwiper.destroy(true, true);
  }
  initRecentSwiper();
}

// Initialize swiper sliders
function initBrandSwiper() {
  brandSwiper = new Swiper(".mySwiper", {
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
}

function initRecentSwiper() {
  recentSwiper = new Swiper(".recent-swiper", {
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
    visibleProducts += 6;
    renderProducts();
  });

  // Category filtering
  document.querySelectorAll('.cat-box').forEach(box => {
    box.addEventListener('click', () => {
      activeCategory = box.dataset.filter;
      visibleProducts = 6; // Reset visible products

      // Update active class
      document.querySelectorAll('.cat-box').forEach(b => b.classList.remove('active'));
      box.classList.add('active');

      // Update dropdown
      document.querySelector('.dropdown-selected').textContent = box.textContent;

      // Filter products
      renderProducts();
    });
  });

  // Dropdown filtering
  document.querySelectorAll('.dropdown-options li').forEach(option => {
    option.addEventListener('click', () => {
      activeCategory = option.dataset.value;
      visibleProducts = 6; // Reset visible products

      // Update dropdown
      document.querySelector('.dropdown-selected').textContent = option.textContent;

      // Update active category box
      document.querySelectorAll('.cat-box').forEach(box => {
        box.classList.remove('active');
        if (box.dataset.filter === activeCategory) {
          box.classList.add('active');
        }
      });

      // Filter products
      renderProducts();
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

// Search products
function searchProducts() {
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();

  if (keyword === '') {
    // Reset to all products
    activeCategory = 'all';
    visibleProducts = 6;
    document.querySelectorAll('.cat-box').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.filter === 'all') b.classList.add('active');
    });
    document.querySelector('.dropdown-selected').textContent = 'All Categories';
    renderProducts();
    return;
  }

  // Filter products by keyword
  filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(keyword) ||
    (product.description && product.description.toLowerCase().includes(keyword))
  );

  // Update UI
  elements.activeFilterBadge.textContent = `Search: "${keyword}"`;
  visibleProducts = 6;
  renderProducts();
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
      image: product.images?.mainImage?.url,
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

// Animate product cards
function animateProductCards() {
  const productCards = document.querySelectorAll('.product-card.animate-fade');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  productCards.forEach(card => observer.observe(card));
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {

  updateHeaderView();
  // const { ipapi } = await useapi();
  // currency = ipapi.currency
  // Initialize app
  initApp();

  // Update cart count
  updateCartCount();

  // Existing functionality from your code
  initMenuToggle();
  initSmoothScroll();
  initDropdown();
  initScrollReveal();
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

// footer section
// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-fade').forEach(el => observer.observe(el));

// Scroll to Top Button
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.onscroll = function() {
  scrollTopBtn.style.display = (document.documentElement.scrollTop > 300) ? "block" : "none";
};

scrollTopBtn.onclick = function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
};



function updateYear() {
  document.getElementById("year").textContent = new Date().getFullYear();
}

