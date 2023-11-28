const express=require('express')

const user_route= express.Router();

const config =require('../config/config')
// const auth=require('../middleware/auth')

function isAuthenticate(req,res,next){
    if(req.session.user){
        next();
    }else{
        res.redirect('/')
    }
}

const userController= require('../controllers/userControllers')
const cartController= require('../controllers/cartController')
const WalletController = require('../controllers/WalletController')


user_route.get('/register',userController.loadRegister)

user_route.post('/register',userController.postRegister)

user_route.get('/verify',userController.verifyMail)

user_route.get('/',userController.loginLoad)

user_route.get('/login',userController.loginLoad)

user_route.get('/logout',userController.logout)

user_route.post('/login',userController.verifyLogin)

user_route.get('/home',userController.isBlocked,userController.loadHome)

user_route.get('/shop',userController.isBlocked,userController.shopUser)

user_route.get('/product-detail/:productId',userController.isBlocked,userController.ProductDetailedView)

user_route.get('/contact',userController.isBlocked,userController.contactGet)

// user_route.get('/logout',userController.logout)

user_route.get('/otp',userController.loadOTP)
user_route.post('/postotp',userController.postVerifyOtp)
// user_route.post('/verifyOtp',userController.varify_OTP)

//FORGOT PASSWORD 
user_route.get('/forgot-password',userController.forgotPassword)

user_route.post('/forgot-password',userController.forgotPasswordPost)

//RESET PASSWORD

user_route.get('/reset-password/:tokenId',userController.resetPasswordGET);

user_route.post('/reset-password',userController.resetPasswordPost);


// user_route.get('/update',userController.updateTrial)

user_route.get('/profile',userController.isBlocked,userController.userProfileGet)

user_route.get('/profile',userController.isBlocked,userController.userProfileGet)

user_route.get('/profile/change-password',userController.changePassword)

user_route.post('/profile/addAddress',userController.userAddAddress)

user_route.post('/profile/editAddress',userController.userEditAddress)

user_route.delete('/profile/deleteAddress',userController.userdeleteAddress)

user_route.post('/profile/editProfile',userController.userDetailEdit)

user_route.get('/generate-invoice/:orderId',userController.isBlocked,userController.usergetOrderInvoice)


user_route.post('/cancel-order/:orderId',userController.cancelOrder)

user_route.get('/get-orders',userController.isBlocked,userController.userOrderDetails)

user_route.get('/orderDetails/:orderId',userController.orderDetails)

user_route.post('/order-ratings',userController.orderRatings);

user_route.post('/order-review',userController.orderReview)

user_route.delete('/delete-review/:reviewId',userController.deleteReview)

user_route.post('/return-order',userController.returnOrder)

//WISHLIST
user_route.post('/wishlist/:productId',cartController.WishlistAdd)

user_route.get('/wishlist',userController.isBlocked,cartController.WishlistGet)

user_route.post('/wishlist/remove/:productId',cartController.wishlistItemDelete)

user_route.post('/wishlist/moveTocart/:productId',cartController.WishlistToCart)

user_route.post('/referrals',userController.userReferral)

user_route.get('/refer',userController.isBlocked,userController.createuserReferral)


//Wallet Route

user_route.post('/create-razorpay-order',WalletController.WalletRazorpayCreation)

user_route.post('/confirm-payment',WalletController.WalletConfirmPayment)

user_route.post('/withdraw',WalletController.withdrawMoney)


module.exports = user_route

