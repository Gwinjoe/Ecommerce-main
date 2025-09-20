import { gsap } from "gsap";
import { calculateShippingFee, distances } from "./feeCalculator.js";
import { updateHeaderView } from "./user-details.js";

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
  const stateSelect = document.querySelector("#state");
  const cartCount = document.querySelector('.cart-count');

  // Loader element
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

  // populate states safely
  if (stateSelect) {
    let fullhtml = '<option id="novalue" value="">Select State</option>';
    Object.keys(distances).forEach((s) => {
      fullhtml += `<option id="${s}" value="${s}">${s}</option>`;
    });
    stateSelect.innerHTML = fullhtml;
  }

  // Format currency
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) {
        currentUser = data.data;
        if (currentUser) {
          const setIf = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
          };
          setIf('full-name', currentUser.name);
          setIf('email', currentUser.email);
          setIf('address', currentUser.address?.address);
          setIf('city', currentUser.address?.city);
          setIf('phone', currentUser.phone);
          setIf('state', currentUser.address?.state);
          setIf('postal-code', currentUser.address?.postalCode || currentUser.location?.ipdetails?.ipdata?.postalCode);
        }
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const updateCartCount = () => {
    if (cartCount) cartCount.textContent = cart.length;
  };

  // calculateTotals uses your calculateShippingFee
  const calculateTotals = async () => {
    const subtotal = cart.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity || 1, 10);
      return sum + price * qty;
    }, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') discountAmount = subtotal * (discount / 100);
    if (discountType === 'fixed') discountAmount = parseFloat(discount || 0);

    const stateValue = stateSelect ? stateSelect.value : '';
    const { totalFee } = calculateShippingFee(subtotal, `${stateValue || ''}`, 20);
    shippingCost = parseFloat(totalFee) || 0;

    return {
      subtotal,
      discountAmount,
      shippingCost,
      total: subtotal - discountAmount + shippingCost
    };
  };

  const updateOrderSummary = async () => {
    try {
      const totals = await calculateTotals();
      if (subtotalElement) subtotalElement.textContent = formatCurrency(totals.subtotal);
      if (discountElement) discountElement.textContent = formatCurrency(totals.discountAmount);
      if (totalElement) totalElement.textContent = formatCurrency(totals.total);
      if (shippingElement) shippingElement.textContent = formatCurrency(totals.shippingCost);
    } catch (err) {
      console.error("Error updating summary:", err);
    }
  };

  const renderOrderItems = () => {
    if (!summaryItems) return;
    summaryItems.innerHTML = '';
    cart.forEach(item => {
      const price = parseFloat(item.price) || 0;
      const quantity = item.quantity || 1;
      const itemTotal = price * quantity;
      const summaryItem = document.createElement("div");
      summaryItem.className = "summary-item";
      summaryItem.innerHTML = `
        <img src="${item.image || 'assets/images/product-placeholder.jpg'}" alt="${escapeHtml(item.name)}" class="summary-item-img">
        <div class="summary-item-details">
          <h5>${escapeHtml(item.name)}</h5>
          <p>Qty: ${quantity}</p>
          <p>${formatCurrency(itemTotal)}</p>
        </div>
      `;
      summaryItems.appendChild(summaryItem);
    });
    updateOrderSummary();
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Validate required fields
  const validateRequiredFields = () => {
    if (!form) return true;
    const inputs = form.querySelectorAll("input[required], select[required], textarea[required]");
    let isValid = true;
    inputs.forEach(input => {
      if (!String(input.value || '').trim()) {
        isValid = false;
        gsap.to(input, { borderColor: "#e63946", duration: 0.3, yoyo: true, repeat: 1 });
      }
    });
    return isValid;
  };

  // Prepare order payload to send to verify_payment
  const buildOrderPayload = async () => {
    const totals = await calculateTotals();
    const customer = {
      userId: currentUser?._id || null,
      name: document.getElementById("full-name")?.value || "",
      email: document.getElementById("email")?.value || "",
      address: document.getElementById("address")?.value || "",
      city: document.getElementById("city")?.value || "",
      phone: document.getElementById("phone")?.value || "",
      state: document.getElementById("state")?.value || "",
      postalCode: document.getElementById("postal-code")?.value || ""
    };

    const items = cart.map(item => ({
      productId: item._id || item.id || null,
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      name: item.name || ''
    }));

    return {
      customer,
      items,
      coupon: couponInput?.value?.trim() || null,
      totals // { subtotal, discountAmount, shippingCost, total }
    };
  };

  // Post the verification + order creation to server
  // server endpoint: POST /api/verify_payment with body { transactionId, txRef, order }
  const postVerifyAndCreateOrder = async (transactionId, txRef, orderPayload) => {
    const res = await fetch('/api/verify_payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        transactionId,
        txRef,
        order: orderPayload
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`verify_payment failed: ${res.status} ${txt}`);
    }
    const payload = await res.json();
    return payload;
  };

  // Initiate Flutterwave checkout: txRef must match what will be sent to verify route
  const initiatePayment = async (txRef, flwpubkey, totals, customerName, customerEmail, customerPhone) => {
    return new Promise((resolve, reject) => {
      try {
        if (typeof FlutterwaveCheckout === 'undefined') {
          return reject(new Error('FlutterwaveCheckout is not loaded. Ensure https://checkout.flutterwave.com/v3.js is included.'));
        }

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
              // Defensive extraction of transaction id & tx_ref
              const transactionId = response?.transaction_id || response?.transaction?.id || response?.data?.id || response?.flw_ref || response?.id;
              const responseTxRef = response?.tx_ref || response?.data?.tx_ref || txRef;

              if (!transactionId && !responseTxRef) {
                return reject(new Error('Payment response missing transaction identifier.'));
              }

              // Build order (totals + items + customer)
              const orderPayload = await buildOrderPayload();

              // POST to our verify endpoint which will verify with Flutterwave and create the order
              const verifyResult = await postVerifyAndCreateOrder(transactionId, responseTxRef, orderPayload);

              if (verifyResult && verifyResult.success) {
                // success: server created the order and transaction
                resolve({ success: true, data: verifyResult });
              } else {
                // server returned failure (e.g., amount mismatch, not successful)
                reject(new Error(verifyResult?.message || 'Server verification failed'));
              }
            } catch (err) {
              reject(err);
            } finally {
              if (document.body.contains(loader)) document.body.removeChild(loader);
              placeOrderBtn.disabled = false;
            }
          },
          onclose: function(incomplete) {
            // Always cleanup UI
            try {
              if (incomplete === true) {
                console.info("Payment window closed before completion.");
                alert("Payment window closed. You can try again.");
              } else {
                console.info("Payment window closed.");
              }
            } finally {
              if (document.body.contains(loader)) document.body.removeChild(loader);
              placeOrderBtn.disabled = false;
            }
          }
        });
      } catch (err) {
        if (document.body.contains(loader)) document.body.removeChild(loader);
        placeOrderBtn.disabled = false;
        reject(err);
      }
    });
  };

  // Place order flow: generate tx_ref -> fetch flwpubkey -> open checkout -> post verify/create
  const placeOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateRequiredFields()) {
      return alert("Please fill in all required fields.");
    }
    if (!cart || cart.length === 0) {
      return alert("Your cart is empty.");
    }

    try {
      // show loader & prevent double clicks
      document.body.appendChild(loader);
      placeOrderBtn.disabled = true;

      // compute totals client-side (server will validate too)
      const totals = await calculateTotals();

      // fetch flutterwave public key from server config
      const cfgRes = await fetch('/api/config');
      if (!cfgRes.ok) {
        const txt = await cfgRes.text().catch(() => '');
        throw new Error(`Failed to fetch config: ${cfgRes.status} ${txt}`);
      }
      const cfg = await cfgRes.json();
      const flwpubkey = cfg?.flwpubkey;
      if (!flwpubkey) throw new Error('Flutterwave public key missing from /api/config');

      // generate tx_ref client-side (server will check on verification)
      const txRef = `ORD_SWISS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      // customer details for checkout UI
      const customerName = document.getElementById("full-name")?.value || (currentUser?.name || 'Customer');
      const customerEmail = document.getElementById("email")?.value || (currentUser?.email || '');
      const customerPhone = document.getElementById("phone")?.value || (currentUser?.phone || '');

      // open flutterwave checkout and wait for result
      const result = await initiatePayment(txRef, flwpubkey, totals, customerName, customerEmail, customerPhone);

      if (result && result.success) {
        // result.data contains server response with created order & transaction
        // clear cart & redirect
        cart = [];
        localStorage.removeItem('cart');
        updateCartCount();

        // If server returned created order, optionally you can inspect it:
        // const createdOrder = result.data.order;
        window.location.href = "/order-success";
      } else {
        throw new Error('Payment flow did not complete successfully.');
      }
    } catch (err) {
      console.error("Payment/verification error:", err);
      alert(err.message || "Error processing payment. Please try again.");
    } finally {
      if (document.body.contains(loader)) document.body.removeChild(loader);
      placeOrderBtn.disabled = false;
    }
  };

  // Hook up UI events
  const initCheckout = async () => {
    updateCartCount();
    await fetchCurrentUser();
    renderOrderItems();
    if (applyCouponBtn) applyCouponBtn.addEventListener("click", () => {
      const code = couponInput?.value?.trim();
      if (!code) return alert("Enter a coupon code");
      // Example local coupon logic (you probably want server validation)
      if (code === "SAVE10") {
        discount = 10;
        discountType = "percentage";
        updateOrderSummary();
        alert("Coupon applied: 10% off");
      } else {
        alert("Invalid coupon");
      }
    });
    if (placeOrderBtn) placeOrderBtn.addEventListener("click", placeOrder);
    if (stateSelect) stateSelect.addEventListener("change", updateOrderSummary);
  };

  initCheckout();
});

