const express = require('express');
// const Admin = require('../models/adminModel');
const Product = require('../models/productModel')
const User = require('../models/userModel')
const Category = require('../models/categoryModel')

const productManagementGet = async (req, res) => {
    try {
        let query = {};

        // Check if a category is selected for filtering
        const selectedCategory = req.query.category || ''; // Default to empty string if not provided
        if (selectedCategory) {
            query.category = selectedCategory;
        }

        const products = await Product.find(query)
            .populate('category') // Populate the 'category' field
            .lean();

        const categories = await Category.find().lean();
        
        res.render('page-products-list', { products, categories,selectedCategory, pagetitle: 'Products' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

const productCategories = async (req, res) => {
    
    try {
        const categories = await Category.find({}, 'name'); // Only fetch category names
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}



const productManagementCreate =  async (req, res) => {
        try {
            let admin = await User.findOne({email:"ignatiusdb57@gmail.com"})   //edited
            // Extract product details from the request body
            const product = new Product({
                owner: admin._id, // Adjust this based on how you handle user authentication
                name: req.body.name,
                description: req.body.description,
                image: req.files['image'][0].path.replace(/\\/g, '/').replace('public/', ''), // Assuming 'image' is the name attribute of the main image input
                images: req.files['images'].map(file => file.path.replace(/\\/g, '/').replace('public/', '')), // Assuming 'images' is the name attribute of the additional images input
                brand: req.body.brand,
                countInStock: req.body.countInStock,
                category: req.body.category, // You may need to convert this to a MongoDB ObjectId
                basePrice:req.body.price,
                price: req.body.price-((req.body.price*req.body.discount)/100),
                discount: req.body.discount,
                afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100)))

            });
           
        
            console.log(req.files );
            // Process the main image
          
    
            // Save the new product to the database
             product.save().then(async (product) => {
                // Associate the product with its category
                const category = await Category.findById(product.category);
                if (category) {
                    category.products.push(product._id);
                    await category.save();
                }
                console.log('Product saved successfully.');
            })
            .catch((error) => {
                console.error('Error saving product:', error);
            });;
    
            return res.status(201).redirect('/admin/product-management');
        } catch (error) {
            console.error('Error adding product: ' + error);
            return res.status(500).send({ error: 'Internal Server Error', errorMessage: error.message });
        }
    };



    const productManagementEdit = async (req, res) => {
        try {
            // Check if the product with the specified ID exists in the database
            const productId = req.params.Id;
            const existingProduct = await Product.findById(productId);
            if (!existingProduct) {
                return res.status(404).json({ error: 'Product not found' });
            }
    
            // Extract product details from the request body
            const {
                name,
                description,
                brand,
                countInStock,
                category,
                price,
                discount,
            } = req.body;
    
            // Initialize image and images variables
            let image = existingProduct.image;
            let images = existingProduct.images;
    
            // Check if files are provided in the request
            if (req.files) {
                // Process the main image
                if (req.files['image']) {
                    image = req.files['image'][0].path.replace(/\\/g, '/').replace('public/', '');
                }
    
                // Process additional images (if any)
                if (req.files['images']) {
                    images = req.files['images'].map((file) =>
                        file.path.replace(/\\/g, '/').replace('public/', '')
                    );
                }
            }

    
            // Update the product in the database
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    name,
                    description,
                    brand,
                    countInStock,
                    category,
                    basePrice:req.body.price,
                    price: parseInt(price)-((parseInt(price)*parseInt(discount) )/100),
                    discount: req.body.discount,
                    image,
                    images,
                },
                {
                    new: true,
                }
            );
            const updatedCategory = await Category.findById(updatedProduct.category);
            if (updatedCategory) {
                updatedCategory.products.push(updatedProduct._id);
                await updatedCategory.save();
            }
            if (!updatedProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }
    
            res.status(200).redirect('/admin/product-management');
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error', errorMessage: error.message });
        }
    };
    
      



const productManagementDelete =  async (req, res) => {
    const { productId } = req.params;

    try {
        // Find the product by ID and delete it
        const deletedProduct = await Product.findOneAndDelete({ _id: productId });

        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const productManagementPublish =  async (req, res) => {
    try {
        const productId = req.params.productId;
        const { isFeatured } = req.body;
       
        // Find the product by ID and update the isFeatured field
        const product = await Product.findByIdAndUpdate(productId, { isFeatured }, { new: true });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({ message: 'Product status updated successfully', product });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}











module.exports ={ productManagementGet,
    productManagementCreate,
    productCategories,
    productManagementEdit,
    productManagementDelete,
    productManagementPublish,
   
}