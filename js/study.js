/* study.js */
const Study = {
  editingId: null,
  pendingImage: null, // { dataUrl, name, type }
  pendingFile: null,
  activeFilter: '', // lecture name currently filtering the list ('' = all)

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
    document.getElementById('study-lecture').addEventListener('change', Study.onLectureChange);
    document.getElementById('study-filter').addEventListener('change', Study.onFilterChange);

    await Study.populateFilter();

    // If we were sent here from Attendance's per-lecture breakdown, apply that filter once.
    if (App.pendingStudyFilter) {
      Study.activeFilter = App.pendingStudyFilter;
      App.pendingStudyFilter = null;
      const filterSelect = document.getElementById('study-filter');
      const key = DB.normalizeName(Study.activeFilter);
      if ([...filterSelect.options].some(o => o.value === key)) filterSelect.value = key;
    }

    await Study.renderList();
  },

  async populateFilter() {
    const lectures = (await DB.getAll('lectures')).sort((a, b) => a.name.localeCompare(b.name));
    const select = document.getElementById('study-filter');
    select.innerHTML = '<option value="">All topics</option>' +
      lectures.map(l => `<option value="${Utils.escapeHtml(l.nameKey)}">${Utils.escapeHtml(l.name)}</option>`).join('');
  },

  onFilterChange() {
    const select = document.getElementById('study-filter');
    const chosen = select.options[select.selectedIndex];
    Study.activeFilter = select.value ? chosen.textContent : '';
    Study.renderList();
  },

  onLectureChange() {
    const isCustom = document.getElementById('study-lecture').value === '__custom__';
    document.getElementById('study-lecture-custom').classList.toggle('hidden', !isCustom);
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

  async openForm(record) {
    const form = document.getElementById('study-form');
    form.reset();
    document.querySelectorAll('#study-form .field').forEach(f => f.classList.remove('invalid'));
    Study.removeImage();
    Study.removeFile();
    document.getElementById('study-lecture-custom').classList.add('hidden');

    await DB.populateNameSelect(document.getElementById('study-lecture'), 'lectures', '');

    if (record) {
      Study.editingId = record.id;
      document.getElementById('study-sheet-title').textContent = 'Edit Study Item';
      document.getElementById('study-id').value = record.id;
      document.getElementById('study-topic').value = record.topic;

      const lectureSelect = document.getElementById('study-lecture');
      if (record.lecture) {
        const key = DB.normalizeName(record.lecture);
        if ([...lectureSelect.options].some(o => o.value === key)) {
          lectureSelect.value = key;
        } else {
          lectureSelect.value = '__custom__';
          document.getElementById('study-lecture-custom').classList.remove('hidden');
          document.getElementById('study-lecture-custom').value = record.lecture;
        }
      }
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
      // If a filter is active, default new items to that lecture.
      if (Study.activeFilter) {
        const key = DB.normalizeName(Study.activeFilter);
        const select = document.getElementById('study-lecture');
        if ([...select.options].some(o => o.value === key)) select.value = key;
      }
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

    const lectureSel = document.getElementById('study-lecture').value;
    const lectureCustom = document.getElementById('study-lecture-custom').value.trim();
    let lectureName = '';
    if (lectureSel === '__custom__') {
      lectureName = lectureCustom;
      if (lectureName) await DB.addNameIfNew('lectures', lectureName);
    } else if (lectureSel) {
      lectureName = document.querySelector(`#study-lecture option[value="${CSS.escape(lectureSel)}"]`)?.textContent || '';
    }

    const record = {
      id: Study.editingId || Utils.uid(),
      topic,
      lecture: lectureName || undefined,
      image: Study.pendingImage || undefined,
      file: Study.pendingFile || undefined
    };

    await DB.put('study', record);
    Study.closeForm();
    Utils.toast(Study.editingId ? 'Study item updated' : 'Study item saved');
    await Study.populateFilter();
    await Study.renderList();
  },

  async deleteRecord(id) {
    if (!confirm('Delete this study item?')) return;
    await DB.delete('study', id);
    Utils.toast('Deleted');
    await Study.renderList();
  },

  async renderList() {
    let all = await DB.getAll('study');
    if (Study.activeFilter) {
      all = await DB.queryBy('study', 'lecture', Study.activeFilter);
    }
    const container = document.getElementById('study-list');
    if (!all.length) {
      container.innerHTML = Study.activeFilter
        ? `<div class="empty-state"><div class="icon">📚</div>No study items linked to "${Utils.escapeHtml(Study.activeFilter)}" yet.<br>Tap + to add one.</div>`
        : `<div class="empty-state"><div class="icon">📚</div>No study items yet.<br>Tap + to add your first topic.</div>`;
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
        ${s.lecture ? `<span class="study-lecture-chip">${Utils.escapeHtml(s.lecture)}</span>` : ''}
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
