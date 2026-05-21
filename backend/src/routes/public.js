const express = require('express');
const supabase = require('../services/supabaseClient');

const router = express.Router();

router.get('/data', async (req, res) => {
  try {
    const { data: gallery, error: galeryError } = await supabase
      .from('gallery')
      .select('*')
      .order('position', { ascending: true });

    if (galeryError) throw galeryError;

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    if (menuError) throw menuError;

    res.json({ gallery, menuItems });
  } catch (error) {
    console.error('Error fetching public data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
