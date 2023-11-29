const mongoose = require('mongoose')
const User = require('../models/userModel')
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const AddressModel = require('../models/addressModel')
const OrderModel = require('../models/OrderModel')
const Razorpay = require('razorpay');
const crypto = require('crypto')
const Wishlist = require('../models/wishlistModel');
const Wallet = require('../models/WalletModel')
const{ Coupon } =require('../models/couponModel')
require('dotenv').config();


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEYID,
    key_secret: process.env.RAZORPAY_KEYSECRET
})





let cartAdd = async (req, res) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product Not Found'
            })
        }
        console.log('hii')
        if (product.quantity === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product is out of stock'
            });
        }
        console.log('hee')
        const userId = req.session.user_id;
        console.log('hei')
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'user is not found'
            })
        }
        console.log('h')

        let cart = await Cart.findOne({
            owner: userId
        });
        console.log('tii')
        if (!cart) {
            cart = new Cart({
                owner: userId,
                items: [],
                billTotal: 0
            })
        }
        console.log('tt')
        const cartItem = cart.items.find((item) => item.productId.toString() === productId)

        if (cartItem) {
            cartItem.productPrice = product.price;
            cartItem.quantity += 1;
            cartItem.price = cartItem.quantity * product.price;
        } else {
            cart.items.push({
                productId: productId,
                name: product.name,
                image: product.image,
                productPrice: product.price,
                quantity: 1,
                price: product.price
            })
        }
        console.log('ii')
        cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0)
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Item added to cart'
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
}



let cartGet = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const category = await Category.find();
        const cart = await Cart.findOne({
            owner: userId
        });
        console.log(cart);
        if(cart && cart.items.length>0){
        for (const item of cart.items) {
            console.log(item.productId);
            let data = await Product.findOne({ _id: item.productId })
            console.log(data);
            item.data = data
        }
    }
        // const cartCount = cart.items.length;
        const cartItemCount = cart ? cart?.items.length : 0;
        let user = (userId) ? true : false
        return res.render('cart', {
            category,
            cart: cart,
            user,
            cartItemCount: cartItemCount
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            message: err
        })
    }
}


let cartPut = async (req, res) => {
    try {
        const producdId = req.params.productId;
        const newQuantity = req.body.quantity;

        // Find the user's cart based on their user ID (you may use cookies or sessions)
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ owner: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const cartItem = cart.items.find((item) => item.productId.toString() === producdId);


        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }
        const product = await Product.findById(producdId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (newQuantity > product.countInStock) {
            return res.status(201).json({ success: false, message: 'Quantity exceeds Currently Out of  stock' });
        } else {

            cartItem.quantity = newQuantity;
            cartItem.price = newQuantity * cartItem.productPrice;

            // Recalculate the cart's billTotal based on selected items
            let total = 0;
            cart.items.forEach((item) => {
                if (item.selected) {
                    total += item.productPrice * item.quantity;
                }
            });

            cart.billTotal = total;
            // Recalculate the cart's billTotal
            // cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);

            await cart.save(); // Save the updated cart

            return res.status(200).json({ success: true, message: 'Quantity updated successfully' });
        }


    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
let cartRemove = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user_id;

        const cart = await Cart.findOne({ owner: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart Not Found' })
        }

        const productIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found' })
        }

        // / Check if the removed item was selected and adjust the billTotal
        if (cart.items[productIndex].selected) {
            cart.billTotal -= cart.items[productIndex].price;
        }


        cart.items.splice(productIndex, 1);

        await cart.save();
        return res.status(200).json({ success: true, message: 'Product removed from the cart' });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Internal server error' });

    }
}

let cartbillTotalUpdate = async (req, res) => {
    try {
        const selectedProductIds = req.body.selectedProductIds;


        // Find the user's cart
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ owner: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart is not found based on user' });
        }

        // if(!selectedProducts){
        //     return res.status(404).json({success:false,message:'Selected products not found'})
        // }


        // Set 'selected' to true for all selected products
        cart.items.forEach((item) => {
            if (selectedProductIds.includes(item.productId.toString())) {
                item.selected = true;
            } else {
                item.selected = false; // Unselect other products
            }
        });


        let total = 0;
        cart.items.forEach((item) => {
            if (item.selected) {
                total += item.productPrice * item.quantity;
            }
        });
        // Update the cart's billTotal
        cart.billTotal = total;
        await cart.save();

        res.status(200).json({ success: true, message: 'Successfully billtotal updated', billTotal: cart.billTotal });

    } catch (err) {
        console.log(err);
        next(err)
    }
}

