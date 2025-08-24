import { gsap } from "gsap";
import { calculateShippingFee, distances } from "./feeCalculator.js"
import { updateHeaderView, getUserLocation } from "./user-details.js"

document.addEventListener("DOMContentLoaded", async () => {
  updateHeaderView();
  // Elements
  const form = document.querySelector(".checkout-form");
  const placeOrderBtn = document.querySelector(".btn-place-order");
  const couponInput = document.querySelector("#coupon-code");
  const applyCouponBtn = document.querySelector(".btn-apply-coupon");
  const subtotalElement = document.querySelector(".summary-subtotal");
  const discountElement = document.querySelector(".summary-discount");
  const totalElement = document.querySelector(".summary-total");
  const summaryItems = document.querySelector(".summary-items");
  const shippingElement = document.querySelector(".shipping-fee");
  const state = document.querySelector("#state");
  const cartCount = document.querySelector('.cart-count');
  const loader = document.createElement("div");
  loader.className = "checkout-loader";
  loader.innerHTML = `
        <div class="spinner"></div>
        <p>Processing your order...</p>
    `;

  // State
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let discount = 0;
  let discountType = null;
  let shippingCost = 0;
  let currentUser = null; // Store user data
  console.log(cart)
  let fullhtml = '<option id="novalue" value="">Select State</option> ';
  Object.keys(distances).forEach((state) => {
    const html = `
        <option id="${state}" value="${state}">${state}</option>
`;
    fullhtml += html;
  })
  state.innerHTML = fullhtml;
  // Nigerian currency formatter
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();

      if (data.success) {
        currentUser = data.data;
        // Pre-fill form with user data if available
        if (currentUser) {
          document.getElementById('full-name').value = currentUser.name || '';
          document.getElementById('email').value = currentUser.email || '';
          document.getElementById('address').value = currentUser.address.address ? currentUser.address.address : '';
          document.getElementById('city').value = currentUser.address.city ? currentUser.address.city : '';
          document.getElementById('phone').value = currentUser.phone || '';
          document.getElementById('state').value = currentUser.address.state ? currentUser.address.state : '';
          document.getElementById('postal-code').value = (currentUser.address.postalCode || currentUser.location.ipdetails.ipdata.postalCode) ? currentUser.address.postalCode || currentUser.location.ipdetails.ipdata.postalCode : '';
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const updateCartCount = () => {
    const totalItems = cart.length;
    cartCount.textContent = totalItems;
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * (item.quantity || 1));
    }, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discount / 100);
    } else if (discountType === 'fixed') {
      discountAmount = discount;
    }

    const stateValue = state.value;
    const { totalFee } = calculateShippingFee(subtotal, stateValue, 20)
    shippingCost = parseFloat(totalFee);
    const total = subtotal - discountAmount + shippingCost;

    return {
      subtotal,
      discountAmount,
      shippingCost,
      total
    };
  };

  state.addEventListener("change", () => {
    updateOrderSummary();
  })

  const updateOrderSummary = () => {
    const totals = calculateTotals();

    subtotalElement.textContent = formatCurrency(totals.subtotal);
    discountElement.textContent = formatCurrency(totals.discountAmount);
    totalElement.textContent = formatCurrency(totals.total);
    shippingElement.textContent = formatCurrency(totals.shippingCost);
  };

  const renderOrderItems = () => {
    summaryItems.innerHTML = '';

    cart.forEach(item => {
      const price = parseFloat(item.price);
      const quantity = item.quantity || 1;
      const itemTotal = price * quantity;

      const summaryItem = document.createElement("div");
      summaryItem.className = "summary-item";
      summaryItem.innerHTML = `
                <img src="${item.image || 'assets/images/product-placeholder.jpg'}" 
                     alt="${item.name}" class="summary-item-img">
                <div class="summary-item-details">
                    <h5>${item.name}</h5>
                    <p>Qty: ${quantity}</p>
                    <p>${formatCurrency(itemTotal)}</p>
                </div>
            `;
      summaryItems.appendChild(summaryItem);
    });

    updateOrderSummary();
  };

  const applyCoupon = async () => {
    const couponCode = couponInput.value.trim();
    if (!couponCode) {
      gsap.to(couponInput, {
        borderColor: "#e63946",
        duration: 0.3,
        yoyo: true,
        repeat: 1
      });
      alert("Please enter a coupon code");
      return;
    }

    try {
      applyCouponBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
      applyCouponBtn.disabled = true;

      const response = await fetch("/api/coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ couponCode })
      });

      const data = await response.json();

      if (data.success) {
        discount = data.discount;
        discountType = data.type;

        updateOrderSummary();
        gsap.to(".summary-details", {
          scale: 1.05,
          duration: 0.2,
          yoyo: true,
          repeat: 1
        });

        alert(`Coupon applied successfully! Discount: ${discountType === 'percentage' ? discount + '%' : formatCurrency(discount)}`);
      } else {
        alert(data.message || "Invalid coupon code");
      }
    } catch (error) {
      console.error("Coupon error:", error);
      alert("Failed to apply coupon. Please try again.");
    } finally {
      applyCouponBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Apply';
      applyCouponBtn.disabled = false;
    }
  };

  // Complete order after successful payment
  const completeOrder = async (paymentReference, transactionId) => {
    try {
      // Prepare order data

      const orderData = {
        customer: {
          userId: currentUser?._id || null,
          name: document.getElementById("full-name").value,
          email: document.getElementById("email").value,
          address: document.getElementById("address").value,
          city: document.getElementById("city").value,
          phone: document.getElementById("phone").value,
          state: document.getElementById("state").value,
          country: document.getElementById("country").value,
          postalCode: document.getElementById("postal-code").value || "",
        },
        items: cart,
        coupon: couponInput.value.trim() || null,
        totalPrice: calculateTotals(),
        payment: {
          reference: paymentReference,
          transactionId,
          method: "flutterwave"
        }
      };

      // Send order to backend
      const response = await fetch("/api/add_order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.success) {
        // Clear cart and localStorage
        cart = [];
        localStorage.removeItem("cart");
        updateCartCount();

        // Redirect to success page
        window.location.href = "/order-success";
      } else {
        throw new Error(data.message || "Failed to create order");
      }
    } catch (error) {
      console.error("Order completion error:", error);
      alert(`Error completing order: ${error.message}`);
    } finally {
      if (document.body.contains(loader)) {
        document.body.removeChild(loader);
      }
      placeOrderBtn.disabled = false;
    }
  };

  // Initialize Flutterwave payment
  const initiatePayment = async () => {
    const config = await fetch("/api/config");
    const { flwpubkey } = await config.json();
    const totals = calculateTotals();
    const customerName = document.getElementById("full-name").value;
    const customerEmail = document.getElementById("email").value;
    const customerPhone = document.getElementById("phone").value;

    const txRef = `ORD_SWISS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    FlutterwaveCheckout({
      public_key: flwpubkey,
      tx_ref: txRef,
      amount: totals.total,
      currency: "NGN",
      payment_options: "card, banktransfer, ussd",
      redirect_url: "",
      customer: {
        email: customerEmail,
        name: customerName,
        phone_number: customerPhone,
      },
      customizations: {
        title: "SWISSTools",
        description: `Payment for ${cart.length} items`,
        logo: "assets/images/swisstools_logo.png",
      },
      callback: function(response) {
        if (response.status === "successful") {
          completeOrder(txRef, response.transaction_id);
        } else {
          alert("Payment failed. Please try again.");
          document.body.removeChild(loader);
          placeOrderBtn.disabled = false;
        }
      },
      onclose: function() {
        document.body.removeChild(loader);
        placeOrderBtn.disabled = false;
      }
    });
  };

  const placeOrder = () => {
    const inputs = form.querySelectorAll("input[required]");
    let isValid = true;

    inputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        gsap.to(input, {
          borderColor: "#e63946",
          duration: 0.3,
          yoyo: true,
          repeat: 1
        });
      }
    });

    if (!isValid) {
      alert("Please fill in all required fields.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty. Please add items before placing an order.");
      return;
    }

    try {
      // Show loader
      document.body.appendChild(loader);
      placeOrderBtn.disabled = true;

      // Initiate payment
      initiatePayment();
    } catch (error) {
      console.error("Payment initiation error:", error);
      alert(`Error initiating payment: ${error.message}`);

      if (document.body.contains(loader)) {
        document.body.removeChild(loader);
      }
      placeOrderBtn.disabled = false;
    }
  };

  const initCheckout = async () => {
    updateCartCount();
    // Fetch user data first
    await fetchCurrentUser();

    // Then render the rest
    renderOrderItems();
    applyCouponBtn.addEventListener("click", applyCoupon);
    placeOrderBtn.addEventListener("click", placeOrder);

    gsap.from(".checkout-form", {
      opacity: 0,
      y: 50,
      duration: 1,
      scrollTrigger: {
        trigger: ".checkout-form",
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });

    gsap.from(".order-summary", {
      opacity: 0,
      x: 50,
      duration: 1,
      scrollTrigger: {
        trigger: ".order-summary",
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
  };

  initCheckout();
});
