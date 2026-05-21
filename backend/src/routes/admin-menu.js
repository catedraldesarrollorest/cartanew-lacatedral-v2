const express = require('express');
const supabase = require('../services/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET - obtener TODOS los items (no solo disponibles)
router.get('/all', requireAuth, async (req, res) => {
  if (!requireAuth(req, res)) return;
  
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

module.exports = router;
