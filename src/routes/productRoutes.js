const express = require('express');
const multer = require('multer');
const {
  getProducts,
  updateProduct,
  getHistory,
  addProduct,
  deleteProduct,
  importProducts,
  exportProducts,
  searchProducts
} = require('../controller/productController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.get('/', getProducts);
router.get('/search', searchProducts);
router.post('/add', upload.single('image'), addProduct);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/delete/:id', deleteProduct);
router.get('/:id/history', getHistory);
router.post('/import', upload.single('file'), importProducts);
router.get('/export', exportProducts);

module.exports = router;
