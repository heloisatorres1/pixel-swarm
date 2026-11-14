/* ===================== Pixel Swarm — native phone features =====================
   In the Android/iOS app (Capacitor) this uses the phone's real haptics and local notifications.
   In a normal browser it falls back to navigator.vibrate and simply skips notifications.
   Plugins: @capacitor/haptics, @capacitor/local-notifications (see package.json).
*/
window.PSNative = (function () {
  'use strict';
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin = (name) => (native ? ((cap.Plugins && cap.Plugins[name]) || (cap.registerPlugin && cap.registerPlugin(name))) : null);
  const Haptics = plugin('Haptics');
  const Notifications = plugin('LocalNotifications');
  const DAILY_ID = 1001;

  // kind: 'light' (taps) | 'medium' (rewards) | 'heavy' (win / lose)
  function vibrate(kind = 'light') {
    if (Haptics) {
      Haptics.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
      return;
    }
    try { if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 40 : kind === 'medium' ? 20 : 10); } catch (e) { /* not supported */ }
  }

  // "Your daily reward is ready!" — tomorrow at 10:00. Cancelled when notifications are turned off.
  async function scheduleDailyReward(enabled) {
    if (!Notifications) return;
    try {
      await Notifications.cancel({ notifications: [{ id: DAILY_ID }] });
      if (!enabled) return;
      const perm = await Notifications.requestPermissions();
      if (perm.display !== 'granted') return;
      const at = new Date(); at.setDate(at.getDate() + 1); at.setHours(10, 0, 0, 0);
      await Notifications.schedule({ notifications: [{ id: DAILY_ID, title: 'Pixel Swarm 🐝', body: 'Your daily reward is ready! Come back and claim it.', schedule: { at } }] });
    } catch (e) { /* notifications unavailable */ }
  }

  return { native, vibrate, scheduleDailyReward };
})();
