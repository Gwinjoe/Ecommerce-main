const { clearUploads } = require("../utils/clearuploads")
const Product = require("../models/productSchema");
const Category = require("../models/categorySchema");
const { uploader, uploadMultiple } = require("../middlewares/uploader");
const cloudinary = require("cloudinary").v2;
const mongoose = require('mongoose');

exports.product_count = async (req, res) => {
  const count = await Product.countDocuments({});
  res.status(200).json({ success: true, count })
}

exports.category_count = async (req, res) => {
  const count = await Category.countDocuments({});
  res.status(200).json({ success: true, count })
}


const parseNumber = (v, fallback = undefined) => {
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};


const parseDecimalToNumber = (v) => {
  if (v == null) return null;
  try {
    const s = typeof v === 'object' && typeof v.toString === 'function' ? v.toString() : String(v);
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    return null;
  }
};

exports.getPriceRange = async (req, res) => {
  try {
    const { category, brand, minRating, search } = req.query;
    const filter = {};

    if (category && mongoose.Types.ObjectId.isValid(category)) filter.category = category;
    if (brand && mongoose.Types.ObjectId.isValid(brand)) filter.brand = brand;
    if (minRating !== undefined) {
      const r = parseFloat(minRating);
      if (!Number.isNaN(r)) filter.ratings = { $gte: r };
    }
    if (search && String(search).trim().length) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { description: { $regex: String(search), $options: 'i' } }
      ];
    }

    const agg = [
      { $match: filter },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" }
        }
      }
    ];

    const result = await Product.aggregate(agg).exec();

    if (!result || result.length === 0) {
      return res.status(200).json({ success: true, data: { min: 0, max: 0 } });
    }

    const { minPrice, maxPrice } = result[0];
    const min = parseDecimalToNumber(minPrice) ?? 0;
    const max = parseDecimalToNumber(maxPrice) ?? 0;

    res.set('Cache-Control', 'public, max-age=60'); // 60s

    return res.status(200).json({ success: true, data: { min, max } });
  } catch (err) {
    console.error('getPriceRange error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      minRating
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // max 100

    const filter = {};

    if (search && String(search).trim().length) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { description: { $regex: String(search), $options: 'i' } }
      ];
    }

    if (category) filter.category = mongoose.Types.ObjectId.isValid(category) ? category : category;
    if (brand) filter.brand = mongoose.Types.ObjectId.isValid(brand) ? brand : brand;

    const minP = parseNumber(minPrice);
    const maxP = parseNumber(maxPrice);
    if (minP !== undefined || maxP !== undefined) {
      filter.price = {};
      if (minP !== undefined) filter.price.$gte = minP;
      if (maxP !== undefined) filter.price.$lte = maxP;
    }

    const minR = parseNumber(minRating);
    if (minR !== undefined) {
      filter.ratings = { $gte: minR };
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort(sort)                        // allow client to pass -price, price, createdAt etc.
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('category')
      .populate('brand')
      .lean()
      .exec();

    res.set('Cache-Control', 'public, max-age=30'); // 30s cache for simple scale

    return res.status(200).json({
      success: true,
      data: products,
      meta: {
        total,
        page: pageNum,
        limit: perPage,
        pages: Math.ceil(total / perPage)
      }
    });
  } catch (err) {
    console.error('getProducts error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Optional helper endpoint:
 * GET /api/products/count
 * Returns only total matching count for given filters (useful to pre-render pagination).
 */
exports.getProductsCount = async (req, res) => {
  try {
    const { search, category, brand, minPrice, maxPrice, minRating } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: String(search), $options: 'i' } },
      { description: { $regex: String(search), $options: 'i' } }
    ];
    if (category) filter.category = mongoose.Types.ObjectId.isValid(category) ? category : category;
    if (brand) filter.brand = mongoose.Types.ObjectId.isValid(brand) ? brand : brand;

    const minP = parseNumber(minPrice);
    const maxP = parseNumber(maxPrice);
    if (minP !== undefined || maxP !== undefined) {
      filter.price = {};
      if (minP !== undefined) filter.price.$gte = minP;
      if (maxP !== undefined) filter.price.$lte = maxP;
    }

    const minR = parseNumber(minRating);
    if (minR !== undefined) filter.ratings = { $gte: minR };

    const total = await Product.countDocuments(filter);
    res.set('Cache-Control', 'public, max-age=30');
    return res.status(200).json({ success: true, total });
  } catch (err) {
    console.error('getProductsCount error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
exports.get_categories = async (req, res) => {
  try {
    const data = await Category.find();
    if (!data) {
      return res.status(401).json({ success: false, message: "No Category Found!" });
    }
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err) {
      console.log(err)
    }
  }
}

exports.get_category_by_id = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Category.findById(id);
    if (!result) {
      return res.status(401).json({ success: false, message: "No Category matches that id" });
    }

    res.status(201).json({ success: true, result })
  } catch (err) {
    if (err) console.log(err)
  }
}

