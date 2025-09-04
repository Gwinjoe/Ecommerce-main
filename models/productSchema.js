const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "A name for the product is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: mongoose.Types.Decimal128,
    required: [true, "A price is required for the product is required"],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand"
  },
  status: {
    type: String,
  },
  ratings: {
    type: mongoose.Types.Decimal128,
    default: 4.5,
  },
  stock: {
    type: Number,
    required: [true, "Stock Quantity is required"],
  },
  images: {
    mainImage: {
      url: {
        type: String,
        required: [true, "An Image is required for the product"],
      },
      publicId: {
        type: String,
        required: [true, "The product id is required"],
      }
    },
    thumbnails: [{
      url: {
        type: String,
        required: [true, "An Image is required for the product"],
      },
      publicId: {
        type: String,
        required: [true, "The product id is required"],
      }
    }],
  },
  keyFeatures: [{
    type: String,
  }],
  whatsInBox: [{
    type: String,
  }],
  productDetails: {
    type: String,
  },


}, {
  timestamps: true,
})

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });

module.exports = mongoose.model("Product", productSchema)
