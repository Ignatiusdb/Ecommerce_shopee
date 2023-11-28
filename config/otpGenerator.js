const nodemailer = require('nodemailer');
require('dotenv').config({path:'config.env'});

let trans = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user:  'ignatiusdb57@gmail.com',
      pass: 'bdpkjaneofaysszr'
    },
  });


    
module.exports = { trans }