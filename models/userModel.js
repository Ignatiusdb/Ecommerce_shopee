const mongoose= require('mongoose')
const bcrypt=require('bcrypt')
require('dotenv').config();

// module.exports=mongoose.connect('mongodb://127.0.0.1:27017/projectNew')

const userSchema =mongoose.Schema({
    profile:{
        type:String,

    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:Number,
        required:true
    },
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet', // Reference to the 'Wallet' model
    },
    password:{
        type:String,
        required:true
    },
    is_admin:{
        type:Number,
        required:true,
        default:0
    },
    is_verified:{
        type:Number,
        default:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    otp:{
        code:String,
        expiresat:Date
    },
    resetToken:{
        type:String,

    },
resetTokenExpiration:{
    type:Date,
},
tokens: [{
    token: {
    type: String,
    
      }
    }]
  }, {
  timestamps: true

})
userSchema.pre('save', async function(next) {
    const user = this;
    if (user.isModified('password')) {
        console.log(user.password)
        user.password = await bcrypt.hash(user.password, 10);
        console.log(user.password)
    }

    // Call next to continue with the saving process
    next();
});
// Static method to find a user by credentials
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Unable to log in');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Unable to login');
    }
    return user;
};
let User = mongoose.model('users',userSchema)

module.exports = User;
