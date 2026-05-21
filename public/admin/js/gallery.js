let currentGalleryCategory = 'local';
const GALLERY_LIMITS = { local: 6, bebidas: 5, platos: 5, postres: 5 };

function switchGalleryCategory(category, btn) {
  currentGalleryCategory = category;

  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  updateUploadHint();
  loadGallery(category);
}

function updateUploadHint() {
  const limit = GALLERY_LIMITS[currentGalleryCategory];
  document.getElementById('uploadHint').textContent = `Máximo ${limit} fotos`;
}

async function loadGallery(category) {
  try {
    const response = await fetch(`${API_URL}/api/gallery?category=${category}`);
    const images = await response.json();

    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';

    images.forEach((img, idx) => {
      const cell = document.createElement('div');
      cell.className = 'gallery-cell';
      cell.innerHTML = `
        <img src="${img.image_url}" alt="Foto ${idx + 1}">
        <button class="delete-btn" onclick="deleteGalleryImage('${img.id}')">✕</button>
      `;
      grid.appendChild(cell);
    });

    // Mostrar slots vacíos si no hay suficientes fotos
    const limit = GALLERY_LIMITS[category];
    const empty = limit - images.length;

    for (let i = 0; i < empty; i++) {
      const cell = document.createElement('div');
      cell.className = 'gallery-cell empty';
      cell.innerHTML = '<span>+</span>';
      grid.appendChild(cell);
    }
  } catch (error) {
    console.error('Error loading gallery:', error);
  }
}

document.getElementById('uploadArea')?.addEventListener('click', () => {
  document.getElementById('galleryInput').click();
});

document.getElementById('uploadArea')?.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.getElementById('uploadArea').classList.add('drag-over');
});

document.getElementById('uploadArea')?.addEventListener('dragleave', () => {
  document.getElementById('uploadArea').classList.remove('drag-over');
});

document.getElementById('uploadArea')?.addEventListener('drop', (e) => {
  e.preventDefault();
  document.getElementById('uploadArea').classList.remove('drag-over');
  document.getElementById('galleryInput').files = e.dataTransfer.files;
  handleGalleryUpload();
});

async function handleGalleryUpload() {
  const input = document.getElementById('galleryInput');
  const files = input.files;

  if (!files.length) return;

  const category = currentGalleryCategory;
  const limit = GALLERY_LIMITS[category];

  const formData = new FormData();
  formData.append('category', category);

  for (let i = 0; i < Math.min(files.length, limit); i++) {
    formData.append('images', files[i]);
  }

  try {
    document.getElementById('uploadArea').classList.add('uploading');

    const response = await fetch(`${API_URL}/api/gallery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');

    const result = await response.json();
    console.log('Uploaded:', result.uploaded.length, 'images');

    input.value = '';
    await loadGallery(category);
  } catch (error) {
    alert('Error al subir fotos: ' + error.message);
  } finally {
    document.getElementById('uploadArea').classList.remove('uploading');
  }
}

async function deleteGalleryImage(imageId) {
  if (!confirm('¿Estás seguro que deseas eliminar esta foto?')) return;

  try {
    const response = await fetch(`${API_URL}/api/gallery/${imageId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (!response.ok) throw new Error('Delete failed');

    await loadGallery(currentGalleryCategory);
  } catch (error) {
    alert('Error al eliminar foto: ' + error.message);
  }
}
