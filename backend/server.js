console.log('🚀 Starting La Catedral Backend...');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local if it exists (local development)
try {
  if (fs.existsSync(path.join(__dirname, '.env.local'))) {
    dotenv.config({ path: '.env.local' });
  }
} catch (e) {
  console.warn('⚠️  Could not load .env.local');
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

// Health check - FIRST route, no dependencies
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Serve admin panel static files
try {
  const adminPath = path.resolve(__dirname, '../public/admin');
  if (fs.existsSync(adminPath)) {
    app.use('/admin', express.static(adminPath));
    console.log('✅ Admin static files served from:', adminPath);
  } else {
    console.warn('⚠️  Admin folder not found:', adminPath);
  }
} catch (e) {
  console.warn('⚠️  Error setting up admin static files:', e.message);
}

// Import routes - with graceful degradation
try {
  const authRoutes = require('./src/routes/auth');
  const publicRoutes = require('./src/routes/public');
  const galleryRoutes = require('./src/routes/gallery');
  const menuRoutes = require('./src/routes/menu');
  const adminMenuRoutes = require('./src/routes/admin-menu');
  const pdfRoutes = require('./src/routes/pdf');

  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/menu/admin', adminMenuRoutes);
  app.use('/api/pdf', pdfRoutes);

  console.log('✅ All API routes loaded');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
  console.error(err.stack);
}

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ LA CATEDRAL BACKEND RUNNING      ║');
    console.log(`║   Port: ${String(PORT).padEnd(33)}║`);
    console.log('║   Health: GET /health                  ║');
    console.log('║   Admin: GET /admin                    ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
  });

  server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    setTimeout(() => process.exit(1), 1000);
  });
} catch (err) {
  console.error('❌ Failed to start server:', err.message);
  console.error(err.stack);
  setTimeout(() => process.exit(1), 1000);
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️  Unhandled Rejection:', reason);
});
