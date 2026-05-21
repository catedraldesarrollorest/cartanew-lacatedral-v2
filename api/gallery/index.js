const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { IncomingForm } = require('formidable');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LIMITS = { local: 6, bebidas: 5, platos: 5, postres: 5 };

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

function verifyAuth(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  corsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
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
  } else if (req.method === 'POST') {
    const user = verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const form = new IncomingForm();
      const [fields, files] = await form.parse(req);

      const category = fields.category?.[0];
      if (!category || !LIMITS[category]) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const uploadedImages = [];
      const fileArray = Array.isArray(files.images) ? files.images : [files.images];

      for (const file of fileArray) {
        try {
          const buffer = fs.readFileSync(file.filepath);

          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            continue;
          }

          if (buffer.length > 5 * 1024 * 1024) {
            continue;
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
          fs.unlinkSync(file.filepath);
        }
      }

      if (uploadedImages.length === 0) {
        return res.status(400).json({ error: 'No valid images uploaded' });
      }

      res.json({ uploaded: uploadedImages });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  } else if (req.method === 'DELETE') {
    const user = verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { id } = req.query;

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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
