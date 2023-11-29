const User= require('../models/userModel')
const bcrypt = require('bcrypt')
const { name, render } = require('ejs')
const { ObjectId } = require('mongodb')
const nodemailer = require('nodemailer')
const twilio = require('twilio')
const Product = require('../models/productModel')
const {log} = require('console')
const Category = require('../models/categoryModel')
const AddressModel=require('../models/addressModel')
const OrderModel= require('../models/OrderModel')
const crypto=require('crypto')
const Banner= require('../models/BannerModel')
const Wallet= require('../models/WalletModel')
const Rating =  require('../models/RatingModel')
const ReviewModel = require('../models/ReviewSchema')
const Order = require('../models/OrderModel')
const { default: mongoose } = require('mongoose')
const uuidv4 = require('uuid').v4;
const Referral = require('../models/ReferralModel')
const ejs = require('ejs')
const path= require('path')
const puppeteer = require('puppeteer');
const Wishlist = require('../models/wishlistModel')
const { trans } = require('../config/otpGenerator')


const isBlocked =async (req,res,next) =>{
  if(req.session.user_id){
  let user = await User.findById(req.session.user_id)
  log(user)
  if(user.isBlocked){
    req.session.destroy()
    res.redirect('/login')
  } else { 
    next()
  }
}else{
  res.redirect('/login')
}
}

const contactGet = async (req, res) => {
  try {
    let user = req.session.user_id ? true : false;
    res.render('userContact', { user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



const securePassword = async (password) => {
  try {
    const passwordHash = bcrypt.hash(password, 10)
    return passwordHash

  } catch (error) {
    console.log(error.message);
  }
}

//for send mail


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: 'ignatiusdb57@gmail.com',
    pass: 'bdpkjaneofaysszr'
  }


})// Create a Nodemailer transporter

const sendOtpVerificationEmail = async (email) => {
  try {
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    // const hashedotp = await bcrypt.hash(otp, 10); // Hash the OTP

    const mailOptions = {
      from: "your-email@gmail.com",
      to: email,
      subject: "Verify your Email",
      html: ` Your OTP is: ${otp}`,
    }

    // Send the email
    await transporter.sendMail(mailOptions);

    return {
      status: "PENDING",
      message: "Verification OTP email sent",
      data: {
        email: email,
        // hashedotp: hashedotp, // Send the hashed OTP for verification
        otp,
      },
    };
  } catch (error) {
    throw error;
  }
};

async function postRegister(req, res) {
  const { name, email, mobile, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.redirect("/login");
    }

    // Calculate the expiration time
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);

    // Send the OTP email
    const result = await sendOtpVerificationEmail(email);
    // console.log(result.data.otp);

    const hashedPsw =password
    // Store the OTP and its expiration time in the database
    user = new User({
      name,
      email,
      mobile,
      password: hashedPsw,
      is_admin: false,
      is_verifiedverified: false,
      isBlocked: false,

      otp: {
        code: result.data.otp,
        expiresAt: expirationTime,
      },

    });

    // Save the new user to the database
    await user.save();

    // Set the user data in the session
    req.session.user = user;

    // Redirect the user to the OTP verification page
    res.redirect('/otp');
  } catch (error) {
    res.json({
      status: "Failed",
      message: error.message,
    });
  }
}


   
async function postVerifyOtp(req, res) {
  try {
    const { otp } = req.body;
    const { email } = req.session.user;
    //   console.log(otp);
    //   console.log(email);

    // Find the user by email
    const user = await User.findOne({ email });
    console.log(user);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/otp");
    }

    // Check if the OTP is expired
    if (new Date() > user.otp.expiresAt) {
      req.flash("error", "OTP has expired");
      return res.redirect("/verifyOtp");
    }

    // Compare the entered OTP with the stored OTP code
    if (otp === user.otp.code) {
      // Update the user' 'verified' status
      
      user.is_verified = true;
      await user.save();
       console.log("postverify");

       const newReferrer = new Referral({
        referralId: uuidv4(),
        referralLink: uuidv4(),
        userId: req.session.user._id,
    });
    console.log('/////.............');
    
  
    newReferrer.save()
    user.refId = newReferrer._id;
    await user.save();
    console.log(newReferrer)

      // Create a new wallet for the user
   const newWallet = new Wallet({
    user:user._id,
    
  });
  console.log("post");
  await newWallet.save();
  console.log("verify");

   // Update the user document with the reference to the wallet
   user.wallet = newWallet._id;
   await  user.save();
   console.log("poy");

   if (req.session.reflink) {
    try {
      const referrer = await Referral.aggregate([
        {
          $match: {
            referralLink: req.session.reflink,
          },
        },
        {
          $lookup: {
            from: 'users', // Make sure to use the actual name of your User collection
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $lookup: {
            from: 'wallets', // Make sure to use the actual name of your Wallet collection
            localField: 'user.wallet',
            foreignField: '_id',
            as: 'wallet',
          },
        },
        {
          $unwind: '$wallet',
        },
        {
          $project: {
            userId: '$user._id',
            wallet: '$wallet',
          },
        },
      ]);
  
      console.log(referrer);
  
      if (referrer.length > 0) {
        const referralAmount = 500; // Change this to the desired referral amount
        const referralBonus = referralAmount * 0.5;
  
        referrer[0].wallet.balance += referralBonus;
        referrer[0].wallet.transactions.push({
          amount: referralAmount,
          type: 'credit',
          description: 'Referral Bonus',
        });
  
        await Wallet.findByIdAndUpdate(referrer[0].wallet._id, referrer[0].wallet);
  
        newWallet.balance += referralBonus;
        newWallet.transactions.push({
          amount: referralBonus,
          type: 'credit',
          description: 'Referral Bonus',
        });
        newWallet.save();
      }
    } catch (err) {
      console.error('Error finding referral:', err);
      res.status(500).json({ success: false, message: err });
    }
  }
  

      res.redirect("/login");
    } else {
      req.session.inCorrect = true
      return res.redirect("/otp");
    }
  } catch (error) {
    //   req.flash("error", error.message);
    res.redirect("/otp");
  }
}


