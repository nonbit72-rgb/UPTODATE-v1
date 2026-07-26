/* transactions.js */
const Transactions = {
  editingId: null,

  async init() {
    document.getElementById('tx-fab').addEventListener('click', () => Transactions.openForm());
    document.getElementById('tx-sheet-close').addEventListener('click', Transactions.closeForm);
    document.getElementById('tx-sheet-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'tx-sheet-backdrop') Transactions.closeForm();
    });
    document.getElementById('tx-type').addEventListener('change', Transactions.onTypeChange);
    document.getElementById('tx-form').addEventListener('submit', Transactions.onSubmit);

    await Transactions.renderStats();
    await Transactions.renderList();
  },

  onTypeChange() {
    const type = document.getElementById('tx-type').value;
    const personField = document.getElementById('tx-field-person');
    const personLabel = document.getElementById('tx-person-label');
    if (type === 'Paid By' || type === 'To Get') {
      personField.classList.remove('hidden');
      personLabel.textContent = type === 'Paid By' ? 'Who paid for you?' : 'Who owes you?';
    } else {
      personField.classList.add('hidden');
    }
  },

  openForm(record) {
    const form = document.getElementById('tx-form');
    form.reset();
    document.querySelectorAll('#tx-form .field').forEach(f => f.classList.remove('invalid'));
    document.getElementById('tx-field-person').classList.add('hidden');

    if (record) {
      Transactions.editingId = record.id;
      document.getElementById('tx-sheet-title').textContent = 'Edit Transaction';
      document.getElementById('tx-id').value = record.id;
      document.getElementById('tx-type').value = record.type;
      document.getElementById('tx-way').value = record.way;
      document.getElementById('tx-amount').value = record.amount;
      document.getElementById('tx-desc').value = record.description || '';
      document.getElementById('tx-person').value = record.person || '';
      document.getElementById('tx-datetime').value = record.dateTime;
      Transactions.onTypeChange();
    } else {
      Transactions.editingId = null;
      document.getElementById('tx-sheet-title').textContent = 'Add Transaction';
      document.getElementById('tx-datetime').value = Utils.nowLocalISO();
    }
    document.getElementById('tx-sheet-backdrop').classList.add('open');
  },

  closeForm() {
    document.getElementById('tx-sheet-backdrop').classList.remove('open');
  },

  async onSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('tx-type').value;
    const way = document.getElementById('tx-way').value;
    const amount = document.getElementById('tx-amount').value;
    const dateTime = document.getElementById('tx-datetime').value;
    const person = document.getElementById('tx-person').value.trim();
    const needsPerson = (type === 'Paid By' || type === 'To Get');

    let valid = true;
    const setInvalid = (id, cond) => {
      const field = document.getElementById(id);
      field.classList.toggle('invalid', cond);
      if (cond) valid = false;
    };
    setInvalid('tx-field-type', !type);
    setInvalid('tx-field-way', !way);
    setInvalid('tx-field-amount', !amount || Number(amount) <= 0);
    setInvalid('tx-field-datetime', !dateTime);
    setInvalid('tx-field-person', needsPerson && !person);

    if (!valid) return;

    const record = {
      id: Transactions.editingId || Utils.uid(),
      type, way,
      amount: Number(amount),
      description: document.getElementById('tx-desc').value.trim() || undefined,
      dateTime,
      user: Utils.getDeviceUser(),
      person: needsPerson ? person : undefined
    };

    await DB.put('transactions', record);
    Transactions.closeForm();
    Utils.toast(Transactions.editingId ? 'Transaction updated' : 'Transaction saved');
    await Transactions.renderStats();
    await Transactions.renderList();
  },

  async deleteRecord(id) {
    if (!confirm('Delete this transaction?')) return;
    await DB.delete('transactions', id);
    Utils.toast('Deleted');
    await Transactions.renderStats();
    await Transactions.renderList();
  },

  async renderStats() {
    const all = await DB.getAll('transactions');
    const spentTypes = ['Cash', 'UPI', 'Bank'];
    const totalSpent = all.filter(t => spentTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const youOwe = all.filter(t => t.type === 'Paid By').reduce((s, t) => s + t.amount, 0);
    const owedToYou = all.filter(t => t.type === 'To Get').reduce((s, t) => s + t.amount, 0);

    document.getElementById('tx-stats').innerHTML = `
      <div class="stat-box"><div class="stat-label">Total Spent</div><div class="stat-value num">${Utils.formatMoney(totalSpent)}</div></div>
      <div class="stat-box"><div class="stat-label">Entries</div><div class="stat-value num">${all.length}</div></div>
      <div class="stat-box"><div class="stat-label">You Owe</div><div class="stat-value num" style="color:var(--danger);">${Utils.formatMoney(youOwe)}</div></div>
      <div class="stat-box"><div class="stat-label">Owed To You</div><div class="stat-value num" style="color:var(--accent-att);">${Utils.formatMoney(owedToYou)}</div></div>
    `;
  },

  async renderList() {
    const all = (await DB.getAll('transactions')).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    const container = document.getElementById('tx-list');
    if (!all.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">₹</div>No transactions yet.<br>Tap + to add your first one.</div>`;
      return;
    }
    container.innerHTML = all.map(t => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">
            <span class="chip chip-type">${Utils.escapeHtml(t.type)}</span>
            ${t.person ? ' · ' + Utils.escapeHtml(t.person) : ''}
          </div>
          <div class="list-item-sub">${Utils.escapeHtml(t.way)} · ${Utils.formatDateTime(t.dateTime)}</div>
          ${t.description ? `<div class="list-item-sub">${Utils.escapeHtml(t.description)}</div>` : ''}
        </div>
        <div class="list-item-amount num">${Utils.formatMoney(t.amount)}</div>
        <div class="list-item-actions">
          <button class="icon-btn" data-edit="${t.id}" aria-label="Edit">✎</button>
          <button class="icon-btn danger" data-delete="${t.id}" aria-label="Delete">🗑</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rec = await DB.get('transactions', btn.dataset.edit);
        Transactions.openForm(rec);
      });
    });
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => Transactions.deleteRecord(btn.dataset.delete));
    });
  }
};
