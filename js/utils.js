/* utils.js — shared helpers */
const Utils = {
  uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  },

  getDeviceUser() {
    let u = localStorage.getItem('uptodate_user');
    if (!u) {
      u = 'user-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('uptodate_user', u);
    }
    return u;
  },

  formatMoney(amount) {
    const n = Number(amount) || 0;
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  },

  formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  nowLocalISO() {
    // returns value suitable for datetime-local input
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  },

  todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  },

  addOneHour(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    let nh = h + 1;
    if (nh >= 24) nh -= 24;
    return `${String(nh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  formatTimeRange(start, end) {
    return `${start}–${end}`;
  },

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
};
