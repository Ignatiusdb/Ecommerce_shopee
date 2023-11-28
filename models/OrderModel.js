const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectID = mongoose.Schema.Types.ObjectId;

const orderSchema = new Schema({
  user: {
    type: ObjectID,
    ref: 'users',
    required: true,
  },
  cart: {
    type: ObjectID,
    ref: 'Cart',
  },
  
  items: [
    {
      productId: {
        type: ObjectID,
        ref: 'Product',
        required: true,
      },
      image: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      productPrice: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity can not be less than 1.'],
        default: 1,
      },
      price: {
        type: Number,
        required: true,
      }
    },
  ],
  orderId:{
    type:String,
    required:true
  },
  paymentId:{
    type:String,
  },
  signature:{
    type:String
  },
  billTotal: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Success', 'Failed'],
    default: 'Pending',
  },
  deliveryAddress: {
    type: {
      addressType: String,
      HouseNo: String,
      Street: String,
      Landmark: String,
      pincode: Number,
      city: String,
      district: String,
      State: String,
      Country: String,
    },
    required: true,
  },
  orderDate: {
    type: String,
    default: getDate(0,false),
  },
  status: {
    type: String,
    enum:['Pending','Processing', 'Shipped', 'Delivered','Canceled','Failed','Returned'],
    default: 'Pending'
},
reason:{
  type:String
},
requests: [
  {
    type: {
      type: String,
      enum: ['Cancel', 'Return'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
    reason: String,
    // Add other fields as needed for your specific use case
  },
],

},
{
    timestamps:true
});

function getDate(date, fullDay) {
  let currentDate = (!fullDay) ? new Date() : new Date(fullDay);
  currentDate.setDate(currentDate.getDate() + date);
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2,'0') // Months are zero-based
  const day = String(currentDate.getDate()).padStart(2,'0')
  return day + '-' + month + '-' + year
}

const Order = mongoose.model('Order', orderSchema);

module.exports=Order;