let checkoutGet = async (req, res) => {
    try {

      let Adreessmessage;

        // console.log(req.session.get);
        if (req.session.checkout === true) {
            let user = req.session.user_id ? true : false;

            const addresses = await AddressModel.findOne({ user: req.session.user_id })
            const userDetails = await User.findOne({ _id: req.session.user_id })
            const [userDetail] = await User.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(req.session.user_id),

                    }
                }, {
                    $lookup: {
                        from: 'wallets',
                        localField: "wallet",
                        foreignField: "_id",
                        as: "WalletData"
                    }
                },
                {
                    $limit: 1,
                },

            ])

            // / Check if WalletDetails is not an empty array
            if (userDetail.WalletData.length === 0) {
                userDetail.WalletData = null; // Set it to null or an empty object, depending on your preference
            } else {
                // Unwind only if there are WalletDetails
                userDetail.WalletData = userDetail.WalletData[0];
            }

            console.log(userDetail)
            const category = await Category.find();
            console.log(req.session.user)
            const cartCheckout = await Cart.findOne({ owner: req.session.user_id });
            console.log(cartCheckout)
            const selectedItems = cartCheckout.items.filter(item => item.selected === true);
            console.log(selectedItems);
            // Get selected address types based on the user's addresses

            let selectedAddressTypes = []; // Initialize selectedAddressTypes as an empty array

            if (addresses) {
                selectedAddressTypes = addresses.addresses.map((address) => address.addressType);
            }
            // const selectedAddressTypes = addresses.addresses.map(address => address.addressType);
            // Calculate the total amount for the order
            const billTotal = selectedItems.reduce((total, item) => total + item.price, 0);
            let discountPrice = null;
            let discountedTotal = null
            if (req.session.discountAmount && req.session.discountedTotal) {
                discountPrice = req.session.discountAmount;
                discountedTotal = req.session.discountedTotal
            }
            // Get the count of selected items
            const itemCount = selectedItems.length;


            let flag = 0
            Promise.all(selectedItems.map(async (item, index) => {
                let stock = await Product.findById(item.productId)
                console.log(item.quantity, stock.countInStock);
                if (item.quantity > stock.countInStock) {
                    flag = 1
                    selectedItems[index].quantity = stock.countInStock
                    //under database
                    cartCheckout.items.map(async (prod, i) => {
                        if (prod.productId + "" === selectedItems[index].productId + "") {
                            cartCheckout.items[i].quantity = stock.countInStock
                            console.log("before saving    ==");
                            await cartCheckout.save()
                        }
                    })
                    //save
                }

            })).then(() => {
                console.log(flag);
                console.log("if worked =====================");

                console.log(flag);
                console.log("if worked =====================");
                if (flag === 1) {
                    flag = 0

                    res.render('Checkout', {
                        user, category, addresses, selectedItems, billTotal, itemCount, Adreessmessage, discountPrice,
                        discountedTotal,
                       selectedAddressTypes,  userDetail, err: true
                    })
                } else {

                    res.render('Checkout', {
                        user, category, addresses, selectedItems, billTotal, itemCount, Adreessmessage, discountPrice,
                        discountedTotal,
                         selectedAddressTypes,  userDetail, err: ''
                    })
                }
            })


        } else {
            res.redirect('/home/cart')
        }
    } catch (err) {
        console.log(err);
        // next(err);
    }
}

function generateRandomOrderId(length) {
    let result = '';
    const characters = '0123456789'; // Digits

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return 'OD_' + result;
}