// verification end

const loadRegister = async (req, res) => {
  try {
    if(req.query.reflink){
      req.session.reflink =req.query.reflink;
    }
    res.render("registration")
  } catch (error) {
    console.log(error.message);
  }
}

const insertUser = async (req, res) => {
  try {
    const spassword = await securePassword(req.body.password)

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      is_admin: 0,
      is_verified: 0
    })

    const userData = await user.save()

    if (userData) {

      //email verification

    sendVerifyMail(req.body.name, req.body.email, userData._id)//edited

      //end



      res.render('registration', { message: "Registration successfull,please verify your mail" })
    } else {
      res.render('registration', { message: "Registration failed" })
    }
  } catch (error) {
    console.log(error.message);

  }
}



const verifyMail = async (req, res) => {
  try {
    const user_id = req.query._id; // Correct the query parameter name
    const updateInfo = await User.updateOne({ _id: user_id }, { $set: { is_verified: 1 } }); // Correct the field name
    console.log(updateInfo);
    if (updateInfo.nModified === 1) { // Check if a document was actually modified
      res.render("email-verified");
    } else {
      // Handle the case where no document was modified (e.g., user not found)
      res.render("verification-failed");
    }
  } catch (error) {
    console.log(error.message);
  }
}


//login user method

const loginLoad = async (req, res) => {
  console.log(req.session.loggedIn);
  if ( req.session.loggedIn) {
    console.log("login if worked");
    try {
      res.redirect('/home')
    } catch (error) {
      console.log(error.message);
    }
  } else {
    console.log("login else worked");
    res.render('login')
  }
}

const loadHome = async (req, res) => {
  try {
    // Fetch products from your database
    const products = await Product.find().sort({_id:-1}).populate('category', 'name'); //  // You can customize this query as needed
    const banners = await Banner.find({isActive:true});

    // Render the "UserHome" view and pass the products to it
    if (req.session.loggedIn) {
      console.log("home if worked");
      const user = req.session.user_id ? true:false
      res.render('home', { products,user,banners });
    } else {
      console.log("Home else worked");
      res.redirect('/login')
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}


const verifyLogin = async (req, res) => {

  try {
    const email = req.body.email
    const password = req.body.password

    const userData = await User.findOne({ email: email })

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password)

      if (passwordMatch) {
        if (userData.isBlocked) {
          return res.status(500).json({ status: 500, message: 'You are blocked by administrators ' })
        } else {
          req.session.user = userData
          req.session.user_id = userData._id
          // console.log(req.session.user)
          req.session.loggedIn = true
          res.redirect('/home')
        }

      } else {
        res.render('login', { message: 'email and pasword inncorrect' })
      }
    }
    else {
      res.render('login', { message: 'email and pasword inncorrect' })
    }
  } catch (error) {
    console.log(error.message);
  }
}


