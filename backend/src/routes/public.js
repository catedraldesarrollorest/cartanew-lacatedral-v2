const express = require('express');
const supabase = require('../services/supabaseClient');

const router = express.Router();

router.get('/data', async (req, res) => {
  try {
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .select('*')
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    if (menuError || galleryError) throw new Error('Database error');

    res.json({ menuItems, gallery });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
