const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const authRoutes = require('./src/routes/auth');
const publicRoutes = require('./src/routes/public');
const galleryRoutes = require('./src/routes/gallery');
const menuRoutes = require('./src/routes/menu');
const pdfRoutes = require('./src/routes/pdf');
const authMiddleware = require('./src/middleware/auth');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.FRONTEND_URL || 'http://localhost:5000'
  ],
  credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
