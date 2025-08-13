const Product = require('../models/Product');
const InventoryHistory = require('../models/InventoryHistory');
const importCSV = require('../utils/csvImport');
const exportCSV = require('../utils/csvExport');

// GET /api/products
exports.getProducts = async (req, res) => {
  try {
  const { page = 1, limit = 7, sort = 'name', name } = req.query;
    const query = {};

    if (name) query.name = { $regex: name, $options: 'i' };

    const products = await Product.find(query)
      .sort(sort.split(',').join(' '))
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({ total, page: parseInt(page), pages: Math.ceil(total / limit), products });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err.message });
  }
};

// GET /api/products/search?name=...
exports.searchProducts = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: 'Name query parameter is required' });
    }
    const products = await Product.find({ name: { $regex: name, $options: 'i' } });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Error searching products', error: err.message });
  }
};

// POST /api/products/add
exports.addProduct = async (req, res) => {
  try {
    const { name, unit, category, brand, stock, status, image } = req.body;

    // Validate required fields
    if (!name || !unit || !category || !brand || stock === undefined) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (isNaN(stock)) {
      return res.status(400).json({ message: 'Stock must be a number' });
    }

    // Check for duplicate name
    const existing = await Product.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Product name already exists' });
    }

    // Determine image string
    let imageString = image; // from JSON body
    if (req.file) {
      // Convert uploaded file to base64 string
      const fileData = req.file.buffer.toString('base64');
      imageString = `data:${req.file.mimetype};base64,${fileData}`;
    }

    // Create new product
    const newProduct = await Product.create({
      name,
      unit,
      category,
      brand,
      stock: Number(stock),
      status: status || (stock > 0 ? 'In Stock' : 'Out of Stock'),
      image: imageString
    });

    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ message: 'Error adding product', error: err.message });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const { name, unit, category, brand, stock, status, image, user } = req.body;

    if (stock !== undefined && isNaN(stock)) {
      return res.status(400).json({ message: 'Stock must be a number' });
    }

    if (name) {
      const existing = await Product.findOne({ name, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: 'Product name must be unique' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (stock !== undefined && stock !== product.stock) {
      await InventoryHistory.create({
        productId: product._id,
        oldQty: product.stock,
        newQty: stock,
        user: user || 'System'
      });
    }

    // Handle image update
    let imageString = image ?? product.image;
    if (req.file) {
      const fileData = req.file.buffer.toString('base64');
      imageString = `data:${req.file.mimetype};base64,${fileData}`;
    }

    product.name = name ?? product.name;
    product.unit = unit ?? product.unit;
    product.category = category ?? product.category;
    product.brand = brand ?? product.brand;
    product.stock = stock ?? product.stock;
    product.status = status ?? (product.stock > 0 ? 'In Stock' : 'Out of Stock');
    product.image = imageString;

    const updated = await product.save();
    res.json(updated);
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
};

// DELETE /api/products/delete/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully', productId: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
};

// GET /api/products/:id/history
exports.getHistory = async (req, res) => {
  try {
    const history = await InventoryHistory.find({ productId: req.params.id }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching history', error: err.message });
  }
};

// POST /api/products/import
exports.importProducts = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  let tmpPath;
  try {
    console.log('CSV Import req.file:', req.file);
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Write buffer to a temp file
    tmpPath = path.join(__dirname, '../../uploads', `${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    const result = await importCSV(tmpPath);
    res.json(result);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error importing CSV', error: err.message });
    }
  } finally {
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
    }
  }
};

// GET /api/products/export
exports.exportProducts = async (req, res) => {
  try {
    const csvData = await exportCSV();
    if (!csvData) return res.status(404).json({ message: 'No products found' });

    res.header('Content-Type', 'text/csv');
    res.attachment('products.csv');
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting CSV', error: err.message });
  }
};
