const express = require('express');
const PDFDocument = require('pdfkit');
const supabase = require('../services/supabaseClient');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const CATEGORY_LABELS = {
  bebidas: 'BEBIDAS',
  primeros: 'PRIMEROS',
  principales: 'PRINCIPALES',
  postres: 'POSTRES',
  espirituosos: 'ESPIRITUOSOS'
};

router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;

    const doc = new PDFDocument({ bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="CartaLaCatedral.pdf"');

    doc.pipe(res);

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('✛ LA CATEDRAL ✛', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Bar · Restaurante · Vedado', { align: 'center' });
    doc.fontSize(9).text('Desde 2013', { align: 'center' });
    doc.moveTo(100, doc.y + 5).lineTo(500, doc.y + 5).stroke();
    doc.moveDown(1);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text('CARTA COMPLETA', { align: 'center' });
    doc.moveDown(1);

    // Group items by category
    const groupedItems = {};
    menuItems.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    });

    // Render each category
    Object.keys(CATEGORY_LABELS).forEach(category => {
      const items = groupedItems[category];
      if (!items || items.length === 0) return;

      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text(CATEGORY_LABELS[category]);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      items.forEach(item => {
        const priceStr = item.price ? `CUP ${item.price.toFixed(2)}` : '';
        const name = item.name_es;

        doc.fontSize(10).font('Helvetica-Bold').text(name, 50, doc.y, { width: 450, continued: false });
        doc.fontSize(9).font('Helvetica').text(priceStr, 50, doc.y - 12, { align: 'right' });

        if (item.description_es) {
          doc.fontSize(8).font('Helvetica-Oblique').text(item.description_es, 50, doc.y + 2);
        }

        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);
    });

    // Footer
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
    doc.fontSize(9).font('Helvetica').text('Horarios:', 50, doc.y, { underline: true });
    doc.fontSize(8).text('Desayuno: 8:30 - 11:00 am', 50, doc.y);
    doc.text('Almuerzo & Cena: 12:00 - 10:00 pm', 50, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(8).text('☎ +53 7 830 0793', 50, doc.y);
    doc.text('📍 Calle 8 entre Calzada y 5ta, Vedado, La Habana, Cuba', 50, doc.y);
    doc.fontSize(7).text('Generado el ' + new Date().toLocaleDateString('es-ES'), { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

module.exports = router;
