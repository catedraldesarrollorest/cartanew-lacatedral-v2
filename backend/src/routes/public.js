const express = require('express');
const supabase = require('../services/supabaseClient');

const router = express.Router();

router.get('/data', async (req, res) => {
  try {
    const { data: menu, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true);

    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .select('*');

    if (menuError || galleryError) throw new Error('Database error');

    res.json({ menu, gallery });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
