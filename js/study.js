/* study.js */
const Study = {
  editingId: null,
  pendingImage: null, // { dataUrl, name, type }
  pendingFile: null,

  async init() {
    document.getElementById('study-fab').addEventListener('click', () => Study.openForm());
    document.getElementById('study-sheet-close').addEventListener('click', Study.closeForm);
    document.getElementById('study-sheet-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'study-sheet-backdrop') Study.closeForm();
    });
    document.getElementById('study-image').addEventListener('change', Study.onImagePick);
    document.getElementById('study-file').addEventListener('change', Study.onFilePick);
    document.getElementById('study-image-remove').addEventListener('click', Study.removeImage);
    document.getElementById('study-file-remove').addEventListener('click', Study.removeFile);
    document.getElementById('study-form').addEventListener('submit', Study.onSubmit);

    await Study.renderList();
  },

  async onImagePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await Utils.fileToBase64(file);
    Study.pendingImage = { dataUrl, name: file.name, type: file.type };
    const preview = document.getElementById('study-image-preview');
    preview.src = dataUrl;
    preview.classList.remove('hidden');
    document.getElementById('study-image-remove').classList.remove('hidden');
  },

  removeImage() {
    Study.pendingImage = null;
    document.getElementById('study-image').value = '';
    document.getElementById('study-image-preview').classList.add('hidden');
    document.getElementById('study-image-remove').classList.add('hidden');
  },

  async onFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await Utils.fileToBase64(file);
    Study.pendingFile = { dataUrl, name: file.name, type: file.type };
    document.getElementById('study-file-pill').textContent = '📎 ' + file.name;
    document.getElementById('study-file-preview').classList.remove('hidden');
    document.getElementById('study-file-remove').classList.remove('hidden');
  },

  removeFile() {
    Study.pendingFile = null;
    document.getElementById('study-file').value = '';
    document.getElementById('study-file-preview').classList.add('hidden');
    document.getElementById('study-file-remove').classList.add('hidden');
  },

  openForm(record) {
    const form = document.getElementById('study-form');
    form.reset();
    document.querySelectorAll('#study-form .field').forEach(f => f.classList.remove('invalid'));
    Study.removeImage();
    Study.removeFile();

    if (record) {
      Study.editingId = record.id;
      document.getElementById('study-sheet-title').textContent = 'Edit Study Item';
      document.getElementById('study-id').value = record.id;
      document.getElementById('study-topic').value = record.topic;
      if (record.image) {
        Study.pendingImage = record.image;
        const preview = document.getElementById('study-image-preview');
        preview.src = record.image.dataUrl;
        preview.classList.remove('hidden');
        document.getElementById('study-image-remove').classList.remove('hidden');
      }
      if (record.file) {
        Study.pendingFile = record.file;
        document.getElementById('study-file-pill').textContent = '📎 ' + record.file.name;
        document.getElementById('study-file-preview').classList.remove('hidden');
        document.getElementById('study-file-remove').classList.remove('hidden');
      }
    } else {
      Study.editingId = null;
      document.getElementById('study-sheet-title').textContent = 'Add Study Item';
    }
    document.getElementById('study-sheet-backdrop').classList.add('open');
  },

  closeForm() {
    document.getElementById('study-sheet-backdrop').classList.remove('open');
  },

  async onSubmit(e) {
    e.preventDefault();
    const topic = document.getElementById('study-topic').value.trim();
    const field = document.getElementById('study-field-topic');
    field.classList.toggle('invalid', !topic);
    if (!topic) return;

    const record = {
      id: Study.editingId || Utils.uid(),
      topic,
      image: Study.pendingImage || undefined,
      file: Study.pendingFile || undefined
    };

    await DB.put('study', record);
    Study.closeForm();
    Utils.toast(Study.editingId ? 'Study item updated' : 'Study item saved');
    await Study.renderList();
  },

  async deleteRecord(id) {
    if (!confirm('Delete this study item?')) return;
    await DB.delete('study', id);
    Utils.toast('Deleted');
    await Study.renderList();
  },

  async renderList() {
    const all = await DB.getAll('study');
    const container = document.getElementById('study-list');
    if (!all.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📚</div>No study items yet.<br>Tap + to add your first topic.</div>`;
      return;
    }
    container.innerHTML = all.map(s => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div class="list-item-title">${Utils.escapeHtml(s.topic)}</div>
          <div class="list-item-actions">
            <button class="icon-btn" data-edit="${s.id}" aria-label="Edit">✎</button>
            <button class="icon-btn danger" data-delete="${s.id}" aria-label="Delete">🗑</button>
          </div>
        </div>
        ${s.image ? `<img src="${s.image.dataUrl}" class="study-thumb">` : ''}
        ${s.file ? `<div><a href="${s.file.dataUrl}" download="${Utils.escapeHtml(s.file.name)}" class="file-pill" style="text-decoration:none;">📎 ${Utils.escapeHtml(s.file.name)}</a></div>` : ''}
      </div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rec = await DB.get('study', btn.dataset.edit);
        Study.openForm(rec);
      });
    });
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => Study.deleteRecord(btn.dataset.delete));
    });
  }
};
