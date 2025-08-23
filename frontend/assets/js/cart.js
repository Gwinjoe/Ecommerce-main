import { gsap } from "gsap";
import { updateHeaderView } from "./user-details.js"

document.addEventListener("DOMContentLoaded", () => {
  updateHeaderView();
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartItemsContainer = document.querySelector(".cart-items");
  const cartCountElement = document.querySelector(".cart-count");
  const cartSummary = document.querySelector(".cart-summary");
  const shippingCost = 1000.00;

  function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCountElement.textContent = totalItems;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  }

  function renderCartItems() {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your cart is empty</h3>
                    <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
                </div>
            `;
      cartSummary.style.display = 'none';
      return;
    }

    cartItemsContainer.innerHTML = '';
    cart.forEach(item => {
      const price = parseFloat(item.price);
      const subtotal = price * (item.quantity || 1);

      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.dataset.id = item.id;
      cartItem.innerHTML = `
                <img src="${item.image || 'assets/images/product-placeholder.jpg'}" 
                     alt="${item.name}" 
                     class="cart-item-img">
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <p class="cart-item-price">${formatCurrency(price)}</p>
                </div>
                <div class="cart-item-quantity">
                    <label for="quantity-${item.id}" class="visually-hidden">Quantity</label>
                    <input type="number" id="quantity-${item.id}" 
                           value="${item.quantity || 1}" min="1" 
                           class="quantity-input" data-id="${item.id}">
                </div>
                <p class="cart-item-subtotal">${formatCurrency(subtotal)}</p>
                <button class="btn btn-remove" data-id="${item.id}" type="button">
                    <i class="fas fa-trash"></i> Remove
                </button>
            `;
      cartItemsContainer.appendChild(cartItem);
    });

    gsap.from(".cart-item", {
      opacity: 0,
      y: 50,
      duration: 0.8,
      stagger: 0.2,
      scrollTrigger: {
        trigger: ".cart-items",
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
  }

  function updateCartSummary() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * (item.quantity || 1));
    }, 0);

    const total = subtotal + shippingCost;

    document.querySelector(".summary-details p:nth-child(1) span:last-child").textContent =
      formatCurrency(subtotal);
    document.querySelector(".summary-details p:nth-child(2) span:last-child").textContent =
      formatCurrency(shippingCost);
    document.querySelector(".summary-total").textContent =
      formatCurrency(total);
  }

  function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
      item.quantity = parseInt(newQuantity);
      localStorage.setItem('cart', JSON.stringify(cart));
      renderCartItems();
      updateCartSummary();
      updateCartCount();
    }
  }

  function removeItem(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex !== -1) {
      cart.splice(itemIndex, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      renderCartItems();
      updateCartSummary();
      updateCartCount();
    }
  }

  function initCart() {
    updateCartCount();
    renderCartItems();
    updateCartSummary();

    cartItemsContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const productId = e.target.dataset.id;
        const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
        updateQuantity(productId, newQuantity);

        gsap.to(e.target, {
          scale: 1.1,
          duration: 0.2,
          yoyo: true,
          repeat: 1
        });
      }
    });

    cartItemsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove') ||
        e.target.closest('.btn-remove')) {
        const button = e.target.classList.contains('btn-remove') ?
          e.target : e.target.closest('.btn-remove');
        const productId = button.dataset.id;
        const item = button.closest('.cart-item');

        gsap.to(item, {
          opacity: 0,
          height: 0,
          marginBottom: 0,
          padding: 0,
          duration: 0.5,
          onComplete: () => {
            removeItem(productId);
          }
        });
      }
    });

    gsap.from(".cart-summary", {
      opacity: 0,
      x: 50,
      duration: 1,
      scrollTrigger: {
        trigger: ".cart-summary",
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
  }

  initCart();
});