let checkoutPost = async (req, res, next) => {
    try {
        // Validate the request body
        if (!req.body.paymentOption || !req.body.addressType) {
            // Handle invalid or missing data in the request
            return res.status(400).json({ success: false, error: "Invalid data in the request" });
        }

        console.log(req.body.paymentOption, req.body.addressType)

        const cart = await Cart.findOne({ owner: req.session.user_id });

        if (!cart || cart.items.length === 0) {
            // Handle the case where the user has no items in the cart
            return res.status(400).json({ success: false, error: "No items in the cart" });
        }

        let selectedItems = cart.items.filter((item) => item.selected === true);



        // Check if any selected items have already been ordered
        const orderedItems = await OrderModel.find({
            user: req.session.user_id,
            items: { $elemMatch: { productId: { $in: selectedItems.map(item => item.productId) } } }
        });

        if (orderedItems.length > 0) {
            selectedItems = selectedItems.filter(item => !orderedItems.some(orderedItem =>
                orderedItem.items.some(orderedItemItem => orderedItemItem.productId === item.productId)
            ));
        }

        const Address = await AddressModel.findOne({ user: req.session.user_id });


        if (!Address) {
            // Handle the case where the user has no address
            return res.status(400).json({ success: false, error: "User has no address" });
        }
        console.log('Address' + Address)
        const deliveryAddress = Address.addresses.find(
            (item) => item.addressType === req.body.addressType
        );

        if (!deliveryAddress) {
            // Handle the case where the requested address type was not found
            return res.status(400).json({ success: false, error: "Address not found" });
        }
        const orderAddress = {
            addressType: deliveryAddress.addressType,
            HouseNo: deliveryAddress.HouseNo,
            Street: deliveryAddress.Street,
            Landmark: deliveryAddress.Landmark,
            pincode: deliveryAddress.pincode,
            city: deliveryAddress.city,
            district: deliveryAddress.district,
            State: deliveryAddress.State,
            Country: deliveryAddress.Country,
        };

        let billTotal = selectedItems.reduce((total, item) => total + item.price, 0);
        console.log(billTotal, selectedItems);

        


        if (req.body.paymentOption === "cashOnDelivery") {

            if(  req.session && req.session.discountedTotal && req.session.discountAmount && req.session.discountAmount!=null &&  req.session.discountedTotal!=null){
                billTotal = req.session.discountedTotal
              
                const coupon = await Coupon.findOne({ code: req.session.couponCode });
                coupon.usersUsed.push(req.session.user_id);
                await coupon.save();
                req.session.couponId = coupon._id;
               
              }
            const orderIds = await generateRandomOrderId(6);
            
            // Create a new order
            const orderData = new OrderModel({
                user: req.session.user_id,
                cart: cart._id,
                orderId: orderIds,
                items: selectedItems,
                billTotal,
                paymentStatus: 'Success',
                orderId: orderIds,
                paymentId: null,
                paymentMethod: req.body.paymentOption,
                deliveryAddress: orderAddress,
                discounts : req.session.discountedTotal ? [
                    {
                      code:req.session.couponCode,
                     amount:req.session.discountAmount,
                     discountType:'Coupon',
                     coupon:req.session.couponId?req.session.couponId: null,
                    }
                   ]:[]
                // Add more order details as needed
            });

            // Deduct purchased items from inventory
        for (const item of selectedItems) {
            const product = await Product.findOne({ _id: item.productId });

            

            if (product) {
                // Ensure that the requested quantity is available in stock
                console.log(item.quantity, product.countInStock);
                if (product.countInStock >= item.quantity) {
                    // Decrease the countInStock by the purchased quantity
                    product.countInStock -= item.quantity;
                    console.log(product.countInStock)
                    await product.save();
                } else {
                    // Handle the case where the requested quantity is not available
                    console.log("pppppp")
                    return res.status(400).json({ success: false, error: "Not enough stock for some items" });
                }
            } else {
                // Handle the case where the product was not found
                return res.status(400).json({ success: false, error: "Product not found" });
            }
        }

        const order = new OrderModel(orderData)
                      await order.save()
                        req.session.couponCode= null
                        req.session.discountAmount = null
                        req.session.discountedTotal =null
                        req.session.couponId=null
          

            // Remove selected items from the cart
            cart.items = cart.items.filter((item) => !item.selected);
            cart.billTotal = 0
            await cart.save();

            // Get the order ID after saving it
            const orderId = order._id;

            return res.status(201).json({ success: true, message: 'order placed successfully', orderId });

        } else if (req.body.paymentOption === "Razorpay") {
            // Handle Razorpay

            if(req.session.discountedTotal && req.session.discountAmount && req.session.discountAmount!=null &&  req.session.discountedTotal!=null){
                billTotal = req.session.discountedTotal
              
                const coupon = await Coupon.findOne({ code: req.session.couponCode });
                coupon.usersUsed.push(req.session.user_id);
                await coupon.save();
                req.session.couponId = coupon._id;
               
              }
            const amount = billTotal * 100; // Convert to paise or cents


            const orderData = new OrderModel({
                user: req.session.user_id,
                cart: cart._id,
                items: selectedItems,
                billTotal,
                paymentStatus: "Pending",
                orderId: null,
                paymentId: null,
                paymentMethod: req.body.paymentOption,
                deliveryAddress: orderAddress,
                discounts : req.session.discountedTotal ? [
                    {
                     code:req.session.couponCode,
                     amount:req.session.discountAmount,
                     discountType:'Coupon',
                     coupon:req.session.couponId?req.session.couponId: null,
                    }
                   ]:[]
                // Add more order details as needed
            });

            // Create a new order
            const order = new OrderModel(orderData);

            // const orderId = order._id;

            // Create a Razorpay order and send the order details to the client
            const options = {
                amount,
                currency: 'INR',
                receipt: 'razorUser@gmail.com', // Replace with your email
            };

            razorpayInstance.orders.create(options, async (err, razorpayOrder) => {
                if (!err) {
                    order.orderId = razorpayOrder.id;

                    try {
                        await order.save(); // Save the order to the database
                        req.session.couponCode= null
                        req.session.discountAmount = null
                        req.session.discountedTotal =null
                        req.session.couponId=null
                        console.log("/...................................../////////////////////////////////////////////////");
                        console.log(order)

                        return res.status(201).json({
                            success: true,
                            msg: 'Order Created',
                            order,
                            amount,
                            key_id: process.env.RAZORPAY_KEYID,
                            contact: req.session.user.mobile, // Replace with user's mobile number
                            name: req.session.user.name,
                            email: req.session.useremail,
                            address: `${orderAddress.addressType}\n${orderAddress.HouseNo} ${orderAddress.Street}\n${orderAddress.pincode} ${orderAddress.city} ${orderAddress.district}\n${orderAddress.State}`,
                        });

                    } catch (saveError) {
                        console.error('Error saving order to the database:', saveError);
                        return res.status(400).json({ success: false, msg: 'Failed to save order' });
                    }
                } else {
                    console.error('Error creating Razorpay order:', err);
                    return res.status(400).json({ success: false, msg: 'Something went wrong!' });
                }
            });
        }else if(req.body.paymentOption === "Wallet"){

          const wallet = await Wallet.findOne({ user:  req.session.user_id });

          if (!wallet) {
            return res.status(404).json({ success: false, msg: 'Wallet not found for the user' });
          }
          if(req.session.discountedTotal && req.session.discountAmount && req.session.discountAmount!=null &&  req.session.discountedTotal!=null){
            billTotal = req.session.discountedTotal
          
            const coupon = await Coupon.findOne({ code: req.session.couponCode });
            coupon.usersUsed.push(req.session.user_id);
            await coupon.save();
            req.session.couponId = coupon._id;
           
          }

          // Check if the wallet balance is sufficient
          if (wallet.balance < billTotal) {
            return res.status(400).json({ success: false, msg: 'Insufficient funds in the wallet' });
          }
          // Deduct the billTotal from the wallet balance
          wallet.balance -= billTotal;

          
            // Create a transaction entry for the order
            wallet.transactions.push({
              amount: -billTotal,
              type: 'debit',
            });

            // Deduct purchased items from inventory
            for (const item of selectedItems) {
              const product = await Product.findOne({ _id: item.productId });
              if (product) {
                // Ensure that the requested quantity is available in stock
                if (product.countInStock >= item.quantity) {
                  // Decrease the countInStock by the purchased quantity
                  product.countInStock -= item.quantity;
                  await product.save();
                } else {
                  // Handle the case where the requested quantity is not available
                  return res
                    .status(400)
                    .json({ success: false, error: "Not enough stock for some items" });
                }
              } else {
                // Handle the case where the product was not found
                return res
                  .status(400)
                  .json({ success: false, error: "Product not found" });
              }
            }
            // Save the wallet changes
            await wallet.save();

                const orderIds = await generateRandomOrderId(6); 
                const orderData  = {
                  user: req.session.user_id,
                  cart: cart._id,
                  items: selectedItems,
                  billTotal,
                  paymentStatus: "Success",
                  orderId: orderIds,
                  paymentId: null,
                  paymentMethod: req.body.paymentOption,
                  deliveryAddress: orderAddress,
                  discounts : req.session.discountedTotal ? [
                    {
                     code:req.session.couponCode,
                     amount:req.session.discountAmount,
                     discountType:'Coupon',
                     coupon:req.session.couponId?req.session.couponId: null,
                    }
                   ]:[]
                  // Add more order details as needed
                  };

                  const order = new OrderModel(orderData)
                  await order.save();
                  req.session.couponCode= null
                    req.session.discountAmount = null
                    req.session.discountedTotal =null
                    req.session.couponId=null


                  // Remove selected items from the cart
                  cart.items = cart.items.filter((item) => !item.selected);
                  cart.billTotal = 0;
                  await cart.save();

                  const orderId = order._id;

                  
            return res.status(201).json({success:true,message:'Wallet payment success',orderId})

        } else {
            // Handle other payment methods (e.g., Paypal)
            // You can add the implementation for other payment methods here
            return res.status(400).json({ success: false, error: 'Invalid payment option' });
        }

    } catch (err) {
        console.error(err);
        next(err);
    }
};


