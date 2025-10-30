// ReminderManager: schedules notifications (best-effort).
class ReminderManager {
  constructor() {
    this.storeKey = 'reminder_manager_store_v1';
    this.timers = new Map(); // id -> timeoutId
    this.reminders = this._loadFromStorage(); // { id: {...}, ... }
    this.swRegistration = null;
    // attempt to hook up service worker if present later
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => { this.swRegistration = reg; }).catch(()=>{});
    }
    this._rescheduleAll();
  }

  async requestPermission() {
    if (!('Notification' in window)) return 'denied';
    const p = await Notification.requestPermission();
    return p;
  }

  _now() {
    return Date.now();
  }

  _saveToStorage() {
    try {
      localStorage.setItem(this.storeKey, JSON.stringify(this.reminders));
    } catch (e) {
      console.warn('ReminderManager storage save failed', e);
    }
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storeKey);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  scheduleReminder({ id, title, body = '', timestamp }) {
    if (!id) id = 'r_' + Math.random().toString(36).slice(2, 9);
    if (!timestamp) throw new Error('timestamp required');
    this.reminders[id] = { id, title, body, timestamp };
    this._saveToStorage();
    this._scheduleOne(this.reminders[id]);
    return id;
  }

  cancelReminder(id) {
    delete this.reminders[id];
    this._saveToStorage();
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
  }

  _notifyLocal(title, body) {
    // Try ServiceWorker first (for background). Fallback to Notification API or alert.
    if (this.swRegistration && this.swRegistration.showNotification) {
      this.swRegistration.showNotification(title, { body, tag: 'focus-ai-reminder' }).catch((e) => {
        try { new Notification(title, { body }); } catch (e2) { alert(title + '\n\n' + body); }
      });
      return;
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
        return;
      } catch (e) {
        // fall through
      }
    }
    // fallback
    alert(title + '\n\n' + body);
  }

  _scheduleOne(rem) {
    const ms = rem.timestamp - this._now();
    const id = rem.id;
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
    if (ms <= 0) {
      // fire immediately
      this._notifyLocal(rem.title, rem.body);
      delete this.reminders[id];
      this._saveToStorage();
      return;
    }
    // browsers cap setTimeout; keep safe cap
    const safeMs = Math.min(ms, 2147483647);
    const tid = setTimeout(() => {
      this._notifyLocal(rem.title, rem.body);
      delete this.reminders[id];
      this._saveToStorage();
      this.timers.delete(id);
    }, safeMs);
    this.timers.set(id, tid);
  }

  _rescheduleAll() {
    Object.values(this.reminders).forEach(rem => this._scheduleOne(rem));
  }

  list() {
    return Object.values(this.reminders).sort((a,b)=>a.timestamp - b.timestamp);
  }
}

window.ReminderManager = ReminderManager;
export { ReminderManager };