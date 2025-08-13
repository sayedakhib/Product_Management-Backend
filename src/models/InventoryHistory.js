const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  oldQty: { type: Number, required: true },
  newQty: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  user: { type: String, required: true }
});

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);
