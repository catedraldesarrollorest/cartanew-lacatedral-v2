const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_LABELS = {
  bebidas: 'BEBIDAS',
  primeros: 'PRIMEROS',
  principales: 'PRINCIPALES',
  postres: 'POSTRES',
  espirituosos: 'ESPIRITUOSOS'
};

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

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
}
