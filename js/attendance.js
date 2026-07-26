/* attendance.js */
const Attendance = {
  editingId: null,

  async init() {
    document.getElementById('att-fab').addEventListener('click', () => Attendance.openForm());
    document.getElementById('att-sheet-close').addEventListener('click', Attendance.closeForm);
    document.getElementById('att-sheet-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'att-sheet-backdrop') Attendance.closeForm();
    });
    document.getElementById('att-slot').addEventListener('change', Attendance.onSlotChange);
    document.getElementById('att-lecture').addEventListener('change', Attendance.onLectureChange);
    document.getElementById('att-teacher').addEventListener('change', Attendance.onTeacherChange);
    document.getElementById('att-form').addEventListener('submit', Attendance.onSubmit);

    await Attendance.renderStats();
    await Attendance.renderList();
  },

  onSlotChange() {
    const val = document.getElementById('att-slot').value;
    document.getElementById('att-field-custom1').classList.toggle('hidden', val !== 'custom1');
    document.getElementById('att-field-custom2').classList.toggle('hidden', val !== 'custom2');
  },

  onLectureChange() {
    const isCustom = document.getElementById('att-lecture').value === '__custom__';
    document.getElementById('att-field-lecture-custom').classList.toggle('hidden', !isCustom);
  },

  onTeacherChange() {
    const isCustom = document.getElementById('att-teacher').value === '__custom__';
    document.getElementById('att-field-teacher-custom').classList.toggle('hidden', !isCustom);
  },

  async populateSelect(selectId, storeName) {
    const items = (await DB.getAll(storeName)).sort((a, b) => a.name.localeCompare(b.name));
    const select = document.getElementById(selectId);
    const current = select.value;
    select.innerHTML = '<option value="">Choose</option>' +
      items.map(i => `<option value="${Utils.escapeHtml(i.nameKey)}">${Utils.escapeHtml(i.name)}</option>`).join('') +
      '<option value="__custom__">Custom...</option>';
    if (current) select.value = current;
  },

  async openForm(record) {
    const form = document.getElementById('att-form');
    form.reset();
    document.querySelectorAll('#att-form .field').forEach(f => f.classList.remove('invalid'));
    document.getElementById('att-field-custom1').classList.add('hidden');
    document.getElementById('att-field-custom2').classList.add('hidden');
    document.getElementById('att-field-lecture-custom').classList.add('hidden');
    document.getElementById('att-field-teacher-custom').classList.add('hidden');

    await Attendance.populateSelect('att-lecture', 'lectures');
    await Attendance.populateSelect('att-teacher', 'teachers');

    if (record) {
      Attendance.editingId = record.id;
      document.getElementById('att-sheet-title').textContent = 'Edit Attendance';
      document.getElementById('att-id').value = record.id;
      document.getElementById('att-date').value = record.date;
      document.getElementById('att-slot').value = record.slotKey || '';
      Attendance.onSlotChange();
      if (record.slotKey === 'custom1' && record.timeSlot) {
        document.getElementById('att-custom1-start').value = record.timeSlot.split('–')[0];
      }
      if (record.slotKey === 'custom2' && record.timeSlot) {
        const [s, e] = record.timeSlot.split('–');
        document.getElementById('att-custom2-start').value = s;
        document.getElementById('att-custom2-end').value = e;
      }
      const lectureKey = DB.normalizeName(record.lecture);
      const lectureSelect = document.getElementById('att-lecture');
      if ([...lectureSelect.options].some(o => o.value === lectureKey)) {
        lectureSelect.value = lectureKey;
      } else {
        lectureSelect.value = '__custom__';
        document.getElementById('att-field-lecture-custom').classList.remove('hidden');
        document.getElementById('att-lecture-custom').value = record.lecture;
      }
      const teacherKey = DB.normalizeName(record.teacher);
      const teacherSelect = document.getElementById('att-teacher');
      if ([...teacherSelect.options].some(o => o.value === teacherKey)) {
        teacherSelect.value = teacherKey;
      } else {
        teacherSelect.value = '__custom__';
        document.getElementById('att-field-teacher-custom').classList.remove('hidden');
        document.getElementById('att-teacher-custom').value = record.teacher;
      }
      const radio = document.querySelector(`input[name="att-status"][value="${record.status}"]`);
      if (radio) radio.checked = true;
    } else {
      Attendance.editingId = null;
      document.getElementById('att-sheet-title').textContent = 'Add Attendance';
      document.getElementById('att-date').value = Utils.todayISO();
    }
    document.getElementById('att-sheet-backdrop').classList.add('open');
  },

  closeForm() {
    document.getElementById('att-sheet-backdrop').classList.remove('open');
  },

  async onSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('att-date').value;
    const slotKey = document.getElementById('att-slot').value;
    const lectureSel = document.getElementById('att-lecture').value;
    const teacherSel = document.getElementById('att-teacher').value;
    const lectureCustom = document.getElementById('att-lecture-custom').value.trim();
    const teacherCustom = document.getElementById('att-teacher-custom').value.trim();
    const statusRadio = document.querySelector('input[name="att-status"]:checked');

    let valid = true;
    const setInvalid = (id, cond) => {
      document.getElementById(id).classList.toggle('invalid', cond);
      if (cond) valid = false;
    };
    setInvalid('att-field-date', !date);
    setInvalid('att-field-slot', !slotKey);

    let timeSlot = '';
    if (slotKey === 'custom1') {
      const start = document.getElementById('att-custom1-start').value;
      setInvalid('att-field-custom1', !start);
      if (start) timeSlot = Utils.formatTimeRange(start, Utils.addOneHour(start));
    } else if (slotKey === 'custom2') {
      const s = document.getElementById('att-custom2-start').value;
      const en = document.getElementById('att-custom2-end').value;
      setInvalid('att-field-custom2', !s || !en);
      if (s && en) timeSlot = Utils.formatTimeRange(s, en);
    } else if (slotKey) {
      timeSlot = slotKey;
    }

    const lectureName = lectureSel === '__custom__' ? lectureCustom : (lectureSel ? document.querySelector(`#att-lecture option[value="${CSS.escape(lectureSel)}"]`)?.textContent : '');
    setInvalid('att-field-lecture', !lectureName);

    const teacherName = teacherSel === '__custom__' ? teacherCustom : (teacherSel ? document.querySelector(`#att-teacher option[value="${CSS.escape(teacherSel)}"]`)?.textContent : '');
    setInvalid('att-field-teacher', !teacherName);

    if (!statusRadio) {
      document.getElementById('att-status-row').style.outline = '1px solid var(--danger)';
      valid = false;
    } else {
      document.getElementById('att-status-row').style.outline = 'none';
    }

    if (!valid) return;

    if (lectureSel === '__custom__') await DB.addNameIfNew('lectures', lectureName);
    if (teacherSel === '__custom__') await DB.addNameIfNew('teachers', teacherName);

    const record = {
      id: Attendance.editingId || Utils.uid(),
      date,
      slotKey,
      dateTime: `${date}T00:00:00`,
      timeSlot,
      lecture: lectureName,
      teacher: teacherName,
      status: statusRadio.value
    };

    await DB.put('attendance', record);
    Attendance.closeForm();
    Utils.toast(Attendance.editingId ? 'Attendance updated' : 'Attendance saved');
    await Attendance.renderStats();
    await Attendance.renderList();
  },

  async deleteRecord(id) {
    if (!confirm('Delete this attendance entry?')) return;
    await DB.delete('attendance', id);
    Utils.toast('Deleted');
    await Attendance.renderStats();
    await Attendance.renderList();
  },

  async renderStats() {
    const all = await DB.getAll('attendance');
    const total = all.length;
    const present = all.filter(a => a.status === 'Present').length;
    const absent = total - present;
    const pct = total ? Math.round((present / total) * 100) : 0;

    document.getElementById('att-stats').innerHTML = `
      <div class="stat-box"><div class="stat-label">Total Lectures</div><div class="stat-value num">${total}</div></div>
      <div class="stat-box"><div class="stat-label">Percentage</div><div class="stat-value num" style="color:var(--accent-att);">${pct}%</div>
        <div class="progress-bar"><div style="width:${pct}%"></div></div></div>
      <div class="stat-box"><div class="stat-label">Present</div><div class="stat-value num chip-present" style="background:none;padding:0;">${present}</div></div>
      <div class="stat-box"><div class="stat-label">Absent</div><div class="stat-value num" style="color:var(--danger);">${absent}</div></div>
    `;

    const byLecture = {};
    all.forEach(a => {
      byLecture[a.lecture] = byLecture[a.lecture] || { total: 0, present: 0 };
      byLecture[a.lecture].total++;
      if (a.status === 'Present') byLecture[a.lecture].present++;
    });
    const rows = Object.keys(byLecture).sort();
    const body = document.getElementById('att-breakdown-body');
    const card = document.getElementById('att-breakdown-card');
    if (!rows.length) {
      card.classList.add('hidden');
    } else {
      card.classList.remove('hidden');
      body.innerHTML = rows.map(name => {
        const d = byLecture[name];
        const p = Math.round((d.present / d.total) * 100);
        return `<tr><td>${Utils.escapeHtml(name)}</td><td class="num">${d.present}</td><td class="num">${d.total}</td><td class="num">${p}%</td></tr>`;
      }).join('');
    }
  },

  async renderList() {
    const all = (await DB.getAll('attendance')).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    const container = document.getElementById('att-list');
    if (!all.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📋</div>No attendance recorded yet.<br>Tap + to add your first entry.</div>`;
      return;
    }
    container.innerHTML = all.map(a => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">${Utils.escapeHtml(a.lecture)}
            <span class="chip ${a.status === 'Present' ? 'chip-present' : 'chip-absent'}">${a.status}</span>
          </div>
          <div class="list-item-sub">${Utils.escapeHtml(a.teacher)} · ${a.timeSlot}</div>
          <div class="list-item-sub">${Utils.formatDate(a.date)}</div>
        </div>
        <div class="list-item-actions">
          <button class="icon-btn" data-edit="${a.id}" aria-label="Edit">✎</button>
          <button class="icon-btn danger" data-delete="${a.id}" aria-label="Delete">🗑</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rec = await DB.get('attendance', btn.dataset.edit);
        Attendance.openForm(rec);
      });
    });
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => Attendance.deleteRecord(btn.dataset.delete));
    });
  }
};
