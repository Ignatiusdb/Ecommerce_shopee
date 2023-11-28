const mongoose = require('mongoose');

const objectID = mongoose.Schema.Types.ObjectId;

const productSchema = new mongoose.Schema({
  owner: {
    type: objectID,
    required: true,

  },

  name: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true
  },

  image: {
    type: String,
    default: ''
  },

  images: [{
    type: String,
  }],

  brand: {
    type: String
  },

  countInStock: {
    type: Number,
    required: true,
    min: 0,
    max: 300
  },

  rating: {
    type: Number,
    default: 0,
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    default: 0,

  },
  discount: {
    type: Number,
    required: true,
    default: 0,

  },

  price: {
    type: Number,
    required: true,
    default: 0,

  }
}, {
  timestamps: true
})

const Product = mongoose.model('Product', productSchema);

module.exports = Product;