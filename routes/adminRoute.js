const express = require('express')
const admin_route = express()
const { storage, upload } = require('../config/multerConfig');
const config = require('../config/config')
const Order = require('../controllers/adminOrderManagement')
const Banner= require('../controllers/BannerController')
const PDFDocument = require('pdfkit');
const fs = require('fs');

const bodyParser = require('body-parser')
admin_route.use(bodyParser.json())
admin_route.use(bodyParser.urlencoded({ extended: true }))

// const auth= require('../middleware/adminAuth')

admin_route.set('view engine', 'ejs')
admin_route.set('views', './views/admin')

const adminController = require('../controllers/adminController')
const categoryController = require('../controllers/categoryController')
const productController = require('../controllers/productController')
const coupons = require('../controllers/couponManagement');

function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.redirect('/admin')
    }
}

admin_route.get('/', adminController.loadLogin)

admin_route.post('/', adminController.verifyLogin)

admin_route.post('/signup', isAdmin, adminController.adminSignupPost);

admin_route.get('/home', isAdmin, adminController.loadDashboard)

admin_route.get('/pdf',isAdmin, adminController.downloadPdf)

admin_route.get('/excel', isAdmin, adminController.generateExcel)

admin_route.get('/logout', adminController.logout)

admin_route.get('/dashboard', isAdmin, adminController.adminDashboard)

admin_route.get('/users', isAdmin, adminController.usersList)

admin_route.post('/users/block-user/:Id', isAdmin, adminController.userBlock)



//category route//

admin_route.get('/category-management', isAdmin, categoryController.categoryManagementGet);

admin_route.post('/category-management/newCategory', upload.single('image'), categoryController.categoryManagementCreate)

admin_route.post('/category-management/editCategory/:categoryId', upload.single('editImage'), categoryController.categoryManagementEdit)

admin_route.delete('/category-management/deleteCategory/:categoryId', categoryController.categoryManagementDelete)

//To unlsit the category
admin_route.patch('/category-management/update-status/:categoryId', categoryController.categoryManagementUnlist)

//product route

admin_route.get('/product-management', isAdmin, productController.productManagementGet)

admin_route.post('/product-management/newProduct', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]), productController.productManagementCreate)

admin_route.get('/product-management/getCategories', isAdmin, productController.productCategories);

admin_route.post('/product-management/editProduct/:Id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]), productController.productManagementEdit);

admin_route.delete('/product-management/delete-product/:productId', productController.productManagementDelete);

admin_route.put('/product-management/updateProduct/:productId', productController.productManagementPublish);

//order management

admin_route.get('/order-management', Order.OrderManagementPageGet);

admin_route.delete('/order-management/deleteOder/:orderId', Order.OrderDelete)

admin_route.get('/order-management/orderDetailedView/:orderId', Order.orderDetailedView);

admin_route.post('/order-management/update-order-status/:orderId', Order.updateOrderStatus)



//BANNER MANAGEMENT 
admin_route.get('/banner-management',Banner.bannersGet);

admin_route.post('/banner-management/create',upload.single('image'),Banner.bannersCreate);

admin_route.put('/banner-management/edit/:bannerId',upload.single('image'),Banner.bannersEdit);

admin_route.delete('/banner-management/delete/:bannerId',Banner.bannersDelete);

admin_route.put('/banner-management/change-status/:bannerId',Banner.bannersUpdate)

 //Coupon Management

admin_route.get('/coupon-management',coupons.couponManagementGet);

admin_route.post('/createCoupon',coupons.couponCreate);

admin_route.post('/coupon/update-status/:Id',coupons.couponUpdate);

admin_route.post('/EditCoupon/:Id',coupons.couponEdit)


//Order Management

admin_route.get('/order-management',Order.OrderManagementPageGet);

admin_route.delete('/order-management/deleteOder/:orderId',Order.OrderDelete)

admin_route.get('/order-management/orderDetailedView/:orderId',Order.orderDetailedView);

admin_route.post('/order-management/update-order-status/:orderId',Order.updateOrderStatus);

admin_route.post('/refund-amount',Order.refundAmount)

admin_route.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(errr)
        }
    })
    res.redirect('/login');
})

admin_route.get('*', function (req, res) {
    res.redirect('/admin')
})


module.exports = admin_route