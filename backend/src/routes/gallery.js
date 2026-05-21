const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const supabase = require('../services/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: '/tmp' });

const LIMITS = { local: 6, bebidas: 5, platos: 5, postres: 5 };

// GET - obtener imágenes
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
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// POST - subir imágenes
router.post('/', requireAuth, upload.single('images'), async (req, res) => {
  if (!requireAuth(req, res)) return;
  
  try {
    const { category } = req.body;
    if (!category || !LIMITS[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const buffer = fs.readFileSync(file.path);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Invalid file type' });
    }

    if (buffer.length > 5 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'File too large' });
    }

    const optimizedBuffer = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const filename = `${uuidv4()}.jpg`;
    const filepath = `gallery/${category}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(filepath, optimizedBuffer, { contentType: 'image/jpeg' });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
      .from('gallery')
      .getPublicUrl(filepath);

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
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Category limit reached' });
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
    fs.unlinkSync(file.path);
    res.json({ uploaded: insertedImage[0] });
  } catch (error) {
    console.error('Error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE - eliminar imagen
router.delete('/:id', requireAuth, async (req, res) => {
  if (!requireAuth(req, res)) return;
  
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
    console.error('Error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
