const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  try {
    const indexPath = path.join(__dirname, '../www/index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
};
