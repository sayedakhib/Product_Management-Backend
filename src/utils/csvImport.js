const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const Product = require('../models/Product');

// Helper: download image URL and convert to base64
const urlToBase64 = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error fetching image from URL: ${url}`, error.message);
    return '';
  }
};


const importCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        console.log('Parsed row:', row);
        rows.push(row);
      })
      .on('end', async () => {
        const productsToInsert = [];
        const skipped = [];
        for (let row of rows) {
          let { name, unit, category, brand, stock, status, image } = row;
          if (name && unit && category && brand && stock) {
            stock = Number(stock);
            // Convert image to base64 if needed
            if (image && !image.startsWith('data:image')) {
              if (image.startsWith('http')) {
                image = await urlToBase64(image);
              }
            }
            productsToInsert.push({ name, unit, category, brand, stock, status, image });
          } else {
            console.log('Skipped row (missing required fields):', row);
          }
        }
        let addedCount = 0;
        for (const prod of productsToInsert) {
          const exists = await Product.findOne({ name: prod.name });
          if (exists) {
            skipped.push(prod.name);
          } else {
            await Product.create(prod);
            addedCount++;
          }
        }
        fs.unlinkSync(filePath);
        resolve({ added: addedCount, skippedCount: skipped.length, skipped });
      })
      .on('error', reject);
  });
};

module.exports = importCSV;