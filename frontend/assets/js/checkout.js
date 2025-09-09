import { gsap } from "gsap";
import { calculateShippingFee, distances } from "./feeCalculator.js"
import { updateHeaderView } from "./user-details.js"

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
  let currentUser = null;

  // populate states
  let fullhtml = '<option id="novalue" value="">Select State</option> ';
  Object.keys(distances).forEach((state) => {
    fullhtml += `<option id="${state}" value="${state}">${state}</option>`;
  });
  state.innerHTML = fullhtml;

  // Format currency
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  // Fetch user info
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (data.success) {
        currentUser = data.data;
        if (currentUser) {
          document.getElementById('full-name').value = currentUser.name || '';
          document.getElementById('email').value = currentUser.email || '';
          document.getElementById('address').value = currentUser.address.address || '';
          document.getElementById('city').value = currentUser.address.city || '';
          document.getElementById('phone').value = currentUser.phone || '';
          document.getElementById('state').value = currentUser.address.state || '';
          document.getElementById('postal-code').value =
            currentUser.address.postalCode ||
            currentUser.location?.ipdetails?.ipdata?.postalCode ||
            '';
        }
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const updateCartCount = () => {
    cartCount.textContent = cart.length;
  };

  const calculateTotals = async () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + parseFloat(item.price) * (item.quantity || 1);
    }, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') discountAmount = subtotal * (discount / 100);
    if (discountType === 'fixed') discountAmount = discount;

    const stateValue = state.value;
    console.log(stateValue)
    const { totalFee } = calculateShippingFee(subtotal, `${stateValue}`, 20);
    shippingCost = parseFloat(totalFee);
    console.log(`from checkout shipping fee- ${shippingCost}`)

    return {
      subtotal,
      discountAmount,
      shippingCost,
      total: subtotal - discountAmount + shippingCost
    };
  };

  const updateOrderSummary = async () => {
    const totals = await calculateTotals();
    subtotalElement.textContent = formatCurrency(totals.subtotal);
    discountElement.textContent = formatCurrency(totals.discountAmount);
    totalElement.textContent = formatCurrency(totals.total);
    shippingElement.textContent = formatCurrency(totals.shippingCost);
    console.log(totals)
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
        <img src="${item.image || 'assets/images/product-placeholder.jpg'}" alt="${item.name}" class="summary-item-img">
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

  const completeOrder = async (paymentReference, transactionId) => {
    try {
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

      const response = await fetch("/api/add_order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (data.success) {
        cart = [];
        localStorage.removeItem("cart");
        updateCartCount();
        window.location.href = "/order-success";
      } else {
        throw new Error(data.message || "Failed to create order");
      }
    } catch (err) {
      console.error("Order completion error:", err);
      alert(`Error completing order: ${err.message}`);
    } finally {
      if (document.body.contains(loader)) document.body.removeChild(loader);
      placeOrderBtn.disabled = false;
    }
  };

  const initiatePayment = async () => {
    const config = await fetch("/api/config");
    const { flwpubkey } = await config.json();
    const totals = await calculateTotals();
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
      callback: async function(response) {
        try {
          if (response.transaction_id) {
            // verify on backend
            const verifyRes = await fetch("/api/verify_payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: response.transaction_id,
                txRef: response.tx_ref
              })
            });
            const result = await verifyRes.json();
            if (result.success) {
              await completeOrder(response.tx_ref, response.transaction_id);
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } else {
            alert("Payment failed. No transaction ID returned.");
          }
        } catch (err) {
          console.error("Verification error:", err);
          alert("Error verifying payment. Please try again.");
        } finally {
          if (document.body.contains(loader)) document.body.removeChild(loader);
          placeOrderBtn.disabled = false;
        }
      },
      onclose: function() {
        if (document.body.contains(loader)) document.body.removeChild(loader);
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
        gsap.to(input, { borderColor: "#e63946", duration: 0.3, yoyo: true, repeat: 1 });
      }
    });

    if (!isValid) return alert("Please fill in all required fields.");
    if (cart.length === 0) return alert("Your cart is empty.");

    try {
      document.body.appendChild(loader);
      placeOrderBtn.disabled = true;
      initiatePayment();
    } catch (err) {
      console.error("Payment initiation error:", err);
      alert(`Error initiating payment: ${err.message}`);
      if (document.body.contains(loader)) document.body.removeChild(loader);
      placeOrderBtn.disabled = false;
    }
  };

  const initCheckout = async () => {
    updateCartCount();
    await fetchCurrentUser();
    renderOrderItems();
    applyCouponBtn.addEventListener("click", () => {/* coupon handling stays same */ });
    placeOrderBtn.addEventListener("click", placeOrder);
    state.addEventListener("change", () => {
      updateOrderSummary()
    })

  };

  initCheckout();
});
