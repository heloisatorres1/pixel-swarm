/* ===================== Pixel Swarm — native phone features =====================
   In the Android/iOS app (Capacitor) this uses the phone's real haptics, local notifications, share sheet and
   app storage. In a normal browser it falls back to the web equivalents (navigator.vibrate, Web Share API,
   localStorage) and skips what the web can't do (scheduled notifications).
   Plugins: @capacitor/haptics, @capacitor/local-notifications, @capacitor/share, @capacitor/preferences.
   Plugins are looked up when used (not at load), so tests can simulate a phone.
*/
window.PSNative = (function () {
  'use strict';
  const isNative = () => { const c = window.Capacitor; return !!(c && c.isNativePlatform && c.isNativePlatform()); };
  const plugin = (name) => {
    if (!isNative()) return null;
    const c = window.Capacitor;
    return (c.Plugins && c.Plugins[name]) || (c.registerPlugin && c.registerPlugin(name)) || null;
  };

  // ---------- HAPTICS ----------
  // kind: 'light' (taps, picks) | 'medium' (rewards, unlocks) | 'heavy' (impacts) |
  //       'success' (win) | 'warning' (blocked move) | 'error' (lose)
  const WEB_PATTERN = { light: 10, medium: 20, heavy: 40, success: [15, 60, 25], warning: [25, 40, 25], error: [40, 50, 40, 50, 40] };
  function haptic(kind = 'light') {
    const H = plugin('Haptics');
    if (H) {
      const p = ['success', 'warning', 'error'].includes(kind)
        ? H.notification({ type: kind.toUpperCase() })
        : H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      if (p && p.catch) p.catch(() => {});
      return;
    }
    try { if (navigator.vibrate) navigator.vibrate(WEB_PATTERN[kind] || 10); } catch (e) { /* not supported */ }
  }

  // ---------- NOTIFICATIONS (phone app only) ----------
  const ID = { daily: 1001, comeback: 1002, event: 1003 };
  const CHANNEL = 'reminders';
  let opened = null; // what to do when the player taps a notification
  // once at start: Android channel + "notification tapped" listener
  async function setupNotifications(onOpen) {
    opened = onOpen;
    const N = plugin('LocalNotifications');
    if (!N) return;
    try {
      if (N.createChannel) await N.createChannel({ id: CHANNEL, name: 'Reminders', description: 'Daily reward and event reminders', importance: 3, visibility: 1 });
      N.addListener('localNotificationActionPerformed', (e) => { const n = e && e.notification; if (opened && n) opened(n.extra && n.extra.kind); });
    } catch (e) { /* unavailable */ }
  }
  // asks the player for permission (Android 13+ / iOS show a system dialog). true = allowed
  async function requestNotifications() {
    const N = plugin('LocalNotifications');
    if (!N) return false;
    try {
      const now = await N.checkPermissions();
      if (now.display === 'granted') return true;
      if (now.display === 'denied') return false;
      return (await N.requestPermissions()).display === 'granted';
    } catch (e) { return false; }
  }
  // plan: { enabled, daily: Date|null, comeback: Date|null, event: Date|null, eventName }
  // Replaces all reminders. Never asks for permission itself (that happens at a good moment, see app.js).
  async function scheduleReminders(plan) {
    const N = plugin('LocalNotifications');
    if (!N) return 'web';
    try {
      await N.cancel({ notifications: Object.values(ID).map((id) => ({ id })) });
      if (!plan.enabled) return 'off';
      if ((await N.checkPermissions()).display !== 'granted') return 'no-permission';
      const soon = Date.now() + 60 * 1000, list = [];
      const add = (kind, at, title, body) => {
        if (at && at.getTime() > soon) list.push({ id: ID[kind], title, body, schedule: { at, allowWhileIdle: true }, channelId: CHANNEL, extra: { kind }, smallIcon: 'ic_stat_bee', iconColor: '#F5A623' });
      };
      add('daily', plan.daily, 'Your daily reward is ready! 🎁', 'Come back to claim it and keep your streak going.');
      add('comeback', plan.comeback, 'Your bugs miss you! 🐝', 'New pictures are waiting to be eaten in the Art-Tree.');
      add('event', plan.event, `${plan.eventName || 'The event'} ends tomorrow! 🎃`, 'Collect your last pumpkins and claim the event rewards.');
      if (list.length) await N.schedule({ notifications: list });
      return `scheduled ${list.length}`;
    } catch (e) { return 'error'; }
  }

  // ---------- SHARE ----------
  // { title, text, url, image (a canvas), fileName } -> 'shared' | 'cancelled' | 'unsupported'
  async function share({ title, text, url, image, fileName = 'pixel-swarm.png' }) {
    const S = plugin('Share');
    if (S) { // phone app: system share sheet (text + link)
      try { await S.share({ title, text, url, dialogTitle: title }); return 'shared'; } catch (e) { return 'cancelled'; }
    }
    if (navigator.share) {
      try {
        if (image && navigator.canShare) {
          const blob = await new Promise((r) => image.toBlob(r, 'image/png'));
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) { await navigator.share({ title, text: `${text} ${url}`, files: [file] }); return 'shared'; }
        }
        await navigator.share({ title, text, url });
        return 'shared';
      } catch (e) { return e && e.name === 'AbortError' ? 'cancelled' : 'unsupported'; }
    }
    return 'unsupported';
  }

  // ---------- DURABLE STORAGE (phone app) ----------
  // The app's own storage survives things that can wipe a WebView's localStorage.
  async function storeGet(key) { const P = plugin('Preferences'); if (!P) return null; try { return (await P.get({ key })).value; } catch (e) { return null; } }
  async function storeSet(key, value) { const P = plugin('Preferences'); if (!P) return; try { await P.set({ key, value }); } catch (e) { /* ignore */ } }

  return { get native() { return isNative(); }, haptic, vibrate: haptic, setupNotifications, requestNotifications, scheduleReminders, share, storeGet, storeSet };
})();
