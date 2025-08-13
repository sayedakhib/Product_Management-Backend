const { Parser } = require('json2csv');
const Product = require('../models/Product');

const exportCSV = async () => {
  const products = await Product.find().lean();
  if (!products.length) return null;

  const fields = ['name', 'unit', 'category', 'brand', 'stock', 'status', 'image'];
  const json2csvParser = new Parser({ fields });
  return json2csvParser.parse(products);
};

module.exports = exportCSV;
