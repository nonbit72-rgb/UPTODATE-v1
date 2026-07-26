/* main.js — app shell controller */
const App = {
  currentTab: 'transactions',
  accents: {
    transactions: '#E8A33D',
    attendance: '#3DBFA6',
    study: '#8C7AE6'
  },
  titles: {
    transactions: 'Transactions',
    attendance: 'Attendance',
    study: 'Study'
  },
  modules: {
    transactions: () => Transactions,
    attendance: () => Attendance,
    study: () => Study
  },

  async init() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => App.switchTab(btn.dataset.tab));
    });
    document.getElementById('settings-btn').addEventListener('click', App.openSettings);
    document.getElementById('settings-close').addEventListener('click', App.closeSettings);
    document.getElementById('settings-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'settings-backdrop') App.closeSettings();
    });
    await App.switchTab('transactions', true);
  },

  async switchTab(tab, isInitial) {
    if (!isInitial && tab === App.currentTab) return;
    App.currentTab = tab;
    document.documentElement.style.setProperty('--module-accent', App.accents[tab]);
    document.getElementById('page-title').textContent = App.titles[tab];
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const content = document.getElementById('content');
    content.innerHTML = '<div class="empty-state"><div class="icon">⏳</div>Loading…</div>';
    try {
      const res = await fetch(`pages/${tab}.html`);
      const html = await res.text();
      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div>Could not load this page.</div>';
      return;
    }
    const mod = App.modules[tab]();
    if (mod && mod.init) await mod.init();
  },

  async openSettings() {
    await App.refreshSettingsLists();
    document.getElementById('settings-backdrop').classList.add('open');
  },

  closeSettings() {
    document.getElementById('settings-backdrop').classList.remove('open');
  },

  async refreshSettingsLists() {
    const lectures = (await DB.getAll('lectures')).sort((a, b) => a.name.localeCompare(b.name));
    const teachers = (await DB.getAll('teachers')).sort((a, b) => a.name.localeCompare(b.name));

    const renderRows = (items, store) => {
      if (!items.length) return '<div class="empty-state" style="padding:16px;">Nothing saved yet</div>';
      return items.map(item => `
        <div class="name-mgmt-row">
          <span>${Utils.escapeHtml(item.name)}</span>
          <button class="icon-btn danger" data-store="${store}" data-key="${Utils.escapeHtml(item.nameKey)}" aria-label="Delete">🗑</button>
        </div>`).join('');
    };

    document.getElementById('lecture-mgmt-list').innerHTML = renderRows(lectures, 'lectures');
    document.getElementById('teacher-mgmt-list').innerHTML = renderRows(teachers, 'teachers');

    document.querySelectorAll('#settings-backdrop .icon-btn.danger').forEach(btn => {
      btn.addEventListener('click', async () => {
        const label = btn.dataset.store === 'lectures' ? 'lecture' : 'teacher';
        if (!confirm(`Remove this ${label} name? It will no longer appear as an option (existing records keep it).`)) return;
        await DB.removeName(btn.dataset.store, btn.dataset.key);
        await App.refreshSettingsLists();
        Utils.toast('Removed');
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', App.init);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
