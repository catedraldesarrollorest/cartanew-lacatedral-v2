const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  try {
    // Try different possible locations for index.html
    const possiblePaths = [
      path.join(__dirname, '../index.html'),
      path.join(process.cwd(), 'index.html'),
      '/var/task/index.html',
      path.join(__dirname, '../../index.html'),
      path.join(__dirname, '../www/index.html'),
    ];

    let html = null;
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          html = fs.readFileSync(filePath, 'utf-8');
          console.log('Found index.html at:', filePath);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!html) {
      throw new Error('index.html not found');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ error: 'Not found' });
  }
};
