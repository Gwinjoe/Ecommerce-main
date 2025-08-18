const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  status: {
    type: String,
    required: true,
    default: "Pending"
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    totalPrice: {
      type: mongoose.Types.Decimal128,
      default: function() {
        return this.product.price.$numberDecimal * this.quantity
      }
    }
  }],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shippingAddress: {
    type: String,
    default: function() {
      return this.customer.address
    }
  },
  coupon: {
    type: String,
  },
  totalPrice: {
    type: mongoose.Types.Decimal128,
  },
  payment: {
    reference: String,
    transactionId: String,
    method: String,
  },
  // const orderData = {
  //       customer: {
  //         userId: currentUser?._id || null,
  //         name: document.getElementById("full-name").value,
  //         email: document.getElementById("email").value,
  //         address: document.getElementById("address").value,
  //         city: document.getElementById("city").value,
  //         phone: document.getElementById("phone").value,
  //         postalCode: document.getElementById("postal-code").value
  //       },
  //       items: cart,
  //       coupon: couponInput.value.trim() || null,
  //       totals: calculateTotals(),
  //       payment: {
  //         reference: paymentReference,
  //         transactionId,
  //         method: "flutterwave"
  //       }
  //     };
  //
  //


}, {
  timestamps: true,
})

module.exports = mongoose.model("Order", orderSchema);
