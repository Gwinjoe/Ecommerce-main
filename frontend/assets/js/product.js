import { gsap } from "gsap";
import { updateHeaderView } from "./user-details.js";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  updateHeaderView();

  // DOM References
  const spinner = document.getElementById("spinner");
  const productTitle = document.getElementById("productTitle");
  const productCategory = document.getElementById("productCategory");
  const productPrice = document.getElementById("productPrice");
  const productDescription = document.getElementById("productDescription");
  const mainImage = document.getElementById("mainImage");
  const thumbnailGallery = document.getElementById("thumbnailGallery");
  const productBadges = document.getElementById("productBadges");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const cartCount = document.querySelector(".cart-count");
  const stock = document.querySelector("#stock");
  const stockError = document.querySelector("#stockError");
  const stockContainer = document.querySelector("#stockContainer");
  const relatedProducts = document.getElementById("relatedProducts");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let currentProduct = null;

  // 🆕 Clear Dummy Data on Initial Load
  productTitle.textContent = "";
  productCategory.textContent = "";
  productPrice.textContent = "";
  productDescription.textContent = "";
  mainImage.src = "";
  thumbnailGallery.innerHTML = "";
  productBadges.innerHTML = "";
  document.querySelector(".keyfeatures").innerHTML = "";
  document.querySelector("#inTheBox").innerHTML = "";
  document.querySelector("#productDetails").textContent = "";
  relatedProducts.innerHTML = "";

  // Utility: Format currency
  const formatCurrency = (amount) => {
    const value =
      amount?.$numberDecimal ? parseFloat(amount.$numberDecimal) : parseFloat(amount);
    return isNaN(value)
      ? "₦0.00"
      : `₦${value.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
  };

  // Spinner toggle
  const toggleSpinner = (show) => {
    spinner.style.display = show ? "block" : "none";
  };

  // Cart Feedback
  const showCartFeedback = (message) => {
    const feedback = document.createElement("div");
    feedback.className = "cart-feedback";
    feedback.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(feedback);

    requestAnimationFrame(() => feedback.classList.add("show"));
    setTimeout(() => {
      feedback.classList.remove("show");
      setTimeout(() => feedback.remove(), 300);
    }, 2000);
  };

  const updateCartCount = () => {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCount.textContent = totalItems;
  };

  // Fetch Product
  const fetchProductData = async () => {
    if (!productId) return console.error("❌ Product ID missing in URL");

    toggleSpinner(true);
    try {
      const response = await fetch(`/api/product/${productId}`);
      const data = await response.json();

      if (data.success) {
        currentProduct = data.result;
        populateProductData(currentProduct);
        fetchRelatedProducts(currentProduct.category?._id);
      } else {
        productTitle.textContent = "⚠️ Product not found";
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      productTitle.textContent = "⚠️ Error loading product";
    } finally {
      toggleSpinner(false);
    }
  };

  // Populate Product Details
  const populateProductData = (product) => {
    productTitle.textContent = product.name;
    productCategory.textContent = `Category: ${product.category?.name || "Uncategorized"}`;
    productPrice.textContent = formatCurrency(product.price);
    productDescription.textContent = product.description || "No description available";

    if (product.stock) {
      stock.value = product.stock;
      stockContainer.style.display = "block";
      stockError.style.display = "none";
    } else {
      stockContainer.style.display = "none";
      stockError.style.display = "block";
    }

    document.querySelector(".keyfeatures").innerHTML =
      product.keyFeatures?.length
        ? product.keyFeatures.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join("")
        : "Features unavailable for this product";

    document.querySelector("#inTheBox").innerHTML =
      product.whatsInBox?.length
        ? product.whatsInBox.map(i => `<li>${i}</li>`).join("")
        : "No Item In Box";

    document.querySelector("#productDetails").textContent =
      product.productDetails || "No Detail available for this product.";

    setupImages(product.images);
    setupBadges(product);
    setupAddToCart();
  };

  // Setup Images
  const setupImages = (images) => {
    thumbnailGallery.innerHTML = "";

    const createThumb = (src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Product thumbnail";
      img.className = "thumbnail";
      img.addEventListener("click", () => switchImage(src));
      thumbnailGallery.appendChild(img);
    };

    if (images?.mainImage?.url) {
      mainImage.src = images.mainImage.url;
      createThumb(images.mainImage.url);
    }

    images?.thumbnails?.forEach(img => createThumb(img.url));
  };

  const setupBadges = (product) => {
    productBadges.innerHTML = "";
    const badgeMap = {
      isTrending: { text: "Trending", class: "trending" },
      isNew: { text: "New", class: "new" },
      isBestSeller: { text: "Best Seller", class: "best" },
    };

    Object.entries(badgeMap).forEach(([key, val]) => {
      if (product[key]) {
        const badge = document.createElement("span");
        badge.className = `badge ${val.class}`;
        badge.textContent = val.text;
        productBadges.appendChild(badge);
      }
    });
  };

  const setupAddToCart = () => {
    addToCartBtn.replaceWith(addToCartBtn.cloneNode(true)); // removes old listeners
    const newBtn = document.getElementById("addToCartBtn");
    newBtn.addEventListener("click", addToCart);
  };

  const switchImage = (newSrc) => {
    gsap.to(mainImage, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        mainImage.src = newSrc;
        gsap.to(mainImage, { opacity: 1, duration: 0.3 });
      },
    });
  };

  const addToCart = () => {
    if (!currentProduct) return;

    const quantity = parseInt(document.getElementById("quantity").value) || 1;
    const existingItem = cart.find(item => item.id === currentProduct._id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: currentProduct._id,
        name: currentProduct.name,
        price: parseFloat(currentProduct.price?.$numberDecimal || currentProduct.price),
        image: currentProduct.images?.mainImage?.url || "assets/images/default-product.png",
        quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    showCartFeedback("Added to cart!");
    gsap.to(addToCartBtn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });
  };

  // Fetch Related Products
  const fetchRelatedProducts = async (categoryId) => {
    if (!categoryId) return;
    try {
      const response = await fetch(`/api/products?category=${categoryId}&limit=4`);
      const data = await response.json();
      if (data.success && data.data.length > 0) populateRelatedProducts(data.data);
    } catch (error) {
      console.error("Error fetching related products:", error);
    }
  };

  const populateRelatedProducts = (products) => {
    relatedProducts.innerHTML = "";

    const filtered = products.filter(p => p._id !== productId);
    if (filtered.length === 0) return (relatedProducts.innerHTML = "<p>No related products found.</p>");

    relatedProducts.innerHTML = filtered
      .map(
        p => `
      <div class="product-card">
        <img src="${p.images?.mainImage?.url}" alt="${p.name}" class="product-card-img">
        <h4>${p.name}</h4>
        <p>${formatCurrency(p.price)}</p>
        <a href="/product?id=${p._id}" class="btn btn-primary">
          <i class="fas fa-eye"></i> View
        </a>
      </div>`
      )
      .join("");

    gsap.from(".product-card", { opacity: 0, y: 50, duration: 0.8, stagger: 0.2 });
  };

  // Tabs
  document.querySelectorAll(".tab-item").forEach(item => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".tab-item, .tab-pane").forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      const pane = document.getElementById(item.getAttribute("data-tab"));
      pane.classList.add("active");
      gsap.from(pane, { opacity: 0, y: 20, duration: 0.5 });
    });
  });

  // Init
  updateCartCount();
  fetchProductData();
});
