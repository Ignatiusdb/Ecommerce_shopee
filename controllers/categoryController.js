const Category = require('../models/categoryModel');
const database = require('../models/userModel');
const products = require('../models/productModel')
const multer = require('multer');
const Product = require('../models/productModel');

const categoryManagementGet = async (req, res) => {

  try {

    const categories = await Category.find(); // Fetch all categories from the database

    // Pass the categories to the view
    res.render('page-categories', {
      pagetitle: 'Category',
      categories: categories, // Pass the categories to the view
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Internal Server Error');
  }
}





const categoryManagementCreate = async (req, res) => {
  try {
    const { name, description, discount } = req.body;
    let image = null
    if (req.file) {
      image = req.file.path.replace(/\\/g, '/').replace('public/', '');
    }
    // const image = req.file ? req.file.buffer.toString('base64') : null; // Store image as base64 string

    // Check if the category already exists (case-insensitive search)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") }
    });

    if (existingCategory) {
      return res.status(409).redirect('/admin/category-management');
    }
    const category = new Category({
      name,
      description,
      image,
      discount
    });

    await category.save();
    if (category.discount > 1) {
      let products = await Product.find({ category: category._id })
      products.forEach(async (product) => {
        await Product.findByIdAndUpdate(product._id, { $set: { discount: category.discount, price: (product.basePrice - ((product.basePrice * category.discount)/100)) } })
      })
    }
    res.status(201).redirect('/admin/category-management');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
const categoryManagementEdit = async (req, res) => {
  try {
    const { editName, editDescription, discount } = req.body;
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    // Update name and description
    category.name = editName;
    category.description = editDescription;
    category.discount = discount

    // Update image if a new one is uploaded
    if (req.file) {
      // Replace backslashes with forward slashes and remove 'public/' from the path
      const newImage = req.file.path.replace(/\\/g, '/').replace('public/', '');
      category.image = newImage;
    }
    await category.save();
    // Calculate discounted price
    if (category.discount > 1) {
      let products = await Product.find({ category: category._id })
      products.forEach(async (product) => {
        let discountedPrice = product.basePrice - (product.basePrice * category.discount/100)
        await Product.findByIdAndUpdate(product._id, { $set: { discount: category.discount, price:  discountedPrice} })
      })
    }



    res.status(200).redirect('/admin/category-management');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}


const categoryManagementDelete = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Find the category by ID and delete it
    // const products = await products.updateMany({ category: categoryId }, { $set: { isFeatured: false } });
    const result = await Category.deleteOne({ _id: categoryId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    // Update associated products to unpublish them
    await products.updateMany({ category: categoryId }, { isFeatured: false });

    // Assuming 'products' is a model representing products, initialize it.
    // const Product = require('../models/productModel');



    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

const categoryManagementUnlist = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    category.status = category.status === 'active' ? 'unlisted' : 'active';
    await category.save()
      .then(() => res.status(200).json({ message: 'Category unlisted Successfully' }))
      .catch((err) => {
        console.log(err);
        res.status(500).json({ message: 'Error while saving category' });
      });

  } catch (error) {
    console.log("Error", error);
    return res.status(500).json({ message: error })
  }
}



module.exports = {
  categoryManagementCreate,
  categoryManagementGet,
  categoryManagementEdit,
  categoryManagementDelete,
  categoryManagementUnlist
}
