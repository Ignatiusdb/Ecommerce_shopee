const mongoose = require('mongoose');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const mongoURI = process.env.MONGOURI;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(mongoURI, options)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
  });


  
 
const bodyParser = require("body-parser")
const express = require('express')
const app = express()
const session = require('express-session')
const Swal = require('sweetalert2');
const nocache = require('nocache')
app.use(nocache())



// mongodb+srv://Ignatius_DB:ignatiusdb@28@cluster0.khenlbq.mongodb.net/


const path = require('path');
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
// Use body-parser middleware to parse JSON and URL-encoded data
app.use(bodyParser.json()); // Parse JSON data
app.use(bodyParser.urlencoded({ extended: true }))

app.use(session({
  name: 'userSession',
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 360000000000 }
}))

const userRoute = require('./routes/userRoute')
// const user_route = require('./routes/userRoute')
app.use('/', userRoute)

const adminRoute = require('./routes/adminRoute')
var cartRouter = require('./routes/cartRoute');

app.use('/admin', adminRoute)
app.use('/home/cart', cartRouter);

app.use('*',(req,res,next)=>{
  res.render('Error')
})

app.use(errorHandler);

app.listen(4010, function () {
  console.log("server is running");
})

module.exports=app