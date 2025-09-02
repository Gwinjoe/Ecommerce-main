const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
    lowercase: true,
  },
  email: {
    required: [true, "email is required"],
    type: String,
    trim: true,
    unique: [true, "email must be unique"],
    minLength: [5, "email must be more than 5 characters"],
    lowercase: true,
  },
  password: {
    required: [true, "Password is required"],
    select: false,
    trim: true,
    type: String,
  },
  admin: {
    type: Boolean,
    default: false,
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  }],
  cart: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    quantity: Number,
  }],
  phone: {
    trim: true,
    type: String,
  },
  address: {
    address: {
      type: String
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    country: {
      type: String,
      default: "Nigeria",
    },
    postalCode: {
      type: String
    },
  },
  location: {
    geolocation: {
      type: Map,
    },
    ipdetails: {
      type: Map,
    }
  },
  active: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    default: function() {
      return this.active ? "Active" : "Inactive";
    }
  },
  avatar: {
    type: String,
    default: "assets/images/avatar.jpg"
  },
  publicId: {
    type: String,
  },
  notifications: [{
    type: String,
  }],
  recentActivities: [{
    activity: {
      type: String,
    },
    time: {
      type: String,
      default: new Intl.DateTimeFormat('default', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      }).format(new Date()),

    }
  }],
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
    select: false,
  },
  verificationCodeValidation: {
    type: Number,
    select: false,
  },
  forgotPasswordCode: {
    type: String,
    select: false,
  },
  forgotPasswordCodeValidation: {
    type: Number,
    select: false,
  }
}, {
  timestamps: true,
})

module.exports = mongoose.model("User", userSchema);
