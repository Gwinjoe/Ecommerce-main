import { gsap } from "gsap";
import { updateHeaderView } from "./user-details.js"

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  updateHeaderView()
  const spinner = document.getElementById('spinner');
  const productTitle = document.getElementById('productTitle');
  const productCategory = document.getElementById('productCategory');
  const productPrice = document.getElementById('productPrice');
  const productDescription = document.getElementById('productDescription');
  const mainImage = document.getElementById('mainImage');
  const thumbnailGallery = document.getElementById('thumbnailGallery');
  const productBadges = document.getElementById('productBadges');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const cartCount = document.querySelector('.cart-count');
  const stock = document.querySelector('#stock');
  const stockError = document.querySelector('#stockError');
  const stockContainer = document.querySelector('#stockContainer');
  const relatedProducts = document.getElementById('relatedProducts');

  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let currentProduct = null;

  const formatCurrency = (amount) => {
    const value = amount?.$numberDecimal ? parseFloat(amount.$numberDecimal) : parseFloat(amount);
    return `₦${value.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const showSpinner = () => {
    spinner.style.display = 'block';
  };

  const hideSpinner = () => {
    spinner.style.display = 'none';
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

  const updateCartCount = () => {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCount.textContent = totalItems;
  };

  const fetchProductData = async () => {
    if (!productId) {
      alert('Product ID not found in URL');
      return;
    }

    showSpinner();

    try {
      const response = await fetch(`/api/product/${productId}`);
      const data = await response.json();

      if (data.success) {
        currentProduct = data.result;
        populateProductData(currentProduct);
        fetchRelatedProducts(currentProduct.category._id);
      } else {
        alert('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Error loading product details');
    } finally {
      hideSpinner();
    }
  };

  const populateProductData = (product) => {
    productTitle.textContent = product.name;
    productCategory.textContent = `Category: ${product.category?.name || 'Uncategorized'}`;
    productPrice.textContent = formatCurrency(product.price);
    if (product.stock) {
      stock.value = product.stock;
    } else {
      stockContainer.style.display = "none";
      stockError.style.display = "block";
    }
    productDescription.textContent = product.description || 'No description available';
    let featuresHtml = "";
    product.keyFeatures.forEach(feature => {
      let html = `<li><i class="fas fa-check-circle"></i>
                  ${feature}</li>`
      featuresHtml += html;
    })
    document.querySelector(".keyfeatures").innerHTML = featuresHtml || "Features unavailable for this product"

    let boxHtml = "";
    product.whatsInBox.forEach(item => {
      let html = `<li>${item}</li>`
      boxHtml += html;
    })
    document.querySelector("#inTheBox").innerHTML = boxHtml || "No Item In Box"

    document.querySelector("#productDetails").textContent = product.productDetails || "No Detail available for this product."

    // Set main image
    if (product.images?.mainImage?.url) {
      mainImage.src = product.images.mainImage.url;
      mainImage.alt = product.name;
    }

    // Create thumbnails
    thumbnailGallery.innerHTML = '';

    // Add main image as first thumbnail
    if (product.images?.mainImage?.url) {
      const mainThumb = document.createElement('img');
      mainThumb.src = product.images.mainImage.url;
      mainThumb.alt = 'Main thumbnail';
      mainThumb.className = 'thumbnail';
      mainThumb.addEventListener('click', () => {
        switchImage(product.images.mainImage.url);
      });
      thumbnailGallery.appendChild(mainThumb);
    }

    // Add additional images as thumbnails
    if (product.images?.thumbnails) {
      product.images.thumbnails.forEach(img => {
        const thumb = document.createElement('img');
        thumb.src = img.url;
        thumb.alt = 'Product thumbnail';
        thumb.className = 'thumbnail';
        thumb.addEventListener('click', () => {
          switchImage(img.url);
        });
        thumbnailGallery.appendChild(thumb);
      });
    }

    // Add badges
    productBadges.innerHTML = '';
    if (product.isTrending) {
      const badge = document.createElement('span');
      badge.className = 'badge trending';
      badge.textContent = 'Trending';
      productBadges.appendChild(badge);
    }
    if (product.isNew) {
      const badge = document.createElement('span');
      badge.className = 'badge new';
      badge.textContent = 'New';
      productBadges.appendChild(badge);
    }
    if (product.isBestSeller) {
      const badge = document.createElement('span');
      badge.className = 'badge best';
      badge.textContent = 'Best Seller';
      productBadges.appendChild(badge);
    }

    // Set up add to cart button
    addToCartBtn.addEventListener('click', addToCart);
  };

  // Switch image
  const switchImage = (newSrc) => {
    gsap.to(mainImage, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        mainImage.src = newSrc;
        gsap.to(mainImage, { opacity: 1, duration: 0.3 });
      }
    });
  };

  // Add to cart
  const addToCart = () => {
    if (!currentProduct) return;

    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const existingItem = cart.find(item => item.id === currentProduct._id);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      cart.push({
        id: currentProduct._id,
        name: currentProduct.name,
        price: currentProduct.price?.$numberDecimal ? parseFloat(currentProduct.price.$numberDecimal) : parseFloat(currentProduct.price),
        image: currentProduct.images?.mainImage?.url || 'assets/images/default-product.png',
        quantity: quantity
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showCartFeedback('Added to cart!');

    // Animate button
    gsap.to(addToCartBtn, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
  };

  // Fetch related products
  const fetchRelatedProducts = async (categoryId) => {
    if (!categoryId) return;

    try {
      const response = await fetch(`/api/products?category=${categoryId}&limit=4`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        populateRelatedProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  };

  // Populate related products
  const populateRelatedProducts = (products) => {
    relatedProducts.innerHTML = '';

    // Filter out current product
    const filteredProducts = products.filter(p => p._id !== productId);

    if (filteredProducts.length === 0) {
      relatedProducts.innerHTML = '<p>No related products found.</p>';
      return;
    }

    filteredProducts.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      const price = product.price?.$numberDecimal ? parseFloat(product.price.$numberDecimal) : parseFloat(product.price);

      productCard.innerHTML = `
                        <img src="${product.images?.mainImage?.url || 'assets/images/product-placeholder.jpg'}" 
                             alt="${product.name}" class="product-card-img">
                        <h4>${product.name}</h4>
                        <p>${formatCurrency(price)}</p>
                        <a href="/product?id=${product._id}" class="btn btn-primary"><i class="fas fa-eye"></i> View</a>
                    `;

      relatedProducts.appendChild(productCard);
    });

    // Animate related products
    gsap.from(".product-card", {
      opacity: 0,
      y: 50,
      duration: 0.8,
      stagger: 0.2,
      scrollTrigger: {
        trigger: ".related-products",
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
  };

  // Tab switching
  const tabItems = document.querySelectorAll(".tab-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabItems.forEach(item => {
    item.addEventListener("click", () => {
      // Remove active class from all tabs and panes
      tabItems.forEach(tab => tab.classList.remove("active"));
      tabPanes.forEach(pane => pane.classList.remove("active"));

      // Add active class to clicked tab and corresponding pane
      item.classList.add("active");
      const tabId = item.getAttribute("data-tab");
      const activePane = document.getElementById(tabId);
      activePane.classList.add("active");

      // Animate tab content
      gsap.from(activePane, {
        opacity: 0,
        y: 20,
        duration: 0.5
      });
    });
  });

  // Initialize
  updateCartCount();
  fetchProductData();

  // Animate product details on scroll
  gsap.from(".product-details", {
    opacity: 0,
    y: 50,
    duration: 1,
    scrollTrigger: {
      trigger: ".product-details",
      start: "top 80%",
      toggleActions: "play none none none"
    }
  });
});

