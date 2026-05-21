const express = require('express');
const supabase = require('../services/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const CATEGORIES = ['bebidas', 'primeros', 'principales', 'postres', 'espirituosos'];

// GET - obtener items del menú
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('menu_items').select('*').eq('is_available', true);

    if (category && CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }

    const { data, error } = await query
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// POST - crear nuevo item
router.post('/', requireAuth, async (req, res) => {
  if (!requireAuth(req, res)) return;
  
  try {
    const { name_es, name_en, description_es, description_en, category, price } = req.body;

    if (!name_es || !name_en || !category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    const { data: lastItem } = await supabase
      .from('menu_items')
      .select('position')
      .eq('category', category)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = lastItem && lastItem.length > 0 ? lastItem[0].position + 1 : 1;

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        name_es,
        name_en,
        description_es: description_es || null,
        description_en: description_en || null,
        category,
        price: price ? parseFloat(price) : null,
        position: nextPosition,
        is_available: true
      })
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT - actualizar item
router.put('/:id', requireAuth, async (req, res) => {
  if (!requireAuth(req, res)) return;
  
  try {
    const { id } = req.params;
    const { name_es, name_en, description_es, description_en, category, price, is_available } = req.body;

    const updateData = {};
    if (name_es !== undefined) updateData.name_es = name_es;
    if (name_en !== undefined) updateData.name_en = name_en;
    if (description_es !== undefined) updateData.description_es = description_es;
    if (description_en !== undefined) updateData.description_en = description_en;
    if (category !== undefined && CATEGORIES.includes(category)) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (is_available !== undefined) updateData.is_available = is_available;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE - eliminar item
router.delete('/:id', requireAuth, async (req, res) => {
  if (!requireAuth(req, res)) return;
  
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;
