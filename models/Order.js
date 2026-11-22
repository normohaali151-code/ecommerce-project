const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  fullName: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    required: true,
  },

  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      price: {
        type: Number,
        required: true,
      },
    },
  ],

  totalPrice: {
    type: Number,
    required: true,
  },

  // Payment Information
  paymentMethod: {
    type: String,
    enum: ["EVC Plus", "Cash on Delivery"],
    default: "Cash on Delivery",
  },

  paymentPhone: {
    type: String,
    default: "",
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },

  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    ],
    default: "pending",
  },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);