const logout = async (req, res) => {
  req.session.destroy();
  res.redirect('/')
}


const loadOTP = async (req, res) => {
  try {
    if(req.session.inCorrect) {
      req.session.inCorrect = false
      res.render('otp',{err:'Incorrect Otp'})
    } else {
      res.render('otp',{err:''})
    }
  } catch (error) {
    console.log(error.message);
  }
}


// const varify_OTP = async (req, res) => {
//   try {
//     const enteredOTP = req.body.otp;


//     if (enteredOTP == storedOTP) {
//       res.redirect('/login')
//     } else {
//       res.send("Failed")
//     }
//  } catch (error) {
//     console.log("Error")
//     console.log(error.message)
//   }
// }

//Forgot password

const forgotPassword = (req,res)=>{
  let user = ( req.session.user_id)?true:false
  res.status(200).render('userForgotPassword',{user})
}

const forgotPasswordPost = async (req, res) => {
  try {
    console.log(req.body)
    const email  = req.body.Email;
    console.log(email)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User is not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ email }, {
      $set: {
        resetToken: token,
        resetTokenExpiration: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes in milliseconds
      },
    });

    const mailOptions = {
      to: email,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: http://localhost:4010/reset-password/${token}`,
      html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:4010/reset-password/${token}">http://localhost:4010/reset-password/${token}</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({ message: 'Reset password link is sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `INTERNAL SERVER ERROR ${err}` });
  }
};

//Reseat Password

const resetPasswordGET = async(req,res)=>{
  try{
    let user = ( req.session.user_id)?true:false
    
  const Token = req.params.tokenId;
  console.log(Token);
  if(!Token){
    return  res.status(404).json({message:'token not found'});
  }
  const Users =  await User.findOne({ resetToken:Token});
  if(!Users){
    return res.status(404).json({message:"not found"})

  }
  if (Users.resetTokenExpiration && Users.resetTokenExpiration > new Date()) {
    // The token is still valid
    // Perform your reset password logic
    const category = await Category.find({status:'active'});
   return res.render('userSetNewPassword',{user, Token,category})
  } else {
    // The token has expired
    // Handle the case where the token has expired
   return res.status(410).json({message:'The token is expired'})
  }
  
  }
  catch(error){
    console.error(error);
    res.status(500).json({message:'Error Occured'+error})
  }
}

const resetPasswordPost = async(req,res) => {
  try{
    console.log(req.body);
  const token = req.body.token;
  const password = req.body.newPassword;
  const confirm_password = req.body.confirmnewPassword;
  if(password!==confirm_password){
    return res.status(400).json({message:'The confirm password and  password must be same'})
  }
  const user =  await User.findOne({ resetToken:token});
  console.log(user)
  if(!user){
    return res.status(404).json({message:"not found"})

  }
  user.password = password;
  user.resetToken = null; // Optionally, clear the reset token
  user.resetTokenExpiration = null;
  await user.save();
  // return res.status(200).json({status:true,message: 'Password reset successful' });
 return res.status(200).json({success:true,message:'Sucesfully Password Changed'})
  }
  catch (error) {
    console.error(error);
    return  res.status(500).json({ message: 'Error saving the new password' });
  }
  
}


const shopUser = async (req, res) => {
  try {
      let search = '';
      let query = {};
      let sortOption = '';

      if (req.query.search) {
          search = req.query.search;
      }

      const selectedCategory = req.query.category || '';

      if (selectedCategory) {
          query.category = selectedCategory;
      }

      if (req.query.sort) {
          sortOption = req.query.sort;
      }

      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      let productsQuery = {
          $or: [
              { name: { $regex: new RegExp(sanitizedSearch, 'i') } },
          ],
          ...query,
      };

      let sortOptions = {};

      if (sortOption === 'priceLowToHigh') {
          sortOptions = { price: 1 };
      } else if (sortOption === 'priceHighToLow') {
          sortOptions = { price: -1 };
      }
      const itemsPerPage = 6;
      const selectedPage = req.query.page || 1;
      const products = await Product.find(productsQuery)
          .populate('category', 'name')
          .sort(sortOptions);


          
      const categories = await Category.find().lean();

       // Your pagination logic to get a subset of products based on selectedPage
    const startIndex = (selectedPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);

    const totalProducts = products.length;

    const newProducts = await Product.find({ isFeatured: true }).sort({ createdAt: -1 }).limit(3);

    const category = await Category.find({ status: 'active' });

      if (req.session.loggedIn) {
          const user = req.session.user_id ? true : false;
          res.render('UserShop', { products:paginatedProducts,newProducts,category,  currentPage: selectedPage,
            totalPages: Math.ceil(totalProducts / itemsPerPage),
            countProducts: totalProducts, user, categories, selectedCategory });
      } else {
          res.redirect('/login');
      }
  } catch (err) {
      res.status(500).json({ message: "Some error occurred on the shop side" });
  }
};




