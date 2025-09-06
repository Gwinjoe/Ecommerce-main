//localhost:3500/order-success?status=successful&tx_ref=ORD_SWISS-1757168519821-15419&transaction_id=9620655
const urlParams = new URLSearchParams(window.location.search);
const status = urlParams.get('status');

let order;
const encodedData = urlParams.get('data');
if (encodedData) {
  const decodedString = decodeURIComponent(encodedData);
  const receivedObject = JSON.parse(decodedString);
  order = receivedObject
}

let currentUser;
// Fetch current user
const fetchCurrentUser = async () => {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();

    if (data.success) {
      currentUser = data.data;
      // Pre-fill form with user data if available
    }
  } catch (error) {
    console.error('Error fetching user:', error);
  }
};


const completeOrder = async (paymentReference, transactionId) => {
  try {
    // Prepare order data

    const transactionId = urlParams.get('transaction_id');

    const paymentReference = urlParams.get('tx_ref');
    const orderData = { ...order, payment: { ...order.payment, transactionId, paymentReference } }
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
      // window.location.href = "/order-success";
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

window.addEventListener("DOMContentLoaded", async () => {
  if (status == "successful") {
    await fetchCurrentUser()
    await completeOrder()
  }
})