let razorpayVerify = async (req, res) => {
    try {
        console.log("VERIFY EYE/////////////////////////////");
        const body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
        console.log(body);

        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEYSECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === req.body.razorpay_signature) {
            console.log("Corrected Verify");

            // Find the previously stored record using orderId
            const updatedOrder = await OrderModel.findOneAndUpdate(
                { orderId: req.body.razorpay_order_id },
                {
                    paymentId: req.body.razorpay_payment_id,
                    signature: req.body.razorpay_signature,
                    paymentStatus: "Success",
                },
                { new: true }
            );
            console.log(updatedOrder)
            if (updatedOrder) {
                const cart = await Cart.findOne({ owner: req.session.user_id });
                // Remove selected items from the cart
                cart.items = cart.items.filter((item) => !item.selected);
                cart.billTotal = 0;
                await cart.save();
                // Render the payment success page
                return res.json({ success: true, message: 'Order Sucessfully', updatedOrder })
            } else {
                // Handle the case where the order couldn't be updated
                return res.json({
                    success: false,
                    message: 'Order Failed Please try Again'
                })
            }
        } else {
            // Handle the case where the signature does not match
            return res.json({
                success: false,
                message: 'Order Failed Please try Again'
            })
        }
    } catch (err) {
        console.log(err);
        // Handle errors
        return res.render('paymentFailed', {
            title: "Error",
            error: "An error occurred during payment verification",
        });
    }
};