const ProductDetailedView = async (req, res) => {
  try {
    const user = req.session.user_id ? true:false

    const id = req.params.productId;

    const product = await Product.findById(id);
    const category = await Category.find({});

    if (!product) {
      // Handle the case where the product with the specified id is not found
      return res.status(404).json({ error: 'Product not found' });
    }
    const productReviews = await ReviewModel.aggregate([
      {
        $match: { product:new mongoose.Types.ObjectId(id) }
      },
      {
        $unwind: "$reviews"
      },
      {
        $lookup: {
          from: "users", // Name of the User model collection
          localField: "reviews.author",
          foreignField: "_id",
          as: "reviews.authorDetails"
        }
      },
      {
        $unwind: "$reviews.authorDetails"
      },
      {
        $match: { "reviews.isPublish": true } // Filter for reviews with isPublish true
      },
      {
        $project: {
          "_id": "$reviews._id",
          "review": "$reviews.review",
          "isPublish": "$reviews.isPublish",
          "author.firstName": "$reviews.authorDetails.firstName",
          "author.lastName": "$reviews.authorDetails.lastName",
          "author.email": "$reviews.authorDetails.email",
          "createdAt": "$reviews.createdAt",
          "updatedAt": "$reviews.updatedAt"
        }
          // Add more fields as needed
        }
     
    ]);
    
    let userReview = null;
    let userRating = null;
    let productInWishlist;
    let hasPurchased = null;

    if (user) {
      const userId = req.session.user_id;
      userReview = await ReviewModel.findOne({ 'reviews.author': userId, product: id });
      userRating = await Rating.findOne({ 'Ratings.author': userId, product: id });
      hasPurchased = await Order.findOne({
          user: userId,
          'items.productId': id,
          status: { $in: ['Processing', 'Shipped', 'Delivered'] },
        });
  
      const wishlist = await Wishlist.findOne({ user: userId });

      if (wishlist && wishlist.products.includes(id)) {
        // The product is in the user's wishlist
        productInWishlist = true;
      } else {
        // The product is not in the user's wishlist
        productInWishlist = false;
      }
    } else {
      productInWishlist = false;
    }
    
   
    const productRatings = await Rating.find({ product: id });
    const allRatings = productRatings.flatMap((rating) => rating.Ratings.map((r) => r.rating));
    
    const averageRating = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b) / allRatings.length : 0;
    
    // Count the number of each star rating
    const starRatingsCount = [0, 0, 0, 0, 0];
    allRatings.forEach((rating) => {
      starRatingsCount[rating - 1]++;
    });
    
    console.log(averageRating, starRatingsCount);
    console.log('/////////////////////////////');
    console.log(userReview)
    console.log('/////////////////////////////');

    console.log(`productReviews: ${productReviews}, userReview: ${userReview}, userRating: ${userRating}, averageRating: ${averageRating}`);
    console.log(allRatings,averageRating,starRatingsCount)
    console.log('//////////////////////////////////////////////////////////');
    console.log(hasPurchased)
    // Render a template to display the product details
    res.render('ProductDetailedView', { product,
      user, 
      productInWishlist,
      productReviews,
      userReview,
      userRating,
      averageRating,
      starRatingsCount,
      hasPurchased });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', errorMessage: error.message });
  }
}

//userProfile

const userProfileGet = async (req, res) => {
  try {
    let user = req.session.user_id ? true : false;
    const category = await Category.find({ status: 'active' });
    console.log("address")
    const addresses = await AddressModel.findOne({ user: req.session.user_id });
    console.log("address")
    const orderDetails = await OrderModel.find({ user: req.session.user_id });

    const [userDetails] = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.session.user_id),
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'WalletDetails',
        },
      },
      {
        $limit: 1,
      },
    ]);

    console.log(userDetails);

    let generatedRefLink = '';

    const loggedUser = await Referral.findOne({ userId: req.session.user_id });

    if (loggedUser) {
      console.log(loggedUser);
      generatedRefLink = `${req.protocol}://${req.headers.host}/register?reflink=${loggedUser.referralLink}`;
      console.log(generatedRefLink);
    }

    res.status(200).render('userProfile', {
      category,
      user,
      addresses,
      userDetails,
      orderDetails,
      generatedRefLink,
    });
  } catch (err) {
    console.log(err);
    res.status(500).render('500error', { message: 'Internal server error' + err });
  }
};