exports.add_category = async (req, res) => {
  const { name, description } = req.body;
  try {

    const existingCategory = await Category.findOne({ name })

    if (existingCategory) {
      console.log("category already exists")
      return res.status(401).json({ success: false, message: "Category already exists!" })
    }
    const newCategory = await new Category({
      name,
      description
    })

    const result = await newCategory.save();
    res.status(201).json({ success: true, message: "Your category has been created successfuly", result });
  } catch (error) {
    console.log(error)
  }
}

exports.edit_category = async (req, res) => {
  const { id, name, description } = req.body;
  try {
    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
      return res.status(401).json({ success: false, message: "Cannot find category" });
    }

    if (name) {
      existingCategory.name = name;
    }

    if (description) {
      existingCategory.description = description;
    }

    const results = await existingCategory.save();
    res.status(201).json({ success: true, results })
  } catch (err) {
    if (err) console.log(err)
  }
}


exports.delete_category = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Category.findByIdAndDelete(id);
    if (!result) {
      return res.status(401).json({ success: false, message: "couldn't find and Delete the resource you are looking for" });
    }
    res.status(201).json({ success: true, message: "resource Deleted!" });
  } catch (err) {
    if (err) console.log(err)
  }
}



exports.add_product = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      brand,
      productDetails,
      keyFeatures,
      whatsInBox
    } = req.body;

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(401).json({ success: false, message: "Product already Exists!" });
    }
    // Parse array fields
    const featuresArray = JSON.parse(keyFeatures || '[]');
    const whatsInBoxArray = JSON.parse(whatsInBox || '[]');

    // Validate required fields
    if (!name || !price || !category || !stock) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }
    // Get uploaded files
    const mainImageFile = req.files.mainImage[0];
    const thumbnailFiles = req.files.thumbnails;
    let paths = []
    thumbnailFiles.forEach((file) => {
      paths.push(file.path);
    })

    const mainImageCloudinary = await uploader(mainImageFile.path);

    const thumbnailsCloudinary = await uploadMultiple(paths);



    // Create new product
    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      brand,
      stock: parseInt(stock),
      keyFeatures: featuresArray,
      whatsInBox: whatsInBoxArray,
      productDetails,
      images: {
        mainImage: mainImageFile ? {
          url: mainImageCloudinary.url,
          publicId: mainImageCloudinary.publicId,
        } : {},
        thumbnails: thumbnailsCloudinary.map(file => ({
          url: file.url,
          publicId: file.publicId,
        }))
      }
    });

    // Save to database
    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully!",
      product: savedProduct
    });
    clearUploads();
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}

exports.delete_product = async (req, res) => {
  try {
    const productId = req.params.id;

    // Find product to get image public IDs
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete images from Cloudinary
    const publicIds = [];

    // Add main image public ID if exists
    if (product.images.mainImage && product.images.mainImage.publicId) {
      publicIds.push(product.images.mainImage.publicId);
    }

    // Add thumbnail public IDs
    product.images.thumbnails.forEach(thumbnail => {
      if (thumbnail.publicId) {
        publicIds.push(thumbnail.publicId);
      }
    });

    // Delete all images at once
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    // Delete product from database
    await Product.findByIdAndDelete(productId);

    res.json({
      success: true,
      message: 'Product and associated images deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion'
    });
  }
}



