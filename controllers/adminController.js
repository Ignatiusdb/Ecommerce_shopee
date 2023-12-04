const  Admin  = require('../models/adminModel')
const User = require('../models/userModel')
const bcrypt = require('bcryptjs');
const {storage , upload} = require('../config/multerConfig');
let { salesData } = require('./adminOrderManagement');
const OrderModel = require('../models/OrderModel');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const loadLogin = async (req, res) => {
    try {
        if(req.session.isAdmin){
            res.redirect('/admin/home');
        }else{
            res.render("login")
        }
        
    } catch (error) {
        console.log(error.message);
    }
}

const adminSignupPost = async (req, res) => {
    try {
      const { firstName, lastName, email, mobile, password } = req.body;
  
      // Check if an admin with the same email already exists
      const existingAdmin = await Admin.findOne({ email });
  
      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin with this email already exists. Please login again.' });
      }
  
      // Create a new admin instance
      const newAdmin = new Admin({
        name: `${firstName} ${lastName}`,
        email,
        mobile,
        password,
      });
  
      // Save the admin to the database
      const savedAdmin = await newAdmin.save();
  
      res.status(201).json(savedAdmin); // Respond with the saved admin data
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
  


const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password

        const userData = await Admin.findOne({ email: email })
        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password)

            if (passwordMatch) {

                if (userData.is_admin === 0) {
                    res.render('login', { message: 'email and password incorrect' })
                }
                else {
                    req.session.isAdmin = userData
                    res.redirect('/admin/home')

                }

            } else {
                res.render('login', { message: 'email and password incorrect' })
            }

        }
        else {
            res.render('login', { message: 'email and password incorrect' })
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loadDashboard = async (req, res,next) => {
    try {
        let orders = await OrderModel.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name')
        let daily = await salesData(0)
        let weekly = await salesData(-7)
        let monthly = await salesData(-30)
        let yearly = await salesData(-365)
        let userData = await Admin.findById({ _id: req.session.isAdmin._id })
        res.render('dashboard', { admin: userData,daily,weekly,monthly,yearly,orders })
    } catch (error) {
        // Pass the error to the error handling middleware
        error.adminError = true;
        next(error);
    }
}

const downloadPdf= async (req, res) => {

    try {
      // Obtain the sales data for the desired period (e.g., daily)
      
      let salesDatas = null // Change the parameter based on the desired period
    
      if(req.query.type === 'daily') {
        console.log("jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj")
        salesDatas = await salesData(-1)
        console.log(salesDatas)
      } else if (req.query.type === 'weekly') {

        salesDatas = await salesData(-7)
    }else if (req.query.type === 'monthly') {
        salesDatas = await salesData(-30)
    }else if (req.query.type === 'monthly') {
        salesDatas = await salesData(-365)
    }
      let doc = new PDFDocument();
  
      // Set response headers for the PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
  
      // Pipe the PDF content to the response
      doc.pipe(res);
  
      // Add content to the PDF
      doc.fontSize(20).text('Sales Report', { align: 'center' });
  
      // Insert sales data into the PDF
      doc.fontSize(12).text(`Total Revenue: ₹${salesDatas.totalRevenue}`);
      doc.text(`Total Sold: ${salesDatas.totalSold}`);
      doc.text(`Total Stock: ${salesDatas.totalStock}`);
      doc.text(`Initial Stock: ${salesDatas.initialStock}`);
      doc.text(`Average Sales: ${salesDatas.averageSales.toFixed(2)}%`);
      doc.text(`Average Orders: ${salesDatas.averageOrders.toFixed(2)}%`);
  
      // End the document and send it to the client
      doc.end();
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Error generating PDF.');
    }
  };

  const generateExcel = async(req,res,next) => {
    try {
        const salesDatas = await salesData(0);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
            { header: 'Total Sold', key: 'totalSold', width: 15 },
            { header: 'Total Stock', key: 'totalStock', width: 15 },
            { header: 'Initial Stock', key: 'initialStock', width: 15 },
            { header: 'Average Sales', key: 'averageSales', width: 15 },
            { header: 'Average Orders', key: 'averageOrders', width: 15 },
        ];

        worksheet.addRow({
            totalRevenue: salesDatas.totalRevenue,
            totalSold: salesDatas.totalSold,
            totalStock: salesDatas.totalStock,
            initialStock: salesDatas.initialStock,
            averageSales: salesDatas.averageSales.toFixed(2),
            averageOrders: salesDatas.averageOrders.toFixed(2),
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        workbook.xlsx.write(res).then(() => res.end());
    } catch (error) {
        console.log(error);
      return  res.status(500).send('Error generating Excel file.');
    }
};

const logout = async (req, res) => {
    try {   
        req.session.destroy()
        res.redirect('/admin')

    } catch (error) {
        console.log(error.message);
    }
}

const adminDashboard = async (req, res,next) => {
    try {
        res.render('dashboard')
    } catch (error) {
        // Pass the error to the error handling middleware
        error.adminError = true;
        next(error);
    }
}
const usersList = async (req, res,next) => {
    try {
        const userData = await User.find()
        res.render('users', { userData, pagetitle: "Users" })
    } catch (error) {
        // Pass the error to the error handling middleware
        error.adminError = true;
        next(error);
    }
}

const userBlock = async (req, res) => {
    const userId = req.params.Id;
    try {
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send('User not found');
        }
        console.log(user);
        if (user.isBlocked === false) {
            user.isBlocked = true;
        } else {
            user.isBlocked = false;
        }
        await user.save();
        console.log(user);
        res.status(200).redirect('/admin/users');

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Error updating user');
    }
}




module.exports = {
    adminSignupPost,
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    adminDashboard,
    usersList,
    userBlock,
    downloadPdf,
    generateExcel
   
}