const changePassword = async (req, res) => {
  try {
    console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    let user = (req.session.user_id) ? true : false
    const userId = req.session.user_id
    console.log("uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu"+userId);
    const userDetails = await User.findOne({
      _id: userId
    });
    if (!userDetails) {
      return res.status(404).json({
        message: 'User is not found'
      });
    }
    const email = userDetails.email;
    console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"+email)
    console.log(email)
    const token = crypto.randomBytes(32).toString('hex');
    console.log(token)
    const updatedUser = await User.findByIdAndUpdate(
      userId, {
        $set: {
          resetToken: token,
          resetTokenExpiration: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes in milliseconds
        },
      }
    );

    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update user data'
      });
    }

    const mailOptions = {
      to: email,
      subject: 'Password Reset Request',
      text:` Click the following link to reset your password: http://localhost:4010/reset-password/${token}`,
      html:` <p>Click the following link to reset your password:</p><p><a href="http://localhost:4010/reset-password/${token}">http://localhost:4010/reset-password/${token}</a></p>`,
    };

    await trans.sendMail(mailOptions);

    return res.status(201).json({
      message: 'Reset password link is sent successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message:` INTERNAL SERVER ERROR ${err}`
    });
  }
}



const userAddAddress = async (req, res) => {
  try {
    // Get the address data from the request body
    const {
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country
    } = req.body;

    const userId =req.session.user_id; // You can get the user's ID from the cookie or authentication system

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the user's address document
    let useraddresses = await AddressModel.findOne({ user: userId });

    if (!useraddresses) {
      // If the useraddresses document doesn't exist, create a new one
      useraddresses = new AddressModel({ user: userId, addresses: [] });
    }

    // Check if the address already exists for the user
    const existingAddress = useraddresses.addresses.find((address) =>
      address.addressType === addressType &&
      address.HouseNo === houseNo &&
      address.Street === street &&
      address.pincode === pincode &&
      address.city === city &&
      address.State === state &&
      address.Country === country
    );

    if (existingAddress) {
      return res.status(400).json({ success: false, message: 'Address already exists for this user' });
    }

    if (useraddresses.addresses.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'User cannot have more than 3 addresses',
      });
    }

    // Create a new address object
    const newAddress = {
      addressType: addressType,
      HouseNo: houseNo,
      Street: street,
      Landmark: landmark,
      pincode: pincode,
      city: city,
      district: district,
      State: state,
      Country: country,
    };

    useraddresses.addresses.push(newAddress);

    // Save the updated address document
    await useraddresses.save();

    // Respond with a success message
    res.status(200).json({ status: true, message: 'Address added successfully' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      // Handle validation errors
      return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    } else {
      console.log(err);
      res.status(500).render('500error',{ success: false, message: 'Internal Server Error' });
    }
  }
};


