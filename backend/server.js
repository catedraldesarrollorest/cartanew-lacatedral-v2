const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local if it exists (local development)
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  dotenv.config({ path: '.env.local' });
}

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.FRONTEND_URL || 'http://localhost:5000',
    'https://cartanew-lacatedral-v2.vercel.app'
  ],
  credentials: true
};

app.use(cors(corsOptions));

// Serve admin panel static files
const adminPath = path.resolve(__dirname, '../public/admin');
console.log(`📁 __dirname: ${__dirname}`);
console.log(`📁 Admin path: ${adminPath}`);
console.log(`📁 Admin exists: ${fs.existsSync(adminPath)}`);

if (fs.existsSync(adminPath)) {
  app.use('/admin', express.static(adminPath));
  console.log('✅ Admin static files configured');
} else {
  console.warn('⚠️  Admin folder not found at', adminPath);
  // Still serve /admin - Express will serve empty directory
  app.use('/admin', express.static(adminPath));
}

// Import routes with error handling
let authRoutes, publicRoutes, galleryRoutes, menuRoutes, pdfRoutes;
try {
  authRoutes = require('./src/routes/auth');
  publicRoutes = require('./src/routes/public');
  galleryRoutes = require('./src/routes/gallery');
  menuRoutes = require('./src/routes/menu');
  pdfRoutes = require('./src/routes/pdf');
  console.log('✅ All routes imported successfully');
} catch (err) {
  console.error('❌ Error importing routes:', err.message);
  process.exit(1);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/menu/admin', require('./src/routes/admin-menu'));
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 API ready at http://0.0.0.0:${PORT}`);
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});