exports.get_product_by_id = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Product.findById(id).populate("category");
    if (!result) {
      return res.status(401).json({ success: false, message: "No Product matches that id" });
    }

    res.status(201).json({ success: true, result })

  } catch (err) {
    if (err) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error"
      })
    }
  }
}

exports.edit_product = async (req, res) => {
  const { id, name,
    description,
    price,
    category,
    stock,
    productDetails,
    keyFeatures,
    whatsInBox } = req.body;
  try {
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(401).json({ success: false, message: "Cannot find product" });
    }

    if (name) {
      existingProduct.name = name;
    }

    if (description) {
      existingProduct.description = description;
    }

    if (price) {
      existingProduct.price = parseFloat(price);
    }

    if (category) {
      existingProduct.category = category;
    }

    if (stock) {
      existingProduct.stock = parseInt(stock);
    }
    if (productDetails) {
      existingProduct.productDetails = productDetails;
    }

    if (keyFeatures) {
      existingProduct.keyFeatures = JSON.parse(keyFeatures);
    }

    if (whatsInBox) {
      existingProduct.whatsInBox = JSON.parse(whatsInBox);
    }

    const mainImageFile = req.files.mainImage ? req.files.mainImage[0] : undefined;
    const thumbnailFiles = req.files.thumbnails ? req.files.thumbnails : undefined;

    const publicIds = [];

    if (mainImageFile && existingProduct.images.mainImage && existingProduct.images.mainImage.publicId) {
      publicIds.push(existingProduct.images.mainImage.publicId);
    }

    existingProduct.images.thumbnails.forEach(thumbnail => {
      if (thumbnailFiles && thumbnail.publicId) {
        publicIds.push(thumbnail.publicId);
      }
    });

    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    let paths = []
    if (thumbnailFiles) {
      thumbnailFiles.forEach((file) => {
        paths.push(file.path);
      })
    }

    if (mainImageFile && !undefined) {
      const mainImageCloudinary = await uploader(mainImageFile.path);
      existingProduct.images.mainImage = mainImageCloudinary;
    }

    if (thumbnailFiles && !undefined) {
      const thumbnailsCloudinary = await uploadMultiple(paths);
      existingProduct.images.thumbnails = thumbnailsCloudinary;
    }

    const results = await existingProduct.save();
    res.status(201).json({ success: true, message: "Product updated succesfully", results })
    clearUploads();
  } catch (err) {
    if (err) console.log(err)
  }

}


exports.editMultipleProducts = async (req, res) => {
  const { selectedIds, category } = req.body;
  try {
    const productIds = selectedIds || [];
    for (const id of productIds) {
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(401).json({ success: false, message: "Couldn't find resources to be updated" });
      }

      if (!category) {
        return res.status(401).json({ success: false, message: "Invalid category Id" });
      }

      existingProduct.category = category;
      await existingProduct.save();
    }
    res.status(201).json({ success: true, message: "Selected item category updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.delete_multiple_products = async (req, res) => {
  console.log(req.body);
  const { selectedIds } = req.body;
  try {
    const productIds = selectedIds || [];
    for (const id of productIds) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const publicIds = []

      if (product.images.mainImage && product.images.mainImage.publicId) {
        publicIds.push(product.images.mainImage.publicId);
      }

      product.images.thumbnails.forEach(thumbnail => {
        if (thumbnail.publicId) {
          publicIds.push(thumbnail.publicId);
        }
      });

      if (publicIds.length > 0) {
        await cloudinary.api.delete_resources(publicIds);
      }
      const result = await Product.findByIdAndDelete(id);
      if (!result) {
        return res.status(401).json({ success: false, message: "Couldn't find resource to be deleted" });
      }
    }
    res.status(201).json({ success: true, message: "Selected Items Deleted!" });
  } catch (err) {
    if (err) {
      console.log(err)
      res.status(500).json({ success: false, message: "Internal Server Error" })
    }
  }

}
