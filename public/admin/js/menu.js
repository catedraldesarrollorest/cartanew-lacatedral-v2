let allMenuItems = [];
let editingProductId = null;

async function loadMenu() {
  try {
    const response = await fetch(`${API_URL}/api/menu/admin/all`, {
      headers: getAuthHeader()
    });

    if (!response.ok) throw new Error('Failed to load menu');

    allMenuItems = await response.json();
    renderMenuTable();
  } catch (error) {
    console.error('Error loading menu:', error);
    alert('Error al cargar el menú');
  }
}

function renderMenuTable() {
  const tbody = document.getElementById('menuTableBody');
  tbody.innerHTML = '';

  const categoryOrder = ['bebidas', 'primeros', 'principales', 'postres', 'espirituosos'];
  const categoryLabels = {
    bebidas: 'Bebidas',
    primeros: 'Primeros',
    principales: 'Principales',
    postres: 'Postres',
    espirituosos: 'Espirituosos'
  };

  // Group by category
  const grouped = {};
  categoryOrder.forEach(cat => grouped[cat] = []);
  allMenuItems.forEach(item => {
    if (grouped[item.category]) {
      grouped[item.category].push(item);
    }
  });

  // Render each category
  Object.keys(grouped).forEach(category => {
    const items = grouped[category];
    if (items.length === 0) return;

    // Category header
    const headerRow = document.createElement('tr');
    headerRow.className = 'category-header';
    headerRow.innerHTML = `<td colspan="5">${categoryLabels[category]}</td>`;
    tbody.appendChild(headerRow);

    // Items
    items.forEach(item => {
      const row = document.createElement('tr');
      row.className = !item.is_available ? 'unavailable' : '';
      row.innerHTML = `
        <td>
          <strong>${item.name_es}</strong><br>
          <small>${item.name_en}</small>
        </td>
        <td>${categoryLabels[item.category]}</td>
        <td>CUP ${item.price ? item.price.toFixed(2) : '-'}</td>
        <td>
          <input type="checkbox" ${item.is_available ? 'checked' : ''}
            onchange="toggleProductAvailability('${item.id}', this.checked)">
        </td>
        <td class="actions">
          <button class="btn-edit" onclick="editProduct('${item.id}')">✏️</button>
          <button class="btn-delete" onclick="deleteProduct('${item.id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  });
}

function openProductModal() {
  editingProductId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo Producto';
  document.getElementById('productForm').reset();
  document.getElementById('productModal').classList.add('active');
}

function editProduct(productId) {
  const product = allMenuItems.find(p => p.id === productId);
  if (!product) return;

  editingProductId = productId;
  document.getElementById('modalTitle').textContent = 'Editar Producto';
  document.getElementById('productId').value = productId;
  document.getElementById('productNameEs').value = product.name_es;
  document.getElementById('productNameEn').value = product.name_en;
  document.getElementById('productDescEs').value = product.description_es || '';
  document.getElementById('productDescEn').value = product.description_en || '';
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productPrice').value = product.price || '';
  document.getElementById('productAvailable').checked = product.is_available;

  document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  editingProductId = null;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const data = {
    name_es: document.getElementById('productNameEs').value,
    name_en: document.getElementById('productNameEn').value,
    description_es: document.getElementById('productDescEs').value || null,
    description_en: document.getElementById('productDescEn').value || null,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value) || null,
    is_available: document.getElementById('productAvailable').checked
  };

  try {
    let response;

    if (editingProductId) {
      // Update
      response = await fetch(`${API_URL}/api/menu/${editingProductId}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });
    } else {
      // Create
      response = await fetch(`${API_URL}/api/menu`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });
    }

    if (!response.ok) throw new Error('Failed to save product');

    await loadMenu();
    closeProductModal();
  } catch (error) {
    alert('Error al guardar: ' + error.message);
  }
}

async function deleteProduct(productId) {
  const product = allMenuItems.find(p => p.id === productId);
  if (!product) return;

  if (!confirm(`¿Estás seguro que deseas eliminar "${product.name_es}"?`)) return;

  try {
    const response = await fetch(`${API_URL}/api/menu/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (!response.ok) throw new Error('Failed to delete product');

    await loadMenu();
  } catch (error) {
    alert('Error al eliminar: ' + error.message);
  }
}

async function toggleProductAvailability(productId, isAvailable) {
  try {
    const response = await fetch(`${API_URL}/api/menu/${productId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ is_available: isAvailable })
    });

    if (!response.ok) throw new Error('Failed to update');

    await loadMenu();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function downloadPDF() {
  try {
    const response = await fetch(`${API_URL}/api/pdf/export`, {
      headers: getAuthHeader()
    });

    if (!response.ok) throw new Error('Failed to export PDF');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CartaLaCatedral_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    alert('Error al descargar PDF: ' + error.message);
  }
}