const userEditAddress = async(req,res)=>{
  try{
    const {
      addressType,
      HouseNo,
      Street,
      Landmark,
        pincode,
        city,
        district,
        state,
        Country
    } = req.body;

    const userId = req.session.user_id;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const addresses = await AddressModel.findOne({user:userId})
  
    if(!addresses){
      return res.status(404).json({ success: false, message: 'Addresses not found' });
    }
    
        // Find the address you want to edit based on the provided address type
        const addressToEdit = addresses.addresses.find(addr => addr.addressType === addressType);

        if (!addressToEdit) {
            return res.status(404).json({ success: false, message: `Address with type '${addressType}' not found` });
        }

        // Update the address details
        addressToEdit.HouseNo = HouseNo;
        addressToEdit.Street = Street;
        addressToEdit.Landmark = Landmark;
        addressToEdit.pincode = pincode;
        addressToEdit.city = city;
        addressToEdit.district = district;
        addressToEdit.State = state;
        addressToEdit.Country = Country;

        // Save the updated address
        await addresses.save();

        res.status(200).redirect('/profile');

  }catch(err){
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const userdeleteAddress = async(req,res)=>{
  try{
    const userId = req.session.user_id;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const addresses = await AddressModel.findOne({user:userId})
  
    if(!addresses){
      return res.status(404).json({ success: false, message: 'Addresses not found' });
    }

    const addressTypeToDelete = req.query.addressType; // Get the addressType to delete from the query parameter
     // Find the index of the address with the provided addressType
     const addressIndexToDelete = addresses.addresses.findIndex((address) => address.addressType === addressTypeToDelete);

     if (addressIndexToDelete === -1) {
      return res.status(404).json({ success: false, message: `Address with type '${addressTypeToDelete}' not found` });
  }
   // Remove the address with the specified addressType
   addresses.addresses.splice(addressIndexToDelete, 1);

   await addresses.save();

   res.status(200).json({ success: true, message: 'Address deleted successfully' });
}catch(err){
    next(err);
  }
}

const userDetailEdit = async(req,res)=>{
  try{
        const { firstName, email, gender, mobile } = req.body; // Update this based on your form field names
        // 2. Perform data validation if needed
        if (!firstName || !email || !gender || !mobile) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Add more validation as needed, e.g., email format, mobile format, etc.

        // 3. If you need to update the user's profile in your database, do it here
        // Example (assuming you're using Mongoose and have a User model):
        const userId = req.session.user_id;

        const user = await User.findById(userId); // Replace with your own logic to retrieve the user
        if(!user){
          return res.status(404).json({success:false,message:'Authentication is Required'})
        }

        // if(user.isBlocked){
        //   return res.status(409).json({success:false,message:'User is Blocked'})
        // }

        user.firstName = firstName;
        user.email = email;
        user.gender = gender;
        user.mobile = mobile;
        await user.save();

        // 4. If you need to handle file uploads (e.g., profile picture), use multer for file handling
        // Example with multer:
        // const profilePicture = req.file; // Assuming you have a file input with the name 'profilePicture'
        // const imagePath = profilePicture.path; // Store the path or URL to the image

        // 5. Send a success response
        return res.status(200).json({ success: true, message: 'Profile updated successfully' });
  }catch(err){
    console.log(err);
    next(err)
  }
}



const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const {reason} = req.body
    // Check if the order exists
    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Retrieve the products associated with the canceled order
    const canceledProducts = order.items;

    console.log(canceledProducts)
    // Increase stock counts for each canceled product
    for (const product of canceledProducts) {
      const productId = product.productId;
      const quantity = product.quantity;

      // Find the product in your database
      const productToUpdate = await Product.findById(productId);

      if (!productToUpdate) {
        return res.status(404).json({
          success: false,
          error: "Product not found for restocking",
        });
      }

      // Increase the stock count
      productToUpdate.countInStock += quantity;

      // Save the updated product
      await productToUpdate.save();
    }

 if(order.paymentMethod === 'cashOnDelivery'){
  order.status ='Canceled'
  order.requests.push({
    type: 'Cancel',
    status: 'Accepted',
    reason,
  });
  await order.save();
 }
 else{
  // Add the cancel request
  order.status ='Canceled'
    order.requests.push({
      type: 'Cancel',
      status: 'Pending',
      reason,
    });
    await order.save();
  }
    return res.json({ success: true, message: "Order canceled successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};





const usergetOrderInvoice = async (req, res) => {
  try {
    const userId = req.session.user_id;
    console.log("HELLEOOE")
      // Fetch order details from your database using the orderId
      const order = await OrderModel.findById(req.params.orderId).populate('user', 'firstName lastName email');
  
      ejs.renderFile(path.join(__dirname, '..', 'views', 'invoice.ejs'), { order }, (err, htmlContent) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error rendering the PDF');
        }
    
        (async () => {
          const browser = await puppeteer.launch();
          const page = await browser.newPage();
          await page.setContent(htmlContent);
    
          const pdfPath = path.join(__dirname,'..', 'public', `${userId}_order.pdf`);
          // await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, width: '210mm', height: '297mm', margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }, scale: 0.5 });

          await page.pdf({ path: pdfPath, format: 'A4' });
    
          await browser.close();
    
          res.setHeader('Content-Disposition', `attachment; filename=${userId}_order.pdf`);
          res.setHeader('Content-Type', 'application/pdf');
          res.sendFile(pdfPath);
        })();
      });
  } catch (err) {
      console.error(err);
      res.status(500).send('Failed to generate the invoice.');
  }
}

const orderDetails = async (req, res) => {
  try {
    // let UserExist = false;
    // if (req.cookies?.userloggedIn && req.cookies?.userloggedIn!=undefined) {
    //   UserExist = true;
    // }
    let user = (req.session.user_id)?true:false
    const category = await Category.find({status:'active'});
    const userId =  req.session.user_id;
    const orderId = req.params.orderId; // Get the order ID from URL parameters
    const itemId = req.query.product; // Get the product ID from the query string
    console.log(orderId,itemId)
    
    console.log(userId)

    // Use MongoDB aggregation to find the product and other products in the same order
    const orderDetail = await OrderModel.aggregate([
      {
          $match: {
          _id: new mongoose.Types.ObjectId(orderId), // Convert orderId to ObjectId
          user: new mongoose.Types.ObjectId(userId), 
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails._id": new mongoose.Types.ObjectId(itemId),
        },
      },
      {
       
          $addFields: {
            productDetails: {
              $mergeObjects: [
                "$productDetails",
                {
                  quantity: {
                    $reduce: {
                      input: "$items",
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          {
                            $cond: [
                              { $eq: ["$$this.productId", "$productDetails._id"] },
                              "$$this.quantity",
                              0,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
     
        
      },
      {
        $group: {
          _id: "$_id",
          order: { $first: "$$ROOT" },
        },
      },
    ]);
    

    console.log(orderDetail);
    const order = orderDetail[0].order;
    if (orderDetail.length === 0) {
      return res.status(404).json({ error: 'Product not found in this order' });
    }

    console.log(orderDetail)
   
     const userRating = await Rating.findOne({ product: itemId, 'Ratings.author': userId });
     const userReview = await ReviewModel.findOne({ product: itemId, 'reviews.author': userId });
  // // Display order details, product details, and other products
    console.log("order detail////////////////////////////////////////");
    console.log(order); // Full order details
    console.log("Review//////////////////////////////////////");
    
    // console.log(userRating,userReview)
    // Now, you can pass these variables to your template for rendering.
    res.render('userOrderDetail', {
      order,
      category,
      user,
      userRating,
      userReview
     
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const orderRatings = async (req, res) => {
  try {
    console.log("rating route")
    const { rating, productId } = req.body;
    const userId = req.session.user_id;; // Assuming you have user information in req.user

    // Check if the user has already rated the product
    const existingReview = await Rating.findOne({ product: productId, 'Ratings.author': userId });
    console.log(existingReview)
    if (existingReview) {
      // User has already rated the product, update the existing rating
      const userRating = existingReview.Ratings.find((r) => r.author.equals(userId));
      console.log(userRating)
      userRating.rating = rating;
     
      await existingReview.save();
    } else {
      // User has not rated the product, create a new rating
      const newRating = {
        author: userId,
        rating,
    
      };

      const review = new Rating({ product: productId, Ratings: [newRating] });
      await review.save();
    }

    const reviews = await Rating.find({ product: productId });
    const totalRatings = reviews.reduce((total, review) => {
      return total + review.Ratings.reduce((acc, rating) => acc + rating.rating, 0);
    }, 0);
    const averageRating = totalRatings / reviews.length;

    // Update the product's average rating
    // You need to have a Product model with an 'averageRating' field
    await Product.updateOne({ _id: productId }, { averageRating });
    res.status(201).json({message:'rating submitted sucessfully'})
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const orderReview = async (req, res) => {
  try {
    const { review, productId } = req.body;
    const userId = req.session.user_id;; // Assuming you have user information in req.user

    // Find the existing review by the user and product
    const existingReview = await ReviewModel.findOne({ product: productId, 'reviews.author': userId });

    if (existingReview) {
      // If an existing review is found, update the review content
      const userReview = existingReview.reviews.find((r) => r.author.toString() === userId);
      userReview.review = review;
      await existingReview.save();
    } else {
      // If no existing review is found, create a new review object
      const newReview = {
        author: userId,
        review,
        isPublish: true, // Assuming that the new review should be published by default
      };

      const productReview = await ReviewModel.findOne({ product: productId });

      if (productReview) {
        // If there's already a review for this product, add the new review to it
        productReview.reviews.push(newReview);
        await productReview.save();
      } else {
        // If no review exists for this product, create a new review
        const newProductReview = new ReviewModel({
          product: productId,
          reviews: [newReview],
        });
        await newProductReview.save();
      }
    }

    res.json({ message: 'Review saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
 const deleteReview= async (req, res) => {
  console.log("deletereview set")
  const reviewId = req.params.reviewId;
  const userId = req.session.user_id;; // Assuming you have access to the user's ID

  try {
    // Find the review based on the reviewId and user ID
    const review = await ReviewModel.findOne({ 'reviews._id': reviewId, 'reviews.author': userId });

    if (review) {
      // Filter out the user's review and update the reviews array
      review.reviews = review.reviews.filter(item => item._id != reviewId);
      await review.save();

      // Return a success response
      res.status(200).json({ message: "Review deleted successfully" });
    } else {
      // Return an error response if the review was not found or could not be deleted
      res.status(404).json({ message: "Review not found or could not be deleted" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


const mobileUniqueCheck = async (req, res) => {
  const mobileNumber = req.query.mobile;

  try {
      // Check if the mobile number exists in the database
      const existingUser = await User.findOne({ mobile: mobileNumber });

      // Respond with the uniqueness status
      res.json({ unique: !existingUser });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};


const userOrderDetails = async(req,res)=>{
  try{
    const ITEMS_PER_PAGE = 5; 
    let page = parseInt(req.query.pageNumber) || 1;
    const orders = await OrderModel.find({user : req.session.user_id})
                            .sort({createdAt:-1})
                            .skip((ITEMS_PER_PAGE * page) - ITEMS_PER_PAGE)
                            .limit(ITEMS_PER_PAGE)
    const totalOrders = await OrderModel.countDocuments({user :req.session.user_id});
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
    const paginationInfo = {
      currentPage: page,
      totalPages: totalPages,
    };
    console.log(orders)
    console.log(paginationInfo)
    return res.status(200).send({orders ,paginationInfo});
  }catch(err){
  res.status(500).json({success:false,message:'Some thing Causes in server'+err})
  }
}




const returnOrder = async(req,res)=>{
  try{
    const {orderId,returnReason }= req.body;
    const userId =  req.session.user_id;;
    const order = await OrderModel.findById(orderId);

    console.log(userId,order,returnReason)

    if(!order){
      return res.status(404).json({success:false,message:'order Not found in Database'})
    }
     // Check if the user making the request is the owner of the order
     if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to return this order' });
    }
      // Check if the order status allows a return
      if (order.status !== 'Delivered') {
        return res.status(400).json({ success: false, message: 'Order must be Delivered to initiate a return' });
    }
    
       // Update the order status to 'Returned'
    order.status = 'Returned';

    // Update the return request in the order
    order.requests.push({
      type: 'Return',
      status: 'Pending', // You can set it to 'Pending' initially
      reason: returnReason,
    }); 

    // Save the updated order
    await order.save();
    res.status(200).json({ success: true, message: 'Return request submitted successfully' });
}catch(err){
  console.log(err)
  res.status(500).json({ success: false, message: 'Internal Server Error' });
}
}

const userReferral = async (req, res) => {
  try{
  Referral.findOne({ userId: req.session.user_id })
      .populate('user') //Populate model with user
      .then(loggedUser => {
          //Generate random referral link
          const generatedRefLink = `${req.protocol}://${req.headers.host}/register?reflink=${loggedUser.referralLink}`

         res.status(200).json(generatedRefLink)
      })
    }catch(err){
      console.log(err);
      res.status(500).json({success:false,message:err})
    }


}
const createuserReferral = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);

    // Create a new referral
    const newReferrer = new Referral({
      referralId: uuidv4(),
      referralLink: uuidv4(),
      userId: user._id,
    });

    // Save the new referral to the database
    await newReferrer.save();

    // Update the user's refId with the new referral's _id
    user.refId = newReferrer._id;

    // Save the user with the updated refId
    await user.save();

    console.log(newReferrer);

    // Assuming generatedRefLink should be the referral link
    const generatedRefLink = `${req.protocol}://${req.headers.host}/register?reflink=${newReferrer.referralLink}`
    res.status(200).json({ success: true, referralLink: generatedRefLink });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err });
  }
};



module.exports = {
  loadRegister,
  insertUser,
  verifyMail,
  loginLoad,
  verifyLogin,
  loadHome,
  logout,
  loadOTP,

  forgotPassword ,
  forgotPasswordPost,
  resetPasswordGET,
  resetPasswordPost,
  shopUser,
  ProductDetailedView,
  postRegister,
  postVerifyOtp,
  isBlocked,
  userProfileGet,
  changePassword,
  userAddAddress,
  userdeleteAddress,
  userEditAddress,
  userDetailEdit,
  cancelOrder,
  usergetOrderInvoice,
  orderDetails,
  orderRatings,
  orderReview,
  deleteReview,
  mobileUniqueCheck,
  userOrderDetails,
  returnOrder,
  userReferral,
  createuserReferral,
  contactGet 
}