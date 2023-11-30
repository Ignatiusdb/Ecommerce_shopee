const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Banner = require('../models/BannerModel')

const mongoose = require('mongoose')
const bcrypt = require('bcrypt');
const AddressModel = require('../models/addressModel');
const OrderModel = require('../models/OrderModel');
const WalletModel = require('../models/WalletModel');


exports.OrderManagementPageGet = async (req, res,next) => {
    try {
     if(req.query.page){
            page=parseInt(req.query.page);
          }else{
            page= 1 ;
          }
          const limit = 8;
          const skip = (page-1)*limit

        const total = await OrderModel.countDocuments();
        const orders = await OrderModel.find().sort({ createdAt: -1 }).populate('user', 'name').skip(skip).limit(limit)
    .exec();
    const totalPages = Math.ceil(total/limit);
        console.log(orders);
        res.render('AdminOrderManagement', {
            pagetitle: 'Order Management',
            orders,
            currentPage:page,
            totalPages
        });
    } catch (error) {
      // Pass the error to the error handling middleware
      error.adminError = true;
      next(error);
    }
}

exports.OrderDelete = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(404).json({ success: false, message: 'It is not an Valid Id' });
        }
        // Implement logic to delete the order by its ID from the database
        // You should also add error handling as needed
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: true, message: 'Order Not found in Database' })
        }
        await OrderModel.findByIdAndDelete(orderId);

        res.sendStatus(200); // Send a success re
    } catch (err) {
        console.log(err);
        res.status(500).send('Error deleting the order');
    }
}

exports.orderDetailedView = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log(orderId)
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(404).json({ success: false, message: 'It is not an Valid Id' });
        }
        // Implement logic to delete the order by its ID from the database
        // You should also add error handling as needed
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order Not found in Database' })
        }

        const orders = await OrderModel.findOne({ _id: orderId }).sort({ createdAt: -1 }).populate('user', 'name').exec();
        const userId = orders.user;
        const userDetail = await User.findOne({ _id: userId })
        console.log(userDetail)
        res.render('adminOrderDetailedView', {
            pagetitle: '',
            orders,
            userDetail
        });

    } catch (err) {
        console.log(err);
        res.status(500).send('Error deleting the order');
    }

}

exports.orderDetailedView = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(404).json({ success: false, message: 'It is not an Valid Id' });
        }
        // Implement logic to delete the order by its ID from the database
        // You should also add error handling as needed
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order Not found in Database' })
        }

        const orders = await OrderModel.findOne({ _id: orderId }).sort({ createdAt: -1 }).populate('user', 'firstName').exec();
        const userId = orders.user;
        const userDetail = await User.findOne({ _id: userId })
        console.log(userDetail)
        res.render('adminOrderDetailedView', {
            pagetitle: '',
            orders,
            userDetail
        });

    } catch (err) {
        console.log(err);
        res.status(500).send('Error deleting the order');
    }

}


exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const newStatus = req.body.orderStatus;

        if (newStatus === 'Canceled') {
            // If the new order status is 'Canceled,' you should retrieve the order details.
            const canceledOrder = await OrderModel.findById(orderId);

            if (!canceledOrder) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Now, you can loop through the order items and increment the product quantities.
            for (const orderItem of canceledOrder.items) {
                const product = await Product.findById(orderItem.productId);

                if (product) {
                    // Increment the product countInStock based on the quantity in the canceled order.
                    product.countInStock += orderItem.quantity;
                    await product.save();
                }
            }
        }

        // Update the order status.
        const updatedOrder = await OrderModel.findOneAndUpdate(
            { _id: orderId },
            { status: newStatus },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        return res.status(200).json({ success: true, message: 'Order status updated successfully', updatedOrder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.refundAmount = async (req, res) => {
    try {
        const { orderId, userId } = req.body;
     
        console.log(orderId, userId);

        // Find the order
        const order = await OrderModel.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
      
        
        // Check if there is a 'Pending' refund request
        const refundRequest = order.requests.find(request => request.type === 'Cancel' && request.status === 'Pending');
    
        // Check if there is a 'Pending' return request
        const returnRequest = order.requests.find(request => request.type === 'Return' && request.status === 'Pending');

        if (!refundRequest && !returnRequest) {
            return res.status(400).json({ success: false, message: 'No pending refund or return request found for this order' });
        }
      
        // Update the request status to 'Accepted'
        if (refundRequest) {
            refundRequest.status = 'Accepted';
        }

        if (returnRequest) {
            returnRequest.status = 'Accepted';
        }
        // Save the updated order
      
   
        // Find the user and their wallet
        const user = await User.findById(userId);
        console.log('hello');
        const wallet = await WalletModel.findOne({ user: userId });
       
        if (!user || !wallet) {
            return res.status(404).json({ success: false, message: 'User or wallet not found' });
        }

        // Refund the amount to the user's wallet
        wallet.balance += order.billTotal;

        // Add a transaction record for the refund
        wallet.transactions.push({
            amount: order.billTotal,
            type: 'credit',
            description:'refuded'
        });

        // Save the updated wallet
        await order.save();
        for (const item of order.items) {
            const product = await Product.findById(item.productId);

            if (product) {
                // Increment the product quantity by the canceled quantity
                product.countInStock += item.quantity;

                // Save the updated product
                await product.save();
            }
        }
        await wallet.save();
        

        return res.json({ success: true, message: 'Amount refunded successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
} 

function getDate(date, fullDay) {
    let currentDate = (!fullDay) ? new Date() : new Date(fullDay);
    currentDate.setDate(currentDate.getDate() + date);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0') // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0')
    return day + '/' + month + '/' + year
}

exports.salesData = async (firstDate) => {
    let date = getDate(0, false)
    const startdate = getDate(firstDate, false)
    let orders = []
    if (firstDate != -1) {
        orders = await OrderModel.find({
            status: 'Delivered',
            orderDate: {
                $gte:startdate,
                $lt:date,
            }
        })
    } else if (firstDate === -1) {
        orders = await OrderModel.find({status:'Delivered',orderDate:startdate})
    }
    console.log(orders);
    let totalRevenue = 0
    orders.forEach((item) => {
        totalRevenue += item.billTotal
    })
    let count = orders.length
    let users = await User.find({})
    let products = await Product.find({})
    let totalSold = 0
    orders.forEach((order) => {
        order.items.forEach((item) => {
            totalSold += item.quantity
        })
    })
    let totalStock = 0
    products.forEach((item) => {
        totalStock += parseInt(item.countInStock)
    })
    let initialStock = parseInt(totalSold) + parseInt(totalStock)
    let averageSales = parseInt(totalSold) / parseInt(initialStock) * 100
    let averageOrders = users.length / count * 100
    let salesDetails = {
        count, totalSold, totalStock, initialStock, averageSales, averageOrders, totalRevenue,users:users.length,products:products.length
    }
    return salesDetails
}