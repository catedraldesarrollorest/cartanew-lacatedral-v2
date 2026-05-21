const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const supabase = require('../services/supabaseClient');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const LIMITS = { local: 6, bebidas: 5, platos: 5, postres: 5 };

// GET all gallery images by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('gallery').select('*');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('position', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// POST upload images
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    const { category } = req.body;

    if (!category || !LIMITS[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadedImages = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        fs.unlinkSync(file.path);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        fs.unlinkSync(file.path);
        continue;
      }

      try {
        const filename = `${uuidv4()}.jpg`;
        const filepath = `gallery/${category}/${filename}`;

        const optimizedBuffer = await sharp(file.path)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        const { error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(filepath, optimizedBuffer, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('gallery')
          .getPublicUrl(filepath);

        // Get next position
        const { data: existingImages } = await supabase
          .from('gallery')
          .select('position')
          .eq('category', category)
          .order('position', { ascending: false })
          .limit(1);

        const nextPosition = existingImages && existingImages.length > 0
          ? existingImages[0].position + 1
          : 1;

        if (nextPosition > LIMITS[category]) {
          await supabase.storage.from('gallery').remove([filepath]);
          continue;
        }

        const { data: insertedImage, error: insertError } = await supabase
          .from('gallery')
          .insert({
            category,
            position: nextPosition,
            image_url: publicUrl.publicUrl
          })
          .select();

        if (insertError) throw insertError;

        uploadedImages.push(insertedImage[0]);
      } finally {
        fs.unlinkSync(file.path);
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: 'No valid images uploaded' });
    }

    res.json({ uploaded: uploadedImages });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// PUT reorder images
router.put('/reorder', authMiddleware, async (req, res) => {
  try {
    const { category, imageIds } = req.body;

    if (!category || !Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    for (let i = 0; i < imageIds.length; i++) {
      await supabase
        .from('gallery')
        .update({ position: i + 1 })
        .eq('id', imageIds[i]);
    }

    res.json({ message: 'Reordered successfully' });
  } catch (error) {
    console.error('Error reordering:', error);
    res.status(500).json({ error: 'Reorder failed' });
  }
});

// DELETE image
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: image, error: fetchError } = await supabase
      .from('gallery')
      .select('image_url, category, position')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const filepath = image.image_url.split('/storage/v1/object/public/gallery/')[1];
    await supabase.storage.from('gallery').remove([`gallery/${filepath}`]);

    await supabase.from('gallery').delete().eq('id', id);

    // Reorder remaining images
    const { data: remainingImages } = await supabase
      .from('gallery')
      .select('id')
      .eq('category', image.category)
      .order('position', { ascending: true });

    for (let i = 0; i < remainingImages.length; i++) {
      await supabase
        .from('gallery')
        .update({ position: i + 1 })
        .eq('id', remainingImages[i].id);
    }

    res.json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