let razorpayFailed = async (req, res) => {
    try {
        res.status(200).render('paymentFailed')
    } catch (err) {
        console.log(err)
    }
}

// let updatePaymentStatus = async (req, res) => {
//     try {
//         const orderId = req.body.orderId;

//         // Update the payment status in the database (e.g., using Mongoose)
//         const updatedOrder = await OrderModel.findByIdAndUpdate(
//             orderId,
//             { paymentStatus: 'Success' },
//             { new: true }
//         );

//         if (updatedOrder) {
//             return res.status(200).json({ success: true, message: 'Payment status updated successfully' });
//         } else {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ success: false, error: 'Internal server error' });

//     }
// }


let orderConfirmation = async (req, res) => {
    const orderId = req.params.orderId;
    // Validate if orderId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(404).json({ message: "error" })
    }

    try {
        req.session.checkout = false
        let orderDetails = await OrderModel.findById(orderId)
        if (!orderDetails) {
            return res.status(404).json({ message: "error" })
        }

        res.render('orderConfirmation')
    } catch (err) {
        console.log(err);

    }
}


//WishLIST SETUP
let WishlistAdd = async (req, res) => {
    try {
        console.log("haui")
        const productId = req.params.productId;
        const userId = req.session.user_id;

        // Find the product by its ID
        const product = await Product.findOne({ _id: productId });

        if (!product) {
            return res.status(404).json({ message: 'The Product is Not Found' });
        }

        // Check if the product is already in the user's wishlist
        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            // If the wishlist doesn't exist for the user, create a new one
            const newWishlist = new Wishlist({
                user: userId,
                products: [productId],
            });
            await newWishlist.save();
            res.status(200).json({ message: 'Product added to wishlist successfully' });
        } else {
            // Check if the product is already in the wishlist
            const productIndex = wishlist.products.indexOf(productId);

            if (productIndex !== -1) {
                // If the product is in the wishlist, remove it
                wishlist.products.splice(productIndex, 1);
                await wishlist.save();
                res.status(200).json({ message: 'Product removed from wishlist successfully' });
            } else {
                // If the product is not in the wishlist, add it
                wishlist.products.push(productId);
                await wishlist.save();
                res.status(200).json({ message: 'Product added to wishlist successfully' });
            }
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



let WishlistGet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get the requested page number
        const perPage = 8; // Number of items per page
        const userId = req.session.user_id;
        let user = userId ? true : false;

        const category = await Category.find();
        const wishlist = await Wishlist.findOne({ user: userId })
            .populate({
                path: 'products',
                model: 'Product',
                select: 'name price description image countInStock',
            });
        console.log(wishlist)
        const numberOfItemsInWishlist = wishlist!==null?wishlist.products?.length:null;
        const totalPages = Math.ceil(numberOfItemsInWishlist / perPage);
        const startIndex = (page - 1) * perPage;

        const Products = wishlist?.products?.slice(startIndex, startIndex + perPage);

        const paginationInfo = {
            totalPages,
            currentPage: page,
        };
        console.log('////////////////////////////////////////////////////////////////////////////////////////////////////////////////////');
        console.log(Products);
        return res.render('wishlist', { category, Products, user, paginationInfo });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



let wishlistItemDelete = async (req, res) => {
    try {
        const productId = req.params.productId; // The product ID to remove from the wishlist
        const userId = req.session.user_id; // The user ID
        console.log("wislist Delete")
        // Find the user's wishlist
        const wishlist = await Wishlist.findOne({ user: userId });
        console.log(wishlist)
        if (!wishlist) {
            console.log("not Wishlais")
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Check if the product exists in the wishlist
        const productIndex = wishlist.products.indexOf(productId);

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in the wishlist' });
        }

        // Remove the product from the wishlist
        wishlist.products.splice(productIndex, 1);

        // Save the updated wishlist
        await wishlist.save();

        res.status(200).json({ message: 'Product removed from the wishlist' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



let WishlistToCart = async (req, res) => {
    try {
        console.log("move to cart")
        const userId = req.session.user_id; // Assuming you have the user ID available

        // Get the product ID you want to move from the request
        const productId = req.params.productId; // Adjust this based on your route

        // Retrieve the product details from the wishlist
        const wishlistItem = await Wishlist.findOne({ user: userId, products: productId });

        if (!wishlistItem) {
            console.log("Product not found in the wishlist")
            return res.status(404).json({ message: 'Product not found in the wishlist' });
        }

        // Check if the product is available in your product collection
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.quantity === 0) {
            return res.status(400).json({ message: 'Product is out of stock' });
        }

        // Create or retrieve the user's cart
        let cart = await Cart.findOne({ owner: userId });

        if(!cart){
            cart = new Cart({
                owner : userId,
                items:[],
                billTotal:0
            })
        }
        const cartItem = cart?.items.find((item) => item.productId.toString() === productId)

        if (cartItem) {
            cartItem.productPrice = product.price;
            cartItem.quantity += 1;
            cartItem.price = cartItem.quantity * product.price;
        } else {
            cart?.items.push({
                productId: productId,
                name: product.name,
                image: product.image,
                productPrice: product.price,
                quantity: 1,
                price: product.price
            })
        }

        // Update the cart's bill total
        cart.billTotal = cart?.items.reduce((total, item) => total + item.price, 0);

        // Save the cart
        await cart.save();

        // Remove the product from the wishlist
        await Wishlist.updateOne(
            { user: userId },
            { $pull: { products: productId } }
        );

        return res.status(200).json({ message: 'Product moved from wishlist to cart successfully' });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getCouponsForBill = async (billTotal) => {
    try {
      const currentDate = new Date();
      console.log(billTotal+'/,/,/,/,/.,.,/cxxxxxxxxxxxxxxxxxxxxxxxx,')
      // Find active coupons that match the bill total criteria
      const availableCoupons = await Coupon.find({
        isActive: true,
        minimumAmount: { $lte: billTotal }, // Check if the bill total is greater than or equal to the minimumAmount
        expirationDate: { $gte: currentDate },
      });
      console.log(availableCoupons)
      return availableCoupons;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      return [];
    }
  };

const getCoupons = async(req,res)=>{
    try{
      const billTotal = parseFloat(req.query.billTotal); // Get bill total from the request query
      const coupons = await getCouponsForBill(billTotal);
      res.json(coupons);
    }catch(err){
      console.log(err);
      return res.status(500).json({message:"Internal server error"});
    }
  }
  
  // Define a function to check if a coupon is valid
  function isValidCoupon(coupon) {
    const currentDate = new Date();
  
    // Check if the coupon is active
    if (!coupon.isActive) {
      return false;
    }
  
    // Check if the coupon has not expired
    if (coupon.expirationDate < currentDate) {
      return false;
    }
  
    // You can add more criteria here based on your requirements
  
    return true;
  }

  const applyCoupon = async (req, res) => {
    try {
      const couponCode = req.query.code; // Get the coupon code from the request
      const billTotal = parseFloat(req.query.billTotal); // Get the bill total from the request
      const userId = req.session.user_id;
      // Fetch the coupon from the database based on the coupon code
      const coupon = await Coupon.findOne({ code: couponCode });
      
      if (!coupon) {
        req.session.couponCode= null
        req.session.discountAmount = null
        req.session.discountedTotal =null
        // If the coupon is not found, return an error response
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }
  
      // Check if the coupon is valid (isActive, not expired, etc.)
      if (!isValidCoupon(coupon)) {
        req.session.couponCode=null
        req.session.discountAmount = null
        req.session.discountedTotal = null;
        return res.status(400).json({ success: false, message: 'Coupon is not valid' });
      }
      if (coupon.usersUsed.includes(userId)) {
        req.session.couponCode=null
        req.session.discountAmount = null
        req.session.discountedTotal = null;
        return res.status(400).json({ success: false, message: 'Coupon has already been used by this user' });
      }
      // Calculate the discount amount based on the discount percentage
      let discountAmount = parseInt((coupon.discountPercentage / 100) * billTotal);
      
      if(coupon.maxDiscountAmount !== null){
        discountAmount = Math.min(discountAmount,coupon.maxDiscountAmount)
      }
      console.log(discountAmount+'discountAmount')
      // Calculate the discounted total
      const discountedTotal = billTotal - discountAmount;
  
      // Store the discounted total in the session
      req.session.couponCode = couponCode;
      req.session.discountAmount =discountAmount;
      req.session.discountedTotal = discountedTotal;
      console.log(req.session.discountedTotal)
      // Return the result to the frontend
      return res.json({ success: true, discountedPrice:discountAmount,newTotalPrice:discountedTotal });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  



const checkverify = (req, res, next) => {
    req.session.checkout = true
    res.redirect('/home/cart/checkout')
}

module.exports = {
    cartAdd,
    cartGet,
    cartPut,
    cartRemove,
    cartbillTotalUpdate,
    checkoutGet,
    checkoutPost,
    razorpayVerify,
    razorpayFailed,
    orderConfirmation,
    checkverify,
    WishlistAdd,
    WishlistGet,
    wishlistItemDelete,
    WishlistToCart,
    getCoupons,
    applyCoupon 
}
