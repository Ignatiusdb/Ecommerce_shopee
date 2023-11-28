const express = require('express');
const cartRouter = express.Router();
const nocache=require('nocache')

cartRouter.use(nocache());


const cartController = require('../controllers/cartController')



cartRouter.get('/',cartController.cartGet);

cartRouter.post('/addToCart/:productId',cartController.cartAdd);

// function nocache(req, res, next) {
//     res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
//     next();
//   }

cartRouter.put('/update-cart-quantity/:productId',cartController.cartPut)

cartRouter.delete('/remove-product/:productId',cartController.cartRemove)

cartRouter.patch('/update-cart-total',cartController.cartbillTotalUpdate)

cartRouter.get('/checkVerify',cartController.checkverify)

cartRouter.get('/checkout',cartController.checkoutGet)

cartRouter.post('/checkout',cartController.checkoutPost);

cartRouter.post('/verify-payment',cartController.razorpayVerify);

cartRouter.get('/order-confirmation/:orderId',cartController.orderConfirmation);

//COUPON MANAGEMENT

cartRouter.get('/getCoupons',cartController.getCoupons);

cartRouter.get('/applyCoupon',cartController.applyCoupon)

module.exports=cartRouter;
