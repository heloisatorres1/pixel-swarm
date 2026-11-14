/* ===================== Pixel Swarm — app ===================== */
(function () {
  'use strict';

  // ---------- Player state (saved in the browser) ----------
  const SAVE_KEY = 'pixelswarm.save.v1';
  const DEFAULT_STATE = {
    coins: 100,
    gems: 20,
    playerLevel: 1,
    xp: 1,
    xpToNext: 2,
    currentLevel: 1,
    started: false,
    creature: 'bee',
    theme: { name: 'Flowers', difficulty: 'easy', level: 1, total: 10 },
    settings: { music: true, sounds: true, haptics: true, notifications: true },
    playerId: null,
    noAds: false,
    freeCoins: { day: '', count: 0 },   // "Free Coins" video ads watched today
    ownedSkins: ['bee'],
    boosters: { add_slot: 1 },          // booster counts
    speedBoostUntil: 0,                 // 2x speed available until this time (Speed Store time boosts)
    maxSpeed: 1,                        // permanent speed bought in the Speed Store (3, 5 or 8)
    tutorialSeen: false,
    seen: {},                           // puzzle features already introduced
    winsSinceAd: 0,
    selected: { theme: 'flowers' },     // theme shown on the main menu "Level" button
    progress: {},                       // "flowers-easy": [3, 2, 3] = stars of each completed level
    gallery: [],                        // pictures completed at least once
    stats: { levels: 0, hard: 0, boosters: 0, daily: 0, coinsEarned: 0 },
    event: { ends: 0, pumpkins: 0, levels: [], claimedRewards: [] }, // levels = stars of each won event level
    playerName: 'Player',
    avatar: 'bee',
    ageGroup: null,                     // '0-12' | '13-17' | '18+' (asked once, used later for ad settings)
    launches: 0,
    offer: { seen: '', ends: 0 },       // special-offer pop-up: last day shown + countdown end
    daily: { streak: 0, last: '' },     // daily-reward calendar
    tasks: { day: '', progress: {}, claimed: {} },
  };

  // ---------- Daily rewards & tasks (edit rewards here) ----------
  const DAILY_REWARDS = [
    { coins: 500 }, { gems: 50 }, { coins: 1000 }, { gems: 100 }, { coins: 2000 }, { gems: 150 },
    { gems: 300, coins: 5000 },          // day 7: treasure chest
  ];
  const TASKS = [
    { id: 'play3',     title: 'Play 3 levels',         desc: 'Play any 3 levels.',                goal: 3, coins: 100, icon: 'icon_activities' },
    { id: 'boosters2', title: 'Use 2 boosters',        desc: 'Use any 2 boosters in levels.',     goal: 2, coins: 150, icon: 'booster_shuffle' },
    { id: 'hard1',     title: 'Complete a Hard level', desc: 'Finish 1 level on Hard difficulty.', goal: 1, coins: 300, icon: 'trophy' },
    { id: 'video1',    title: 'Watch 1 video',         desc: 'Watch 1 video to get a reward.',    goal: 1, coins: 100, icon: 'icon_video_ad' },
  ];

  // ---------- Store catalogue (edit prices/amounts here) ----------
  // Real-money prices are only labels for now: tapping them does a TEST purchase.
  // Connect the app stores' in-app purchase system when the game becomes a phone app.
  const PRODUCTS = {
    offer: { price: '$4.99', oldPrice: '$9.99', gems: 1200, coins: 10000, noAds: true },
    noAds: { price: '$2.99' },
    noAdsBundle: { price: '$5.99', gems: 500 },
    gems: [
      { id: 'gems-s', amount: 100,  price: '$0.99', img: 'gem' },
      { id: 'gems-m', amount: 550,  price: '$4.99', img: 'gems_pile' },
      { id: 'gems-l', amount: 1200, price: '$9.99', img: 'chest', extra: 'gems_pile' },
    ],
    coins: [  // bought with gems
      { id: 'coins-s', amount: 1000,  gems: 30,  img: 'coin' },
      { id: 'coins-m', amount: 5000,  gems: 120, img: 'coins_pile' },
      { id: 'coins-l', amount: 12000, gems: 250, img: 'chest', extra: 'coins_pile' },
    ],
    freeCoins: { amount: 100, perDay: 5 },
  };

  const APP_VERSION = '1.0.0';
  // Debug cheats (pink DBG button). Set to false before publishing the game.
  const DEBUG = true;
  // Fill these in when the pages exist (e.g. 'https://yoursite.com/privacy').
  // While empty, the buttons show a "coming soon" message.
  const LINKS = { privacy: '', terms: '', feedback: '' };

  function loadState() {
    let s = Object.assign({}, DEFAULT_STATE);
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) s = Object.assign(s, JSON.parse(raw));
    } catch (e) { /* storage unavailable - use defaults */ }
    s.settings = Object.assign({}, DEFAULT_STATE.settings, s.settings);
    s.stats = Object.assign({}, DEFAULT_STATE.stats, s.stats);
    s.event = Object.assign({}, DEFAULT_STATE.event, s.event);
    if (!s.playerId) s.playerId = makePlayerId();
    return s;
  }
  // e.g. "8F3K-29QX" (no 0/O/1/I so it is easy to read out loud)
  function makePlayerId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += (i === 4 ? '-' : '') + chars[Math.floor(Math.random() * chars.length)];
    return id;
  }
  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const state = loadState();
  const $ = (id) => document.getElementById(id);

  // ---------- Render main menu ----------
  function formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('en-US');
  }

  // Top-bar values appear on several screens, so they use classes instead of ids.
  const setAll = (cls, fn) => document.querySelectorAll('.' + cls).forEach(fn);
  function renderHud() {
    setAll('ui-coins', (el) => { el.textContent = formatNumber(state.coins); });
    setAll('ui-gems', (el) => { el.textContent = formatNumber(state.gems); });
    setAll('ui-player-level', (el) => { el.textContent = state.playerLevel; });
    setAll('ui-xp-fill', (el) => { el.style.width = Math.min(100, (state.xp / state.xpToNext) * 100) + '%'; });
    setAll('ui-avatar', (el) => { el.src = `assets/sprites/${state.avatar}.png`; });
  }
  function bumpCurrency(kind) { // kind: 'ui-gems' | 'ui-coins'
    setAll(kind, (el) => {
      const pill = el.closest('.pill');
      pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
    });
  }

  function renderMenu() {
    renderHud();
    const next = nextLevel(state.selected.theme);
    $('ui-play-label').textContent = next ? 'Level ' + (next.index + 1) : 'Completed!';
    $('ui-mascot').src = 'assets/sprites/' + state.creature + '.png';
    $('ui-theme').textContent = themeById(state.selected.theme).name;
    const diff = next ? next.diff : 'hard';
    $('ui-difficulty').textContent = cap(diff);
    $('ui-diff-tag').className = 'diff-tag ' + diff;
    $('menu-noads').hidden = state.noAds;
    const n = activityCount();
    $('ui-activity-badge').textContent = n;
    $('ui-activity-badge').style.display = n ? '' : 'none';
  }

  // ---------- Event countdown (placeholder: a Halloween event ending in 2 days) ----------
  function eventEnds() {
    if (!state.event.ends) { state.event.ends = Date.now() + (3 * 24 + 8) * 3600 * 1000; saveState(); }
    return state.event.ends;
  }
  function renderEventTimer() {
    const ms = Math.max(0, eventEnds() - Date.now());
    const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
    const txt = d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
    $('ui-event-timer').textContent = txt;
    if ($('ui-event-ends')) $('ui-event-ends').textContent = txt;
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), Math.max(1600, msg.length * 55)); // longer messages stay longer
  }

  // ---------- Button actions ----------
  // Screens not built yet show a "coming soon" message. They will be wired up one by one.
  const SCREEN_NAMES = {
    profile: 'Player Profile', settings: 'Settings', store: 'Store', collections: 'Collections',
    activities: 'Activities', noads: 'No Ads offer', events: 'Events', levels: 'Level Themes',
    play: 'Gameplay', skins: 'Skins',
  };

  function haptic() {
    if (!state.settings.haptics) return;
    PSNative.vibrate('light'); // Capacitor Haptics on phones, navigator.vibrate on the web
  }

  // ---------- Pop-ups ----------
  let openPopupEl = null, lastFocus = null;
  function openPopup(id) {
    closePopup(true);
    if (typeof hideTutorial === 'function') hideTutorial();
    const el = $(id);
    lastFocus = document.activeElement;
    el.hidden = false;
    openPopupEl = el;
    const closeBtn = el.querySelector('[data-close]');
    if (closeBtn) closeBtn.focus();
  }
  // Pop-ups marked data-locked (age gate) only close when the code forces it.
  function closePopup(force) {
    if (!openPopupEl) return;
    if (openPopupEl.hasAttribute('data-locked') && force !== true) return;
    openPopupEl.hidden = true;
    openPopupEl = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });

  // ---------- Settings ----------
  function renderSettings() {
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(!!state.settings[b.dataset.toggle]));
    });
    $('ui-player-id').textContent = state.playerId;
    $('ui-version').textContent = APP_VERSION;
  }
  function toggleSetting(key) {
    state.settings[key] = !state.settings[key];
    saveState();
    renderSettings();
    const names = { music: 'Music', sounds: 'Sounds', haptics: 'Haptics', notifications: 'Notifications' };
    toast(`${names[key]} ${state.settings[key] ? 'on' : 'off'}`);
    if (key === 'notifications') PSNative.scheduleDailyReward(state.settings.notifications);
  }
  function openLink(key) {
    if (LINKS[key]) window.open(LINKS[key], '_blank', 'noopener');
    else toast({ privacy: 'Privacy Policy', terms: 'Terms of Service', feedback: 'Feedback' }[key] + ' — coming soon');
  }
  function copyText(text) {
    const done = () => toast('Player ID copied!');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Could not copy'); }
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  // ---------- Screens ----------
  let currentScreen = 'menu';
  function showScreen(name) {
    closePopup();
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    document.querySelectorAll('#bottom-nav .nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
    currentScreen = name;
    $('app').classList.toggle('no-nav', name === 'game');
    $('app').classList.toggle('no-ads', !!state.noAds);
    if (name !== 'game') hideTutorial();
    if (name === 'menu') { renderMenu(); layoutMenuScene(); }
    if (name === 'store') { renderStore(); $('store-list').scrollTop = 0; }
    if (name === 'skins') { viewingSkin = null; renderHud(); renderSkins(); }
    if (name === 'themes') renderThemes();
    if (name === 'theme') renderThemeLevels();
    if (name === 'collections') renderCollections();
    if (name === 'events') renderEvents();
    document.querySelectorAll('.screen.active .panel-inner').forEach((p) => { p.scrollTop = 0; });
  }

  // ---------- Store ----------
  const img = (name, cls) => `<img ${cls ? `class="${cls}" ` : ''}src="assets/sprites/${name}.png" alt="">`;
  // local calendar day, e.g. "2026-11-13" (daily things reset at the player's midnight)
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => dayKey(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
  function freeCoinsLeft() {
    if (state.freeCoins.day !== today()) return PRODUCTS.freeCoins.perDay;
    return Math.max(0, PRODUCTS.freeCoins.perDay - state.freeCoins.count);
  }

  function renderStore() {
    const P = PRODUCTS, left = freeCoinsLeft();
    const formatNumber = (n) => n.toLocaleString('en-US'); // store shows full amounts (12,000 not 12K)
    $('store-list').innerHTML = `
      <div class="card offer">
        <span class="tag-ribbon">Special Offer</span>
        <div class="offer-items">${img('gems_pile')}<b>+</b>${img('coins_pile')}<b>+</b>${img('icon_noads')}</div>
        <button class="gbtn green price" data-action="buy" data-item="offer"><span>${P.offer.price}</span></button>
        <span class="offer-detail">${formatNumber(P.offer.gems)} gems · ${formatNumber(P.offer.coins)} coins · No Ads</span>
      </div>

      <div class="card">
        ${img('icon_noads')}
        <div class="card-title">No Ads<small>Remove banner and video ads</small></div>
        ${state.noAds
          ? `<button class="gbtn green price" disabled><span>Owned</span></button>`
          : `<button class="gbtn green price" data-action="buy" data-item="noAds"><span>${P.noAds.price}</span></button>`}
      </div>

      <div class="shop-section">
        <span class="section-tab">Gems</span>
        <div class="grid3">${P.gems.map((g) => `
          <div class="pcard">
            <div class="art">${img(g.img)}${g.extra ? img(g.extra, 'extra') : ''}</div>
            <span class="amount">${formatNumber(g.amount)}</span>
            <button class="gbtn green price" data-action="buy" data-item="${g.id}"><span>${g.price}</span></button>
          </div>`).join('')}
        </div>
      </div>

      <div class="shop-section">
        <span class="section-tab">Coins</span>
        <div class="grid3">${P.coins.map((c) => `
          <div class="pcard">
            <div class="art">${img(c.img)}${c.extra ? img(c.extra, 'extra') : ''}</div>
            <span class="amount">${formatNumber(c.amount)}</span>
            <button class="gbtn yellow price has-icon" data-action="buy" data-item="${c.id}">${img('gem')}<span>${c.gems}</span></button>
          </div>`).join('')}
        </div>
      </div>

      <div class="card">
        ${img('icon_speed')}
        <div class="card-title">Speed Store<small>2x boosts or up to 8x forever</small></div>
        <button class="gbtn blue price" data-action="speed-store"><span>Open</span></button>
      </div>

      <div class="card free">
        <div class="free-art">${img('icon_video_ad')}${img('coins_pile')}</div>
        <div class="card-title">Free Coins<small>+${P.freeCoins.amount} coins · ${left} left today</small></div>
        <button class="gbtn green price has-icon" data-action="free-coins" ${left ? '' : 'disabled'}>${img('icon_video_ad')}<span>Watch</span></button>
      </div>`;
  }

  function grant({ gems = 0, coins = 0, noAds = false }) {
    state.gems += gems; state.coins += coins;
    state.stats.coinsEarned += coins;
    if (noAds) state.noAds = true;
    saveState(); renderHud();
    if (gems) bumpCurrency('ui-gems');
    if (coins) bumpCurrency('ui-coins');
  }

  function buy(itemId) {
    const P = PRODUCTS;
    if (itemId === 'offer') {
      grant({ gems: P.offer.gems, coins: P.offer.coins, noAds: true });
      toast(`Test purchase: +${formatNumber(P.offer.gems)} gems, +${formatNumber(P.offer.coins)} coins, No Ads`);
    } else if (itemId === 'noAds') {
      grant({ noAds: true });
      toast('Test purchase: No Ads activated');
    } else if (itemId === 'noAdsBundle') {
      grant({ noAds: true, gems: P.noAdsBundle.gems });
      toast(`Test purchase: No Ads + ${P.noAdsBundle.gems} gems`);
    } else if (P.gems.some((g) => g.id === itemId)) {
      const g = P.gems.find((x) => x.id === itemId);
      grant({ gems: g.amount });
      toast(`Test purchase: +${formatNumber(g.amount)} gems`);
    } else {
      const c = P.coins.find((x) => x.id === itemId);
      if (state.gems < c.gems) { toast(`Not enough gems (need ${c.gems})`); return; }
      state.gems -= c.gems;
      grant({ coins: c.amount });
      bumpCurrency('ui-gems');
      toast(`+${formatNumber(c.amount)} coins`);
    }
    renderStore();
    // close the offer / no-ads pop-up after buying from it
    if (openPopupEl && ['popup-noads', 'popup-offer'].includes(openPopupEl.id)) closePopup();
    if (currentScreen === 'menu') renderMenu();
  }

  // ---------- Fake video ad (shows "AD placeholder", then gives the reward) ----------
  function showAd(onReward) {
    const el = $('ad-overlay');
    let n = 3;
    $('ad-count').textContent = n;
    el.hidden = false;
    const timer = setInterval(() => {
      n -= 1;
      $('ad-count').textContent = n;
      if (n <= 0) { clearInterval(timer); el.hidden = true; onReward(); }
    }, 1000);
  }

  function watchFreeCoins() {
    if (!freeCoinsLeft()) return toast('Come back tomorrow for more free coins');
    showAd(() => {
      progressTask('video1');
      if (state.freeCoins.day !== today()) state.freeCoins = { day: today(), count: 0 };
      state.freeCoins.count += 1;
      grant({ coins: PRODUCTS.freeCoins.amount });
      toast(`+${PRODUCTS.freeCoins.amount} coins`);
      renderStore();
    });
  }

  // ---------- Activities: daily rewards ----------
  // streak = rewards claimed in a row. Missing a day restarts at Day 1; after Day 7 it starts over.
  function dailyInfo() {
    const d = state.daily;
    const claimedToday = d.last === today();
    const kept = claimedToday || d.last === yesterday();
    const streak = kept ? d.streak : 0;
    let shown = streak % 7;                       // how many of the 7 cards are checked
    if (claimedToday && shown === 0 && streak > 0) shown = 7;
    return { claimedToday, streak, shown, nextIndex: streak % 7 };
  }
  const rewardArt = (r) => (r.gems && r.coins ? 'chest' : r.gems ? 'gems_pile' : 'coins_pile');
  const rewardText = (r) => [r.coins && `${r.coins.toLocaleString('en-US')} coins`, r.gems && `${r.gems} gems`].filter(Boolean).join(' + ');

  function renderDaily() {
    const info = dailyInfo();
    const cell = (i) => {
      const r = DAILY_REWARDS[i];
      const cls = i < info.shown ? 'claimed' : (!info.claimedToday && i === info.nextIndex ? 'today' : '');
      if (i === 6) {
        return `<div class="day7 ${cls}"><h4>Day 7</h4>
          <div class="chest-art">${img('coins_pile', 'k')}${img('chest', 'c')}${img('gems_pile', 'g')}</div>
          <span class="amt">${rewardText(r)}</span>${cls === 'claimed' ? '<b class="check"></b>' : ''}</div>`;
      }
      const amount = (r.coins || r.gems).toLocaleString('en-US');
      return `<div class="day ${cls}"><h4>Day ${i + 1}</h4>${img(rewardArt(r))}<span class="amt">${amount}</span>
        ${cls === 'claimed' ? '<b class="check"></b>' : ''}</div>`;
    };
    $('daily-grid').innerHTML = DAILY_REWARDS.map((_, i) => cell(i)).join('');
    const btn = $('daily-claim');
    btn.disabled = info.claimedToday;
    btn.className = 'gbtn claim-btn ' + (info.claimedToday ? 'gray' : 'green');
    btn.querySelector('span').textContent = info.claimedToday ? 'Claimed' : 'Claim';
  }

  function claimDaily() {
    const info = dailyInfo();
    if (info.claimedToday) return;
    const r = DAILY_REWARDS[info.nextIndex];
    state.daily = { streak: info.streak + 1, last: today() };
    state.stats.daily += 1;
    grant({ gems: r.gems || 0, coins: r.coins || 0 });
    toast(`Day ${info.nextIndex + 1}: +${rewardText(r)}`);
    renderActivities();
    PSNative.scheduleDailyReward(state.settings.notifications);
  }

  // ---------- Activities: daily tasks ----------
  function tasksToday() {
    if (state.tasks.day !== today()) state.tasks = { day: today(), progress: {}, claimed: {} };
    return state.tasks;
  }
  // Call this from gameplay, e.g. progressTask('play3') when a level is played.
  function progressTask(id, amount = 1) {
    const t = tasksToday(), task = TASKS.find((x) => x.id === id);
    if (!task) return;
    t.progress[id] = Math.min(task.goal, (t.progress[id] || 0) + amount);
    saveState();
  }
  function renderTasks() {
    const t = tasksToday();
    $('task-list').innerHTML = TASKS.map((task) => {
      const p = t.progress[task.id] || 0, done = !!t.claimed[task.id], ready = p >= task.goal && !done;
      const btn = done
        ? `<button class="gbtn gray small" disabled><span>Done</span></button>`
        : `<button class="gbtn ${ready ? 'green' : 'gray'} small" data-action="claim-task" data-task="${task.id}" ${ready ? '' : 'disabled'}><span>Claim</span></button>`;
      return `<div class="task ${ready ? 'ready' : ''} ${done ? 'done' : ''}">
        ${img(task.icon)}
        <div><h4>${task.title}</h4><p>${task.desc}</p>
          <div class="bar"><i style="width:${(p / task.goal) * 100}%"></i><span>${p}/${task.goal}</span></div></div>
        <div class="task-side"><span class="task-reward">${img('coin')}${task.coins}</span>${btn}</div>
      </div>`;
    }).join('');
  }
  function claimTask(id) {
    const t = tasksToday(), task = TASKS.find((x) => x.id === id);
    if (t.claimed[id] || (t.progress[id] || 0) < task.goal) return;
    t.claimed[id] = true;
    grant({ coins: task.coins });
    toast(`${task.title}: +${task.coins} coins`);
    renderActivities();
  }

  // number shown on the red badge of the Activities button
  function activityCount() {
    const t = tasksToday();
    const tasksReady = TASKS.filter((x) => (t.progress[x.id] || 0) >= x.goal && !t.claimed[x.id]).length;
    return (dailyInfo().claimedToday ? 0 : 1) + tasksReady;
  }

  let activityTab = 'daily';
  function renderActivities() {
    renderDaily(); renderTasks();
    document.querySelectorAll('#popup-activities .tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === activityTab)));
    $('panel-daily').hidden = activityTab !== 'daily';
    $('panel-tasks').hidden = activityTab !== 'tasks';
    $('dot-daily').hidden = dailyInfo().claimedToday;
    $('dot-tasks').hidden = activityCount() - (dailyInfo().claimedToday ? 0 : 1) === 0;
    renderMidnight();
    if (currentScreen === 'menu') renderMenu();
  }

  // countdown to the player's midnight (next daily reward / task reset)
  function renderMidnight() {
    const now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    const txt = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
    setAll('ui-midnight', (el) => { el.textContent = txt; });
  }
  setInterval(() => { if (openPopupEl && openPopupEl.id === 'popup-activities') renderMidnight(); }, 1000);

  // ---------- Profile ----------
  // The last two pictures unlock at these player levels.
  const AVATARS = [
    { id: 'bee' }, { id: 'ladybug' }, { id: 'beetle' }, { id: 'butterfly' }, { id: 'ant' }, { id: 'firefly' },
    { id: 'bee_fly', cls: 'bee', level: 10 }, { id: 'ladybug_fly', cls: 'ladybug', level: 20 },
  ];
  const LEVEL_UP_REWARD = 50; // coins given at each player level-up

  function renderProfile() {
    renderHud();
    $('ui-player-name').textContent = state.playerName;
    $('ui-xp-text').textContent = `${state.xp}/${state.xpToNext}`;
    $('ui-level-reward').textContent = LEVEL_UP_REWARD;
    $('avatar-grid').innerHTML = AVATARS.map((a) => {
      const locked = a.level && state.playerLevel < a.level;
      return `<button class="av av-${a.cls || a.id} ${state.avatar === a.id ? 'sel' : ''} ${locked ? 'locked' : ''}"
        data-action="pick-avatar" data-avatar="${a.id}" ${locked ? `data-level="${a.level}"` : ''} aria-label="${a.id}">
        ${img(a.id)}${locked ? img('icon_lock', 'lock') : ''}</button>`;
    }).join('');
  }
  function pickAvatar(el) {
    if (el.dataset.level) return toast(`Unlocks at player level ${el.dataset.level}`);
    state.avatar = el.dataset.avatar; saveState(); renderProfile();
  }
  function editName() {
    const input = $('name-input'), label = $('ui-player-name');
    if (!input.hidden) return saveName();
    input.value = state.playerName; input.hidden = false; label.hidden = true;
    input.focus(); input.select();
  }
  function saveName() {
    const input = $('name-input');
    if (input.hidden) return;
    const v = input.value.trim().replace(/\s+/g, ' ');
    if (v) state.playerName = v;
    input.hidden = true; $('ui-player-name').hidden = false;
    saveState(); renderProfile();
  }
  $('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });
  $('name-input').addEventListener('blur', () => setTimeout(saveName, 150));

  // =====================================================================
  //  STORY CUTSCENE (first launch only, after the age gate) — edit texts / images here
  // =====================================================================
  // from/to = zoom at the start/end of the slow camera move, focus = the point the camera moves toward
  const STORY = [
    { img: 'art-tree', title: 'The Enchanted Art-Tree', from: 1, to: 1.12, focus: '50% 35%',
      text: 'Deep within an enchanted forest stands the Art-Tree, a magical living canvas where breathtaking pixel-art masterpieces blossom.' },
    { img: 'pixel-magic', title: 'The Magic of the Pixels', from: 1, to: 1.14, focus: '50% 55%',
      text: 'Its colorful pixel blocks are full of magic, and the little bugs soon discover amazing powers of their own!' },
    { img: 'living-canvas', title: 'A Living Canvas', from: 1, to: 1.12, focus: '55% 30%',
      text: 'Working together, the colony brings every pixel masterpiece to life, one color at a time.' },
    { img: 'discovery', title: "The Bugs' Discovery", from: 1, to: 1.12, focus: '50% 25%',
      text: 'Curious and brave, the bugs explore the forest, collecting magical resources along the way.' },
    // layered scene: background + animated bugs, nectar and sparkles (assets/story/nectar/)
    { img: 'nectar/bg', title: 'The Nectar Harvest', from: 1, to: 1.06, focus: '50% 40%',
      layers: [
        // [sprite, left %, top %, width %, css animation class, delay s]
        ['sparkle', 70, 5, 7, 'twinkle', 0], ['sparkle', 8, 17, 6, 'twinkle', 0.8], ['sparkle', 46, 40, 5, 'twinkle', 1.5],
        ['sparkle', 22, 4, 5, 'twinkle', 2.1], ['sparkle', 86, 30, 6, 'twinkle', 1.1],
        ['butterfly', 6, 22, 26, 'flutter', 0.5], ['ant', 57, 59, 18, 'walk', 0.9],
        ['bee', 32, 5, 48, 'hover', 0.2], ['ladybug', -4, 49, 62, 'walk', 1.2],
        ['drop', 36, 47, 7, 'rise', 2.0], ['drop', 46, 49, 5, 'rise', 2.9],
      ],
      text: "Now it's your turn: guide the colony as it harvests magical nectar to grow and thrive!" },
  ];
  let story = null; // { i, done }
  const storyImg = (img) => `assets/story/${img}.jpg`;
  function startStory(onDone) {
    story = { i: -1, done: onDone };
    $('cs-slides').innerHTML = STORY.map((s) => `<div class="cs-slide"><img src="${storyImg(s.img)}" alt=""
      style="--from:${s.from};--to:${s.to};--focus:${s.focus}">${(s.layers || []).map(([n, l, t, w, anim, d]) =>
        `<span class="cs-layer ${anim}" style="left:${l}%;top:${t}%;width:${w}%;--d:${d}s">${n === 'sparkle' ? '<i class="cs-spark"></i>'
          : `<img src="assets/story/nectar/${n}.png" alt="">`}</span>`).join('')}</div>`).join('');
    $('cutscene').hidden = false;
    nextStory();
  }
  function nextStory() {
    if (!story) return;
    story.i += 1;
    if (story.i >= STORY.length) return endStory();
    const s = STORY[story.i], slides = $('cs-slides').children;
    [...slides].forEach((el, k) => el.classList.toggle('on', k === story.i));
    $('cs-title').textContent = s.title;
    $('cs-text').textContent = s.text;
    $('cs-next').textContent = story.i === STORY.length - 1 ? "Let's go!" : 'Next ›';
    $('cs-dots').innerHTML = STORY.map((_, k) => `<i class="${k === story.i ? 'on' : ''}"></i>`).join('');
    const cap = document.querySelector('.cs-caption'); cap.classList.remove('fade'); void cap.offsetWidth; cap.classList.add('fade');
  }
  function endStory() {
    const done = story && story.done;
    story = null; state.storySeen = true; saveState();
    $('cutscene').hidden = true; $('cs-slides').innerHTML = '';
    if (done) done();
  }

  // ---------- Age gate ----------
  let chosenAge = null;
  function chooseAge(el) {
    chosenAge = el.dataset.age;
    document.querySelectorAll('.age-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    $('age-confirm').disabled = false;
  }
  function confirmAge() {
    if (!chosenAge) return;
    state.ageGroup = chosenAge; saveState();
    closePopup(true);
    // FTUE: brand-new players see the story, then the welcome pop-up, then the guided first level
    const welcome = () => { if (!state.tutorialSeen && state.stats.levels === 0) openPopup('popup-welcome'); };
    if (!state.storySeen) startStory(welcome); else welcome();
  }

  // ---------- Special offer pop-up ----------
  function renderOffer() {
    const o = PRODUCTS.offer;
    $('offer-contents').innerHTML = `
      <li>${img('gem')}${o.gems.toLocaleString('en-US')} gems</li>
      <li>${img('coin')}${o.coins.toLocaleString('en-US')} coins</li>
      <li>${img('icon_noads')}No Ads</li>`;
    $('offer-old-price').textContent = o.oldPrice;
    $('offer-price').textContent = o.price;
    renderOfferTimer();
  }
  function renderOfferTimer() {
    const s = Math.max(0, Math.floor((state.offer.ends - Date.now()) / 1000));
    $('ui-offer-timer').textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  }
  function openOffer() {
    if (state.offer.ends < Date.now()) state.offer.ends = Date.now() + 24 * 3600 * 1000;
    state.offer.seen = today(); saveState();
    renderOffer(); openPopup('popup-offer');
  }
  // Shown at most once a day when the game opens (never on the very first launch, never after buying No Ads).
  function maybeShowOffer() {
    if (state.launches > 1 && !state.noAds && state.offer.seen !== today()) openOffer();
  }
  setInterval(() => { if (openPopupEl && openPopupEl.id === 'popup-offer') renderOfferTimer(); }, 1000);

  // ---------- No Ads pop-up ----------
  function renderNoAds() {
    $('noads-price').textContent = PRODUCTS.noAds.price;
    $('noads-bundle-price').textContent = PRODUCTS.noAdsBundle.price;
  }

  // ---------- Skins (edit prices / texts here) ----------
  // The skin in use is the creature on the main menu and (later) the bugs in gameplay.
  const SKINS = [
    { id: 'bee',       name: 'Bee',       price: 0,   desc: 'The classic Pixel Swarm explorer!' },
    { id: 'ladybug',   name: 'Ladybug',   price: 150, desc: 'Lucky spots and a big smile. Loves red pixels!' },
    { id: 'beetle',    name: 'Beetle',    price: 200, desc: 'Strong and steady. Nothing stops this horn!' },
    { id: 'butterfly', name: 'Butterfly', price: 250, desc: 'Light as a feather and fast as the wind.' },
    { id: 'ant',       name: 'Ant',       price: 300, desc: 'A hard worker who never gives up.' },
    { id: 'firefly',   name: 'Firefly',   price: 400, level: 5, desc: 'Glows in the dark. Perfect for night levels!' },
  ];
  let viewingSkin = null;

  function renderSkins() {
    if (!viewingSkin) viewingSkin = state.creature;
    const v = SKINS.find((s) => s.id === viewingSkin);
    $('skin-preview').src = `assets/sprites/${v.id}.png`;
    $('skin-name').textContent = v.name;
    $('skin-inuse').hidden = state.creature !== v.id;
    $('skin-desc').textContent = v.desc;
    $('skin-grid').innerHTML = SKINS.map((s) => {
      const owned = state.ownedSkins.includes(s.id), inUse = state.creature === s.id;
      const lockedByLevel = !owned && s.level && state.playerLevel < s.level;
      let btn;
      if (inUse) btn = `<button class="gbtn blue small" disabled><span>In Use</span></button>`;
      else if (owned) btn = `<button class="gbtn green small" data-action="skin-use" data-skin="${s.id}"><span>Use</span></button>`;
      else if (lockedByLevel) btn = `<button class="gbtn gray small" data-action="skin-view" data-skin="${s.id}"><span>Level ${s.level}</span></button>`;
      else btn = `<button class="gbtn green small has-icon" data-action="skin-buy" data-skin="${s.id}">${img('gem')}<span>${s.price}</span></button>`;
      return `<div class="skin-card ${inUse ? 'inuse' : ''} ${viewingSkin === s.id ? 'viewing' : ''} ${lockedByLevel ? 'locked' : ''}"
          data-action="skin-view" data-skin="${s.id}">
        ${inUse ? '<b class="check"></b>' : ''}
        <div class="art">${img(s.id)}${lockedByLevel ? img('icon_lock', 'lock') : ''}</div>${btn}</div>`;
    }).join('');
  }
  function viewSkin(id) {
    viewingSkin = id; renderSkins();
    const s = SKINS.find((x) => x.id === id);
    if (s.level && !state.ownedSkins.includes(id) && state.playerLevel < s.level) toast(`Unlocks at player level ${s.level}`);
  }
  function stepSkin(dir) {
    const i = SKINS.findIndex((s) => s.id === viewingSkin);
    viewingSkin = SKINS[(i + dir + SKINS.length) % SKINS.length].id; renderSkins();
  }
  function useSkin(id) {
    state.creature = id; viewingSkin = id; saveState(); renderSkins();
    toast(`${SKINS.find((s) => s.id === id).name} selected!`);
  }
  function buySkin(id) {
    const s = SKINS.find((x) => x.id === id);
    if (state.gems < s.price) { toast(`Not enough gems (need ${s.price})`); return; }
    state.gems -= s.price; state.ownedSkins.push(id);
    saveState(); renderHud(); bumpCurrency('ui-gems');
    useSkin(id);
    toast(`${s.name} unlocked!`);
  }

  // =====================================================================
  //  THEMES & LEVELS  (data in js/data.js)
  // =====================================================================
  const D = window.PS_DATA;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const themeById = (id) => D.THEMES.find((t) => t.id === id) || (id === D.EVENT.id ? D.EVENT : undefined);
  const levelStars = (theme, diff) => state.progress[`${theme}-${diff}`] || [];
  const levelsDone = (theme, diff) => levelStars(theme, diff).length;
  // Easy is always open; Medium opens when Easy is finished; Hard when Medium is finished.
  function diffUnlocked(theme, diff) {
    const i = D.DIFFICULTIES.indexOf(diff);
    return i === 0 || levelsDone(theme, D.DIFFICULTIES[i - 1]) >= D.LEVELS_PER_DIFFICULTY;
  }
  function nextLevel(theme) {
    for (const diff of D.DIFFICULTIES) {
      const done = levelsDone(theme, diff);
      if (done < D.LEVELS_PER_DIFFICULTY) return diffUnlocked(theme, diff) ? { theme, diff, index: done } : null;
    }
    return null; // whole theme finished
  }
  const starsHtml = (n) => `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;

  function renderThemes() {
    $('theme-list').innerHTML = D.THEMES.map((t) => {
      const total = D.DIFFICULTIES.reduce((a, d) => a + levelsDone(t.id, d), 0);
      const pills = D.DIFFICULTIES.map((d) => {
        const open = diffUnlocked(t.id, d), done = levelsDone(t.id, d) >= D.LEVELS_PER_DIFFICULTY;
        return `<button class="dpill ${open ? d : 'locked'}" data-action="open-theme" data-theme="${t.id}" data-diff="${d}">
          ${open ? '' : img('icon_lock')}${cap(d)}${done ? ' <span class="ok">✓</span>' : ''}</button>`;
      }).join('');
      return `<div class="theme-row"><img src="${D.pictureURL(t.pictures[0], 8)}" alt="">
        <div><h4>${t.name}<small>${total}/${D.LEVELS_PER_DIFFICULTY * 3}</small></h4><div class="pills">${pills}</div></div></div>`;
    }).join('');
  }

  let viewingTheme = 'flowers';
  function renderThemeLevels() {
    const t = themeById(viewingTheme), next = nextLevel(t.id);
    $('theme-tabs').innerHTML = D.THEMES.map((x) => `<button class="tt ${x.id === t.id ? 'on' : ''}" data-action="pick-theme" data-theme="${x.id}">
      <img src="${D.pictureURL(x.pictures[0], 6)}" alt=""><span>${x.name}</span></button>`).join('');
    $('th-pic').src = D.pictureURL(t.pictures[1] || t.pictures[0], 8);
    $('th-name').textContent = t.name;
    $('th-desc').textContent = `Complete pixel-art ${t.name.toLowerCase()} and unlock new challenges!`;
    $('diff-sections').innerHTML = D.DIFFICULTIES.map((d, di) => {
      const stars = levelStars(t.id, d), open = diffUnlocked(t.id, d);
      const tiles = Array.from({ length: D.LEVELS_PER_DIFFICULTY }, (_, i) => {
        const done = i < stars.length, playable = open && i <= stars.length;
        const current = next && next.diff === d && next.index === i;
        const num = di * D.LEVELS_PER_DIFFICULTY + i + 1;
        if (!playable) return `<div class="lvl locked">${img('icon_lock')}<span class="num">${num}</span></div>`;
        return `<button class="lvl pic ${d} ${current ? 'current' : ''}" data-action="play-level" data-theme="${t.id}" data-diff="${d}" data-index="${i}">
          <img class="thumb" src="${D.pictureURL(D.levelPicture(t.id, d, i), 5)}" alt="">${done ? starsHtml(stars[i]) : ''}<span class="num">${num}</span></button>`;
      }).join('');
      const got = stars.reduce((a, b) => a + b, 0);
      return `<div class="diff-sec ${d}" id="sec-${d}"><h4>${cap(d)}</h4><span class="stars-total">★ ${got}/${D.LEVELS_PER_DIFFICULTY * 3}</span>
        <div class="lvl-row">${tiles}</div></div>`;
    }).join('');
  }
  function openTheme(themeId, diff) {
    if (diff && !diffUnlocked(themeId, diff)) {
      const prev = D.DIFFICULTIES[D.DIFFICULTIES.indexOf(diff) - 1];
      return toast(`Finish ${cap(prev)} to unlock ${cap(diff)}`);
    }
    viewingTheme = themeId; state.selected.theme = themeId; saveState();
    showScreen('theme');
    if (diff) { const sec = $('sec-' + diff); if (sec) sec.scrollIntoView({ block: 'start' }); }
  }
  function stepTheme(dir) {
    const i = D.THEMES.findIndex((t) => t.id === viewingTheme);
    viewingTheme = D.THEMES[(i + dir + D.THEMES.length) % D.THEMES.length].id;
    state.selected.theme = viewingTheme; saveState(); renderThemeLevels();
  }
  // Called by the Play button and by level tiles. Gameplay comes after all screens are done.
  function startLevel(theme, diff, index) {
    state.selected.theme = theme; saveState();
    startGame(theme, diff, index);
  }

  // =====================================================================
  //  TRACKING (gameplay reports here; feeds daily tasks, event and achievements)
  // =====================================================================
  // track('level', { theme, diff, index, stars })  — a level was won
  // track('booster')                                — a booster was used
  function track(kind, info = {}) {
    if (kind === 'level') {
      // event levels have their own progress (state.event.levels) and give pumpkins on the first win
      const arr = info.event ? state.event.levels
        : (state.progress[`${info.theme}-${info.diff}`] || (state.progress[`${info.theme}-${info.diff}`] = []));
      if (info.index < arr.length) arr[info.index] = Math.max(arr[info.index], info.stars);
      else if (info.index === arr.length) { arr.push(info.stars); if (info.event) state.event.pumpkins += EVENT_PUMPKINS_PER_WIN; }
      const pic = D.levelPicture(info.theme, info.diff, info.index);
      if (!state.gallery.includes(pic)) state.gallery.push(pic);
      state.stats.levels += 1;
      progressTask('play3');
      if (info.diff === 'hard') { state.stats.hard += 1; progressTask('hard1'); }
    }
    if (kind === 'booster') { state.stats.boosters += 1; progressTask('boosters2'); }
    saveState();
  }
  window.PS_track = track; // used by the gameplay code

  // =====================================================================
  //  COLLECTIONS
  // =====================================================================
  const ACHIEVEMENTS = [
    { title: 'First Level',    icon: 'trophy',          goal: 1,    value: () => state.stats.levels },
    { title: 'Level Lover',    icon: 'icon_speed',      goal: 25,   value: () => state.stats.levels },
    { title: 'Booster Master', icon: 'booster_shuffle', goal: 10,   value: () => state.stats.boosters },
    { title: 'Coin Collector', icon: 'coins_pile',      goal: 5000, value: () => state.stats.coinsEarned },
    { title: 'Gem Collector',  icon: 'gems_pile',       goal: 500,  value: () => state.gems },
    { title: 'Daily Player',   icon: 'icon_activities', goal: 7,    value: () => state.stats.daily },
    { title: 'Hard Winner',    icon: 'star',            goal: 5,    value: () => state.stats.hard },
    { title: 'Event Expert',   icon: 'icon_events',     goal: 100,  value: () => state.event.pumpkins },
    { title: 'Bug Collector',  icon: 'bee',             goal: 6,    value: () => state.ownedSkins.length },
  ];
  const COL_PAGE_SIZE = { gallery: 6, achievements: 9, bugs: 12 };
  let colTab = 'gallery', colPage = 0;
  function renderCollections() {
    document.querySelectorAll('#screen-collections .tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === colTab)));
    let items, html, counter;
    if (colTab === 'gallery') {
      items = Object.keys(D.PICTURES);
      counter = `Completed ${state.gallery.length}/${items.length}`;
      html = (page) => `<div class="grid2">${page.map((id) => state.gallery.includes(id)
        ? `<div class="pic-card"><img src="${D.pictureURL(id, 10)}" alt=""><span class="name">${D.PICTURES[id].name}</span>
            <button class="mini-btn" data-action="share" data-pic="${id}">Share</button></div>`
        : `<div class="pic-card locked"><img src="${D.pictureURL(id, 10, { silhouette: true })}" alt=""><span class="name">???</span></div>`).join('')}</div>`;
    } else if (colTab === 'achievements') {
      items = ACHIEVEMENTS;
      const done = items.filter((a) => a.value() >= a.goal).length;
      counter = `${done}/${items.length}`;
      html = (page) => `<div class="grid3x">${page.map((a, i) => {
        const v = Math.min(a.goal, a.value()), ok = v >= a.goal;
        return `<div class="ach ${ok ? 'c' + (i % 5) : 'locked'}">${img(a.icon)}<h4>${a.title}</h4>
          <div class="bar"><i style="width:${(v / a.goal) * 100}%"></i><span>${v.toLocaleString('en-US')}/${a.goal.toLocaleString('en-US')}</span></div></div>`;
      }).join('')}</div>`;
    } else {
      items = SKINS;
      counter = `Collected ${state.ownedSkins.length}/${items.length}`;
      html = (page) => `<div class="grid3x">${page.map((s) => state.ownedSkins.includes(s.id)
        ? `<div class="bug-card"><b class="check"></b>${img(s.id)}</div>`
        : `<div class="bug-card locked">${img(s.id)}${img('icon_lock', 'lock')}</div>`).join('')}</div>`;
    }
    const size = COL_PAGE_SIZE[colTab], pages = Math.max(1, Math.ceil(items.length / size));
    colPage = Math.min(colPage, pages - 1);
    $('col-counter').textContent = counter;
    $('col-grid').innerHTML = html(items.slice(colPage * size, colPage * size + size));
    $('col-page').textContent = `${colPage + 1}/${pages}`;
  }
  function sharePicture(id) {
    const text = `I completed "${D.PICTURES[id].name}" in Pixel Swarm!`;
    if (navigator.share) navigator.share({ title: 'Pixel Swarm', text }).catch(() => {});
    else copyText(text, 'Copied — paste it to share!');
  }

  // =====================================================================
  //  EVENTS (Halloween Hunt)
  // =====================================================================
  // Players win the 12 event levels to collect pumpkins; pumpkins unlock the event rewards.
  const EVENT_PUMPKINS_PER_WIN = 10;            // 12 levels × 10 = 120 = the last reward
  const EVENT_REWARDS = [
    { at: 20, coins: 500, icon: 'coins_pile', label: '500' },
    { at: 40, gems: 50, icon: 'gems_pile', label: '50' },
    { at: 60, coins: 1500, icon: 'chest', label: '1,500' },
    { at: 80, gems: 100, icon: 'gem', label: '100' },
    { at: 120, gems: 200, coins: 3000, icon: 'trophy', label: 'Big Prize' },
  ];
  function renderEvents() {
    const E = state.event, N = D.EVENT.levels, done = E.levels.length;
    renderEventTimer();
    // level path: rows of 3, the path turns right / left between rows
    let html = '';
    for (let r = 0; r < N / 3; r++) {
      html += '<div class="ev-row">';
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        if (i < done) html += `<button class="ev-node" data-action="event-level" data-i="${i}">${i + 1}${starsHtml(E.levels[i])}</button>`;
        else if (i === done) html += `<button class="ev-node current" data-action="event-level" data-i="${i}">${i + 1}${starsHtml(0)}</button>`;
        else html += `<div class="ev-node locked">${img('icon_lock')}${i + 1}</div>`;
      }
      html += '</div>';
      if (r < N / 3 - 1) html += `<div class="ev-turn ${r % 2 === 0 ? 'right' : 'left'}"></div>`;
    }
    html += `<img class="ev-deco" src="assets/sprites/pumpkin.png" alt="" style="left:2px;top:40%">
      <img class="ev-deco" src="assets/sprites/pumpkin.png" alt="" style="right:2px;bottom:6px;width:34px">`;
    $('event-map').innerHTML = html;
    // pumpkin bar + rewards
    const max = EVENT_REWARDS[EVENT_REWARDS.length - 1].at;
    $('ev-bar').style.width = Math.min(100, (E.pumpkins / max) * 100) + '%';
    $('ev-count').textContent = `${E.pumpkins}/${max}`;
    $('event-rewards').innerHTML = EVENT_REWARDS.map((rw, i) => {
      const claimed = E.claimedRewards.includes(i), ready = !claimed && E.pumpkins >= rw.at;
      return `<div class="evr ${claimed ? 'done' : ready ? 'ready' : ''}">
        <button data-action="event-reward" data-i="${i}" aria-label="Reward at ${rw.at} pumpkins">${img(rw.icon)}
          ${claimed ? '<b class="check"></b>' : ready ? '' : img('icon_lock', 'lockb')}</button>
        <span class="lbl">${rw.label}</span><span class="at">${rw.at}</span></div>`;
    }).join('');
  }
  function startEventLevel(i) {
    if (i > state.event.levels.length) return toast('Win the previous event level first');
    startGame(D.EVENT.id, D.eventDiff(i), i, { event: true });
  }
  function claimEventReward(i) {
    const r = EVENT_REWARDS[i], E = state.event;
    if (E.claimedRewards.includes(i)) return toast('Already claimed');
    if (E.pumpkins < r.at) return toast(`Collect ${r.at} pumpkins to claim`);
    E.claimedRewards.push(i);
    grant({ coins: r.coins || 0, gems: r.gems || 0 });
    toast(`Event reward: +${rewardText(r)}`); renderEvents();
  }

  // =====================================================================
  //  GAMEPLAY SCREEN (layout + flow; block/bee mechanics come next)
  // =====================================================================
  // picture size, slots, block sizes and puzzles per difficulty: see DIFFICULTY in js/data.js
  const WIN_COINS = { easy: 30, medium: 45, hard: 60 };
  // Boosters (doc: Add slot, Shuffle, Wing help, Free pick) and the number of won levels that unlocks each.
  const BOOSTERS = [
    { id: 'add_slot', icon: 'booster_add_slot', name: 'Add Slot', unlockAt: 0, desc: 'Adds one more slot for this level.' },
    { id: 'shuffle',  icon: 'booster_shuffle',  name: 'Shuffle',  unlockAt: 11, desc: 'Changes the colors of the blocks in line.' },
    { id: 'wing',     icon: 'booster_wind',     name: 'Wind', unlockAt: 14, desc: 'Tap a color in the picture and the wind blows away all of its pixels.' },
    { id: 'pick',     icon: 'booster_pick',     name: 'Free Pick', unlockAt: 16, desc: 'Pick any block in line and send it to a free slot.' },
  ];
  let game = null;

  // ---- reachability, shared by the game and the level generator (they must always agree) ----
  // Bees enter from below the board and travel through open cells (up, down, left, right).
  // Returns Map(pixelIndex -> distance from the tree) of every pixel the bees can reach right now.
  function reachMap(cells, isOpen) {
    const H = cells.length, W = cells[0].length, dist = new Int32Array(W * H).fill(-1), q = [], best = new Map();
    const touch = (k, d) => { if (!best.has(k) || best.get(k) > d) best.set(k, d); };
    for (let x = 0; x < W; x++) {
      const k = (H - 1) * W + x;
      if (isOpen(x, H - 1)) { dist[k] = 1; q.push(k); } else touch(k, 1);
    }
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], x = k % W, y = (k / W) | 0, d = dist[k];
      const nb = [x < W - 1 ? k + 1 : -1, x > 0 ? k - 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1];
      for (const nk of nb) {
        if (nk < 0) continue;
        if (isOpen(nk % W, (nk / W) | 0)) { if (dist[nk] < 0) { dist[nk] = d + 1; q.push(nk); } }
        else touch(nk, d + 1);
      }
    }
    return best;
  }
  // the reachable pixel of a color closest to the tree (ties: lowest row, then nearest the centre)
  // take(k) = which pixel a bee really takes when it reaches cell k (-1 = can't take it; see takeFn)
  function pickTarget(cells, isOpen, color, take) {
    const W = cells[0].length, mid = (W - 1) / 2;
    let bestK = -1, bd = 1e9, by = -1, bx = 1e9;
    for (const [k, d] of reachMap(cells, isOpen)) {
      const x = k % W, y = (k / W) | 0;
      if (cells[y][x] !== color) continue;
      const tk = take ? take(k) : k;
      if (tk < 0) continue;
      const cx = Math.abs(x - mid);
      if (d < bd || (d === bd && (y > by || (y === by && cx < bx)))) { bd = d; by = y; bx = cx; bestK = tk; }
    }
    return bestK < 0 ? null : [bestK % W, (bestK / W) | 0];
  }
  function reachableColors(cells, isOpen, take) {
    const W = cells[0].length, set = new Set();
    for (const k of reachMap(cells, isOpen).keys()) if (!take || take(k) >= 0) set.add(cells[(k / W) | 0][k % W]);
    return set;
  }

  // ---- PUZZLES (shared rules: game, level generator and checkers all use these) ----
  // Based on the design doc references (Colony-Flow-style games):
  //  PICTURE  cover: Map(cell -> 'wood' | 'cookie') — covered cells block the bugs and can't be eaten.
  //             wood: a plank with a number = hammers needed; the HAMMERS are items in the line.
  //             cookie: a number = pixels to clear anywhere to break it.
  //           big: Map(cell -> group) — one big pixel over 2x2 / 3x3 cells; its number = bites needed (more bugs).
  //           keys: Map(cell -> lock id) — eating that pixel collects the key and opens its lock in the line.
  //           hidden: purple "?" pixels; they show their color once the path to them is cleared.
  //  LINE     { kind: 'lock' } padlock tile blocking its column; { kind: 'hammer' } tap to hit the wood;
  //           { kind: 'pipe', items } holds blocks and pushes the next one up when the space above it is free.
  //           blocks can be mystery, frozen, or linked (picked together, leave the slots together).
  function openFn(g) {
    const W = g.cells[0].length;
    return (x, y) => {
      const k = y * W + x;
      if ((g.cover && g.cover.has(k)) || (g.big && g.big.has(k))) return false;
      return !g.cells[y][x] || !!(g.reserved && g.reserved.has(k));
    };
  }
  function takeFn(g) {
    return (k) => {
      if (g.cover && g.cover.has(k)) return -1;
      const grp = g.big && g.big.get(k);
      if (!grp) return k;
      return grp.left > 0 && !(g.reserved && g.reserved.has(grp.cells[0])) ? grp.cells[0] : -1;
    };
  }
  // a bug (or a checker) eats pixel k. Returns the puzzle events it caused: 'big', 'key', 'cookie'
  function eatPixel(g, k) {
    const W = g.cells[0].length, x = k % W, y = (k / W) | 0, ev = [];
    const grp = g.big && g.big.get(k);
    if (grp) {
      if (grp.left <= 0) return ev;
      grp.left -= 1; g.remaining -= 1;
      if (grp.left === 0) {
        grp.cells.forEach((q) => { g.cells[(q / W) | 0][q % W] = null; g.big.delete(q); });
        ev.push('big'); ev.cells = grp.cells;
      }
    } else {
      if (!g.cells[y][x]) return ev;
      g.cells[y][x] = null; g.remaining -= 1;
    }
    if (g.keys && g.keys.has(k)) { g.unlocked.add(g.keys.get(k)); g.keys.delete(k); ev.push('key'); }
    if (g.cookie && g.cookie.left > 0 && --g.cookie.left === 0) {
      ev.push('cookie');
      for (const [q, t] of g.cover) if (t === 'cookie') g.cover.delete(q);
    }
    return ev;
  }
  // a hammer from the line hits the wood plank. true = the wood broke
  function hitWood(g) {
    if (!g.wood || g.wood.left <= 0) return false;
    if (--g.wood.left > 0) return false;
    for (const [q, t] of g.cover) if (t === 'wood') g.cover.delete(q);
    return true;
  }
  // tidy the line: open locks whose key was found, and pipes at the front push their next block up
  function settle(g) {
    g.cols.forEach((col, c) => {
      g.cols[c] = col = col.filter((it) => !(it.kind === 'lock' && g.unlocked.has(it.id)));
      while (col[0] && col[0].kind === 'pipe') {
        const p = col[0];
        if (!p.items.length) { col.shift(); continue; }
        col.unshift(p.items.shift());
        if (!p.items.length) col.splice(1, 1);
        break;
      }
    });
  }
  const isBlock = (it) => !!it && !it.kind;
  // where the linked partner of block b is in the line: [column, index] (pipes hide their blocks)
  function findPartner(g, b) {
    for (let c = 0; c < g.cols.length; c++) {
      const i = g.cols[c].findIndex((o) => o !== b && isBlock(o) && o.link === b.link);
      if (i >= 0) return [c, i];
    }
    return null;
  }
  // fresh puzzle state for a level object from a placement plan (the generator's simulation uses its own copy)
  function applyBoard(o, plan) {
    o.cover = new Map(); o.big = new Map(); o.keys = new Map(plan.keys || []); o.unlocked = new Set();
    (plan.wood ? plan.wood.cells : []).forEach((k) => o.cover.set(k, 'wood'));
    o.wood = plan.wood ? { left: plan.wood.hits, hits: plan.wood.hits, cells: plan.wood.cells } : null;
    (plan.cookie ? plan.cookie.cells : []).forEach((k) => o.cover.set(k, 'cookie'));
    o.cookie = plan.cookie ? { left: plan.cookie.n, n: plan.cookie.n, cells: plan.cookie.cells } : null;
    (plan.big || []).forEach(({ cells, need }) => { const grp = { cells, left: need, need }; cells.forEach((k) => o.big.set(k, grp)); });
    o.hidden = new Set(plan.hidden || []);
    return o;
  }
  const BOARD_PUZZLES = new Set(['hidden', 'big', 'wood', 'cookie']);
  // which puzzles a level has (see DIFFICULTY[diff].puzzles in js/data.js). force = test a list of puzzles
  function levelPuzzles(theme, diff, index, force) {
    if (force) return new Set(force);
    const sched = D.DIFFICULTY[diff].puzzles || {}, set = new Set();
    const r = rng(theme.length * 31 + index * 7 + D.DIFFICULTIES.indexOf(diff) * 101 + 5);
    Object.entries(sched).forEach(([p, at]) => {
      if (index === at) set.add(p);
      else if (at >= 0 ? index > at && r() < 0.45 : r() < 0.25) set.add(p);
    });
    return set;
  }

  // simple seeded random so a level always builds the same way
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  // Builds a level with its puzzles. Every level is checked with the solution player (checkLevel);
  // if a puzzle mix would make it impossible, the queue puzzles and then the board puzzles are dropped.
  function buildLevel(theme, diff, index, force) {
    const want = levelPuzzles(theme, diff, index, force);
    const tries = [want, new Set([...want].filter((p) => BOARD_PUZZLES.has(p))), new Set()];
    for (const p of tries) if (checkLevel(makeLevel(theme, diff, index, p)) === 'ok') return makeLevel(theme, diff, index, p);
    return makeLevel(theme, diff, index, new Set());
  }
  function makeLevel(theme, diff, index, puzzles) {
    const picId = D.levelPicture(theme, diff, index), grid = D.levelGrid(picId, diff), cfg = D.DIFFICULTY[diff];
    const cells = grid.map((row) => [...row].map((ch) => (ch === '.' ? null : ch)));
    const counts = {};
    grid.forEach((row) => [...row].forEach((ch) => { if (ch !== '.') counts[ch] = (counts[ch] || 0) + 1; }));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const seed = theme.length * 997 + D.DIFFICULTIES.indexOf(diff) * 131 + index * 17;
    const rand = rng(seed), prand = rng(seed * 7 + 12345); // prand: puzzle placement only
    const W = grid[0].length, H = grid.length;
    const pick = (arr) => arr[Math.floor(prand() * arr.length)];

    // ---- 1. place the picture puzzles ----
    const plan = {}, used = new Set();
    const rect = (w, h, y0) => {
      const x0 = Math.floor(prand() * (W - w + 1)), out = [];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const k = y * W + x; if (cells[y][x] && !used.has(k)) out.push(k); }
      out.forEach((k) => used.add(k));
      return out;
    };
    if (puzzles.has('wood')) { // a wood plank across the middle of the picture; 2–3 hammers in the line break it
      const w = Math.max(3, Math.round(W * 0.5)), h = Math.max(2, Math.round(H * 0.14));
      plan.wood = { cells: rect(w, h, Math.round(H * 0.3 + prand() * H * 0.15)), hits: 2 + Math.floor(prand() * 2) };
    }
    if (puzzles.has('cookie')) { // a big cookie in the upper half; breaks after ~25% of the picture is eaten
      const d = Math.max(4, Math.round(W * 0.3));
      plan.cookie = { cells: rect(d, d, Math.round(H * 0.08 + prand() * H * 0.1)), n: Math.max(8, Math.round(total * 0.25)) };
    }
    let extra = 0; // big pixels need more bites than they have cells
    if (puzzles.has('big')) { // squares of one color: 2x2 on small pictures, 3x3 on big ones; number = bugs needed
      const S = W >= 24 ? 3 : 2, cand = [];
      for (let y = 0; y <= H - S; y++) for (let x = 0; x <= W - S; x++) {
        const c = cells[y][x], sq = [];
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) if (cells[y + dy][x + dx] === c) sq.push((y + dy) * W + x + dx);
        if (c && sq.length === S * S) cand.push(sq);
      }
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(prand() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
      plan.big = [];
      const want = W >= 30 ? 5 : W >= 20 ? 4 : 3;
      for (const q of cand) {
        if (plan.big.length >= want) break;
        if (q.some((k) => used.has(k))) continue;
        q.forEach((k) => used.add(k));
        const need = S === 2 ? 10 : 15; // like the references: a 2x2 big pixel needs 10 bugs
        plan.big.push({ cells: q, need }); extra += need - q.length;
      }
    }
    if (puzzles.has('hidden')) { // ~40% of the pixels above the bottom quarter start hidden (visual only)
      plan.hidden = [];
      for (let y = 0; y < Math.floor(H * 0.75); y++) for (let x = 0; x < W; x++) if (cells[y][x] && !used.has(y * W + x) && prand() < 0.4) plan.hidden.push(y * W + x);
    }
    const total2 = total + extra;

    // ---- 2. build the blocks from a guaranteed solution ----
    // Simulate the bugs with the same rules as the game (bottom pixels first, centre first, puzzles included).
    // Each step: pick a color that has an exposed pixel, eat up to blockMin..blockMax of it -> that is one block.
    // Dealing these blocks across the columns in order means a careful player can always finish the level.
    // Hammers are part of that order too: the plank breaks in the simulation when the last hammer is used.
    const s = applyBoard({ cells: cells.map((r) => r.slice()), reserved: new Set(), remaining: total2 }, plan);
    const sim = s.cells, simOpen = openFn(s), simTake = takeFn(s);
    const simTarget = (color) => pickTarget(sim, simOpen, color, simTake); // same rule as the bugs in the game
    const blocks = [], eatenBy = new Map(); // pixel -> index (in the order) of the block that ate it
    // hammers: spread over the first ~4–12 places of the order
    const hammerAt = [];
    if (plan.wood) for (let h = 0; h < plan.wood.hits; h++) hammerAt.push(3 + h * 3 + Math.floor(prand() * 3));
    while (s.remaining > 0) {
      let options = [...reachableColors(sim, simOpen, simTake)];
      while (hammerAt.length && (blocks.length >= hammerAt[0] || !options.length)) {
        hammerAt.shift(); blocks.push({ kind: 'hammer' }); hitWood(s);
        options = [...reachableColors(sim, simOpen, simTake)];
      }
      if (!options.length) return null; // the puzzles closed the picture off: caller tries without them
      const target = Math.round(cfg.blockMin + rand() * (cfg.blockMax - cfg.blockMin));
      // prefer colors that can make a full-size block right now (avoids tiny 1–2 pixel blocks)
      const reach = (color) => {
        let k = 0, tt;
        while (k < target && (tt = simTarget(color))) { s.reserved.add(tt[1] * W + tt[0]); k += 1; }
        s.reserved.clear();
        return k;
      };
      // random color, but if it would only make a tiny block (< 4 pixels) and another color can make
      // a decent one, use that one instead
      let color = options[Math.floor(rand() * options.length)];
      if (reach(color) < 4) {
        const decent = options.filter((c) => reach(c) >= 4);
        if (decent.length) color = decent[Math.floor(rand() * decent.length)];
      }
      let n = 0, t;
      const eaten = [];
      while (n < target && (t = simTarget(color))) { const k = t[1] * W + t[0]; eatPixel(s, k); eaten.push(k); n += 1; }
      const prev = blocks[blocks.length - 1];
      if (isBlock(prev) && prev.color === color && prev.amount + n <= cfg.blockMax) prev.amount += n; // avoid tiny repeats
      // the first 3 blocks start at the front of the columns: never frozen there (it would break the solution order)
      else blocks.push({ color, amount: n, mystery: rand() < cfg.mystery, frozen: blocks.length >= 3 && rand() < cfg.frozen });
      eaten.forEach((k) => eatenBy.set(k, blocks.length - 1));
    }
    while (hammerAt.length) { hammerAt.shift(); blocks.push({ kind: 'hammer' }); } // (only if the picture finished first)

    // ---- 3. line puzzles ----
    let id = 0;
    const free = (b) => isBlock(b) && !b.frozen && !b.link && !b.locked;
    if (puzzles.has('linked') || puzzles.has('mlinked')) {
      // two blocks next to each other in the solution order are chained (side by side, or diagonal across rows)
      const n = W >= 30 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const ok = blocks.map((b, i) => i).filter((i) => free(blocks[i]) && free(blocks[i + 1]));
        if (!ok.length) break;
        const i = pick(ok); id += 1;
        blocks[i].link = id; blocks[i + 1].link = id;
        if (puzzles.has('mlinked') && k === 0) blocks[i + (prand() < 0.5 ? 0 : 1)].mystery = 'deep'; // hidden until it's in a slot
      }
    }
    const locks = []; // [index in the order, lock id]: a padlock tile in front of that block
    if (puzzles.has('key')) {
      // the key sits on a pixel the solution eats 2–6 blocks before the lock reaches the front
      const cand = blocks.map((b, i) => i).filter((i) => i >= 4 && free(blocks[i]));
      for (let k = 0; k < (W >= 30 ? 2 : 1) && cand.length; k++) {
        const j = cand.splice(Math.floor(prand() * cand.length), 1)[0];
        const pix = [...eatenBy].filter(([p, bi]) => bi >= j - 6 && bi <= j - 2 && !used.has(p)).map(([p]) => p);
        if (!pix.length) continue;
        const p = pick(pix); used.add(p); id += 1;
        blocks[j].locked = true; locks.push([j, id]); (plan.keys = plan.keys || []).push([p, id]);
      }
    }
    const cols = [[], [], []];
    blocks.forEach((b, i) => {
      const lk = locks.find(([j]) => j === i);
      if (lk) cols[i % 3].push({ kind: 'lock', id: lk[1] });
      cols[i % 3].push(b);
    });
    blocks.forEach((b) => { delete b.locked; });
    if (puzzles.has('pipe')) {
      // a pipe tile holds 2–4 blocks of its column and pushes them up one by one
      const order = [0, 1, 2].sort(() => prand() - 0.5);
      for (const c of order.slice(0, W >= 30 ? 2 : 1)) {
        const r = 1 + Math.floor(prand() * 2), len = 2 + Math.floor(prand() * 3), seg = cols[c].slice(r, r + len);
        if (seg.length < 2 || seg.some((b) => !isBlock(b) || b.link)) continue;
        cols[c].splice(r, len, { kind: 'pipe', items: seg });
      }
    }
    // slotPlace says where each slot is drawn: 'main' row, or 'ad0' / 'ad1' (an AD slot opened by the player)
    const lvl = applyBoard({ theme, diff, index, picId, grid, cfg, cells, cols, puzzles,
      slots: Array(cfg.slots).fill(null), slotPlace: Array(cfg.slots).fill('main'),
      speed: 1, bees: [], reserved: new Set(), pending: new Map(), // every level starts at normal speed
      remaining: total2, extras: 0, mode: null, over: false, last: 0, launchTimer: 0 }, plan);
    settle(lvl);
    return lvl;
  }

  // ---- tuning (milliseconds at 1x speed) ----
  const LAUNCH_MS = 520;   // time between bees leaving one slot (slow on purpose: 2x is worth using)
  const FLY_MS = 2000;     // flight time from the hole to the picture (way back is 85% of this)
  const FAST_SPEED = 2;    // the speed button switches between 1x and 2x

  let loopOn = false;
  function startGame(theme, diff, index, opts = {}) {
    clearBees();
    game = buildLevel(theme, diff, index, opts.puzzles);
    game.event = !!opts.event;
    showScreen('game');
    renderGame();
    if (!loopOn) { loopOn = true; nextTick(); }
    // first level ever: tutorial. New puzzle types: "New Feature!" pop-up the first time they appear.
    if (state.stats.levels === 0 && !state.tutorialSeen) startTutorial();
    else {
      const all = game.cols.flat(), has = new Set(game.puzzles);
      if (all.some((b) => b.mystery === true)) has.add('mystery');
      if (all.some((b) => b.frozen)) has.add('frozen');
      if (!all.some((b) => b.link)) { has.delete('linked'); has.delete('mlinked'); }
      if (!all.some((b) => b.kind === 'lock')) has.delete('key');
      if (!all.some((b) => b.kind === 'pipe')) has.delete('pipe');
      if (!all.some((b) => b.kind === 'hammer')) has.delete('wood');
      const fresh = PUZZLE_ORDER.find((p) => has.has(p) && !state.seen[p]);
      if (fresh) { state.seen[fresh] = true; saveState(); showUnlock('feature', FEATURES[fresh]); }
    }
  }
  function renderGame() {
    const g = game, t = themeById(g.theme);
    $('g-level').textContent = g.event ? `Event ${g.index + 1}` : `Level ${D.DIFFICULTIES.indexOf(g.diff) * D.LEVELS_PER_DIFFICULTY + g.index + 1}`;
    $('g-sub').textContent = `${t.name} • ${cap(g.diff)}`;
    renderSpeed();
    $('g-board').parentElement.classList.toggle('walled', g.cfg.walls); // doc: walls around the picture only in Hard
    layoutBoard(); renderSlots(); renderQueue(); renderBoosters(); renderHud();
    setHint(null);
  }
  // Sizes the canvas to the screen's real pixels with a WHOLE number of pixels per cell,
  // so every gap between pixels is exactly the same (no uneven lines after scaling).
  function layoutBoard() {
    const g = game, cv = $('g-board'), box = cv.parentElement;
    const cs = getComputedStyle(box), dpr = window.devicePixelRatio || 1;
    const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const cols = g.cells[0].length, rows = g.cells.length;
    g.cell = Math.max(2, Math.floor(Math.min(availW / cols, availH / rows) * dpr)); // device px per cell
    cv.width = g.cell * cols; cv.height = g.cell * rows;
    cv.style.width = cv.width / dpr + 'px'; cv.style.height = cv.height / dpr + 'px';
    g.gap = Math.max(1, Math.round(dpr * (g.cell / dpr >= 10 ? 1.5 : 1))); // same gap everywhere
    // the pixels are drawn by PixiJS (js/pixi-render.js) exactly over this placeholder
    PSRender.setBoard(g.cells, D.PALETTE, cv, g.cell / dpr, g.gap / dpr);
    drawBoard();
  }
  window.addEventListener('resize', () => { if (game && currentScreen === 'game') layoutBoard(); });

  // what the picture shows right now: hidden pixels (grey until the bees can reach them), and the
  // puzzle pieces drawn on top: wood crates, the cookie (with its counter), big pixels, key and hammer
  const HIDDEN_COLOR = '#6b6380';
  function boardLook() {
    const g = game, W = g.cells[0].length;
    if (g.hidden.size) for (const k of reachMap(g.cells, openFn(g)).keys()) g.hidden.delete(k);
    const items = [], at = (k) => [k % W, (k / W) | 0];
    const box = (cells) => {
      const xs = cells.map((k) => k % W), ys = cells.map((k) => (k / W) | 0), x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 };
    };
    if (g.wood && g.wood.left > 0) items.push({ kind: 'plank', tex: 'block_wood', ...box(g.wood.cells), text: String(g.wood.left) });
    if (g.cookie && g.cookie.left > 0) {
      items.push({ kind: 'plank', tex: g.cookie.left <= g.cookie.n / 2 ? 'cookie_damaged' : 'cookie_intact', ...box(g.cookie.cells), text: String(g.cookie.left) });
    }
    new Set(g.big.values()).forEach((grp) => {
      const [x, y] = at(grp.cells[0]), S = Math.round(Math.sqrt(grp.cells.length));
      items.push({ kind: 'big', x, y, w: S, h: S, color: D.PALETTE[g.cells[y][x]], text: String(grp.left) });
    });
    for (const k of g.keys.keys()) { const [x, y] = at(k); items.push({ kind: 'icon', tex: 'key', x, y }); }
    return {
      color: (k, ch) => ch || g.pending.get(k) || null, // pixels a bee is flying to stay visible until it takes them
      hide: (k) => g.cover.has(k) || g.big.has(k),
      tint: (k) => (g.hidden.has(k) ? HIDDEN_COLOR : null),
      hidden: (k) => g.hidden.has(k), // drawn with the purple "?" hidden-pixel sprite
      items,
    };
  }
  // board: eaten pixels disappear (PixiJS)
  function drawBoard() {
    const look = boardLook();
    if (PSRender.ready) return PSRender.syncBoard(game.cells, look);
    // fallback when WebGL isn't available: plain 2D canvas
    const g = game, cv = $('g-board'), ctx = cv.getContext('2d'), cell = g.cell, W = g.cells[0].length;
    const gap = g.gap || 1, shine = Math.max(1, Math.round(cell / 4));
    ctx.clearRect(0, 0, cv.width, cv.height);
    g.cells.forEach((row, y) => row.forEach((c0, x) => {
      const k = y * W + x, ch = look.color(k, c0);
      if (!ch || look.hide(k)) return;
      ctx.fillStyle = look.tint(k) || D.PALETTE[ch]; ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x * cell, y * cell, cell - gap, shine);
    }));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    g.cells.forEach((row, y) => row.forEach((c0, x) => { // hidden pixels: purple "?" tiles
      const k = y * W + x;
      if (c0 && look.hidden(k) && !look.hide(k)) { ctx.fillStyle = '#7b68a6'; ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap); }
    }));
    look.items.forEach((it) => {
      const w = (it.w || 1) * cell - gap, h = (it.h || 1) * cell - gap, x = it.x * cell, y = it.y * cell;
      if (it.kind === 'plank') { ctx.fillStyle = it.tex === 'block_wood' ? '#b97a3e' : '#e8b866'; ctx.fillRect(x, y, w, h); }
      if (it.kind === 'big') { ctx.fillStyle = it.color; ctx.fillRect(x, y, w, h); }
      ctx.font = `${Math.max(12, cell * (it.kind === 'icon' ? 1.6 : 1.1))}px "Lilita One", sans-serif`;
      ctx.fillStyle = '#fff'; ctx.fillText(it.kind === 'icon' ? '🔑' : it.text, x + w / 2, y + h / 2);
    });
  }
  function renderSlots() {
    const g = game, cell = (b, i, cls = '') => `<div class="slot ${cls}" data-slot="${i}">${b ? blockHtml(b, '', '', true) : ''}</div>`;
    $('g-slots').innerHTML = g.slots.map((b, i) => (g.slotPlace[i] === 'main' ? cell(b, i) : '')).join('');
    // AD slots: locked (watch an ad) or, once opened, a working slot that stays in its side position for this level
    $('g-adslots').innerHTML = Array.from({ length: D.AD_SLOTS }, (_, k) => {
      const i = g.slotPlace.indexOf('ad' + k);
      return i >= 0 ? cell(g.slots[i], i, 'ad-open')
        : `<button class="ad-slot" data-action="ad-slot" data-k="${k}" aria-label="Watch an ad to unlock a slot">
            <i class="spark l"></i><i class="spark r"></i>${img('icon_video_ad')}<b>AD</b></button>`;
    }).join('');
    drawLinkRods($('g-slots'));
    refreshHints();
  }
  // queue: first 2 blocks of each column; the front one is tappable (Free Pick makes the second one tappable too)
  function renderQueue() {
    // Free Pick shows EVERY block of every column (scrollable) and any of them can be picked
    const pick = game.mode === 'pick';
    $('g-queue').classList.toggle('picking', pick);
    // normal view: 2 blocks per column + the top of the 3rd one (a preview of what's coming)
    $('g-queue').innerHTML = game.cols.map((col, c) => `<div class="qcol">${(pick ? col : col.slice(0, 3)).map((b, i) => {
      const tappable = i === 0 || pick;
      return blockHtml(b, tappable ? `data-action="tap-block" data-col="${c}" data-i="${i}"` : '', pick ? 'pickable' : (i === 0 ? '' : 'back'), i === 0);
    }).join('')}</div>`).join('');
    drawLinkRods();
    refreshHints();
  }
  // golden chain between the two blocks of a linked pair (side by side or diagonal)
  function drawLinkRods(q = $('g-queue')) {
    const qr = q.getBoundingClientRect(), pairs = {};
    q.querySelectorAll('.block[data-link]').forEach((el) => { (pairs[el.dataset.link] = pairs[el.dataset.link] || []).push(el); });
    Object.values(pairs).forEach((els) => {
      if (els.length < 2) return;
      const [a, b] = els.map((el) => el.getBoundingClientRect());
      const ax = a.left + a.width / 2 - qr.left, ay = a.top + a.height / 2 - qr.top + q.scrollTop;
      const bx = b.left + b.width / 2 - qr.left, by = b.top + b.height / 2 - qr.top + q.scrollTop;
      const len = Math.hypot(bx - ax, by - ay), rod = document.createElement('img');
      rod.src = 'assets/sprites/puzzles/chain_connector.png'; rod.className = 'link-rod'; rod.alt = '';
      Object.assign(rod.style, { left: (ax + bx) / 2 + 'px', top: (ay + by) / 2 + 'px', width: Math.max(24, len - a.width * 0.55) + 'px',
        transform: `translate(-50%, -50%) rotate(${Math.atan2(by - ay, bx - ax)}rad)` });
      q.appendChild(rod);
    });
  }
  // ---- "can eat now" hints (like competitors' white ring) ----
  const COLOR_NAMES = {
    r: 'red', R: 'light red', q: 'dark red', g: 'green', G: 'light green', h: 'dark green', y: 'yellow', Y: 'light yellow', u: 'dark yellow',
    o: 'orange', O: 'light orange', z: 'dark orange', p: 'pink', P: 'light pink', m: 'dark pink', b: 'blue', B: 'light blue', c: 'dark blue',
    n: 'brown', N: 'light brown', l: 'dark brown', k: 'black', v: 'purple', s: 'gray', S: 'light gray', a: 'dark gray', w: 'white',
    D: 'sky blue', I: 'light sky', J: 'sand', L: 'soil brown', H: 'peach', C: 'cream', T: 'wood', E: 'mint', K: 'grass green',
    F: 'lavender', M: 'blush', U: 'water blue', V: 'light water', W: 'sand', X: 'night purple',
  };
  const colorName = (c) => COLOR_NAMES[c] || 'that';
  const canEat = (b) => !!(b && findTarget(game, b.color));
  // which color is in the way of a color: the lowest pixel of each column that has that color
  function blockerOf(color) {
    const g = game, H = g.cells.length, W = g.cells[0].length, tally = {};
    for (let x = 0; x < W; x++) {
      let hasColor = false;
      for (let y = 0; y < H; y++) if (g.cells[y][x] === color) { hasColor = true; break; }
      if (!hasColor) continue;
      for (let y = H - 1; y >= 0; y--) {
        const ch = g.cells[y][x];
        if (ch && !g.reserved.has(y * W + x)) { if (ch !== color) tally[ch] = (tally[ch] || 0) + 1; break; }
      }
    }
    return Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  }
  // updates classes in place (no re-render, so taps are never lost)
  function refreshHints() {
    if (!game) return;
    document.querySelectorAll('#g-queue .block[data-col]').forEach((el) => {
      const b = game.cols[+el.dataset.col][+el.dataset.i || 0], ok = canEat(b) && !(b && b.frozen);
      el.classList.toggle('ready', ok); el.classList.toggle('wait', !ok);
    });
    document.querySelectorAll('#screen-game [data-slot]').forEach((el) => {
      const b = game.slots[+el.dataset.slot];
      el.classList.toggle('stuck', !!(b && b.amount > 0 && !(b.inFlight > 0) && !canEat(b)));
    });
  }
  function slotInfo(i) {
    const b = game && game.slots[i];
    if (!b) return toast('Empty slot: tap a bright (not faded) block to fill it');
    if (b.amount <= 0 || canEat(b)) return toast(`The bees are eating ${colorName(b.color)} pixels`);
    const blocker = blockerOf(b.color);
    toast(blocker ? `This ${colorName(b.color)} block is waiting: eat the ${colorName(blocker)} pixels below it first`
      : `This ${colorName(b.color)} block is waiting for the bees`);
  }

  function renderBoosters() {
    $('g-boosters').innerHTML = BOOSTERS.map((b) => {
      const open = state.stats.levels >= b.unlockAt || state.debugBoosters;
      return open
        ? `<button class="bst ${game && game.mode === b.id ? 'active' : ''}" data-action="booster" data-b="${b.id}" aria-label="${b.name}">${img(b.icon)}<span class="count">${state.boosters[b.id] || 0}</span></button>`
        : `<button class="bst locked" data-action="booster-locked" data-b="${b.id}" aria-label="${b.name} (locked)">${img('icon_lock')}<span class="lv">Lv ${b.unlockAt + 1}</span></button>`;
    }).join('');
  }
  // revealed = false keeps mystery blocks hidden ("?") until they reach the front
  // deep mystery (linked to another block) stays hidden until it is in a slot. more = blocks waiting inside a pipe
  function blockHtml(b, attrs = '', cls = '', revealed = true) {
    const pz = (name) => `<img class="pz-img" src="assets/sprites/puzzles/${name}.png" alt="">`;
    // line puzzle tiles
    if (b.kind === 'lock') return `<button class="block pz-tile lock ${cls}" ${attrs} aria-label="Lock">${pz('lock_closed')}</button>`;
    if (b.kind === 'hammer') return `<button class="block pz-tile hammer ${cls}" ${attrs} aria-label="Hammer">${pz('hammer')}</button>`;
    if (b.kind === 'pipe') return `<button class="block pz-tile pipe ${cls}" ${attrs} aria-label="Pipe">${pz('pipe')}<b class="pz-count">${b.items.length}</b><i class="pz-arrow"></i></button>`;
    const hidden = b.mystery === 'deep' || (b.mystery && !revealed), color = D.PALETTE[b.color];
    const style = hidden ? '' : `style="background:linear-gradient(${color}, ${color})"`;
    // in a slot the number = pixels still to be eaten (waiting + bugs in the air); ✓ = linked block waiting for its partner
    const n = b.amount + (b.inFlight || 0);
    const classes = ['block', cls, hidden && 'mystery', b.frozen && 'frozen', b.link && 'linked'].filter(Boolean).join(' ');
    return `<button class="${classes}" ${style} ${attrs}${b.link ? ` data-link="${b.link}"` : ''}>${hidden ? '?' : n > 0 ? n : '✓'}</button>`;
  }
  // =====================================================================
  //  SPEED STORE (edit prices here)
  // =====================================================================
  const SPEED_STORE = {
    boosts: [ // 2x speed for a limited time (time adds up)
      { min: 5, ad: true }, { min: 5, coins: 250 }, { min: 15, coins: 600 }, { min: 30, coins: 1000 },
    ],
    tiers: [ // permanent maximum speed (also unlocks every speed below it)
      { speed: 3, gems: 100 }, { speed: 5, gems: 250 }, { speed: 8, gems: 500 },
    ],
  };
  const boostLeft = () => Math.max(0, state.speedBoostUntil - Date.now());
  // speeds the player can switch between right now
  function availableSpeeds() {
    const s = [1];
    if (boostLeft() > 0 || state.maxSpeed >= 2) s.push(2);
    [3, 5, 8].forEach((v) => { if (state.maxSpeed >= v) s.push(v); });
    return s;
  }
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function renderSpeed() {
    if (!game) return;
    // boost ran out during the level: drop to the best speed still available
    const sp = availableSpeeds();
    if (!game.forceSpeed && !sp.includes(game.speed)) game.speed = Math.max(...sp.filter((v) => v <= game.speed));
    const on = game.speed > 1, btn = document.querySelector('.speed-btn');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    // off: shows the speed you can switch to (2x, gray); on: shows the active speed (gold)
    $('g-speed-label').textContent = (game.speed > 1 ? game.speed : (sp[1] || 2)) + 'x';
    const left = boostLeft();
    $('g-speed-timer').hidden = !left;
    if (left) $('g-speed-timer').textContent = mmss(left);
  }
  setInterval(() => { if (currentScreen === 'game') renderSpeed(); if (openPopupEl && openPopupEl.id === 'popup-speed') renderSpeedStore(); }, 1000);

  function renderSpeedStore() {
    const left = boostLeft();
    $('sp-status').textContent = [left ? `2x boost active: ${mmss(left)} left` : '', state.maxSpeed > 1 ? `Your max speed: ${state.maxSpeed}x` : ''].filter(Boolean).join(' • ');
    $('sp-boosts').innerHTML = SPEED_STORE.boosts.map((b, i) => `<div class="sp-card">${img('icon_speed', 'ic')}<span class="amt">+${b.min} min</span>
      ${b.ad ? `<button class="gbtn purple" data-action="sp-boost" data-i="${i}">${img('icon_video_ad')}<span>Watch Ad</span></button>`
             : `<button class="gbtn green" data-action="sp-boost" data-i="${i}">${img('coin')}<span>${b.coins.toLocaleString('en-US')}</span></button>`}</div>`).join('');
    $('sp-tiers').innerHTML = SPEED_STORE.tiers.map((t, i) => {
      const owned = state.maxSpeed >= t.speed;
      return `<div class="sp-card ${i === SPEED_STORE.tiers.length - 1 ? 'best' : ''}">${img('icon_speed', 'ic')}<span class="amt">${t.speed}x</span>
        ${owned ? '<button class="gbtn blue" disabled><span>Owned</span></button>'
                : `<button class="gbtn green" data-action="sp-tier" data-i="${i}">${img('gem')}<span>${t.gems}</span></button>`}</div>`;
    }).join('');
  }
  function openSpeedStore() { renderHud(); renderSpeedStore(); openPopup('popup-speed'); }
  function addBoost(min) {
    state.speedBoostUntil = Math.max(Date.now(), state.speedBoostUntil) + min * 60000;
    saveState(); renderSpeedStore(); renderSpeed(); toast(`+${min} min of 2x speed!`);
  }
  function buyBoost(i) {
    const b = SPEED_STORE.boosts[i];
    if (b.ad) return showAd(() => addBoost(b.min));
    if (state.coins < b.coins) return toast(`Not enough coins (need ${b.coins.toLocaleString('en-US')})`);
    state.coins -= b.coins; renderHud(); bumpCurrency('ui-coins'); addBoost(b.min);
  }
  function buyTier(i) {
    const t = SPEED_STORE.tiers[i];
    if (state.maxSpeed >= t.speed) return;
    if (state.gems < t.gems) return toast(`Not enough gems (need ${t.gems})`);
    state.gems -= t.gems; state.maxSpeed = t.speed; saveState(); renderHud(); bumpCurrency('ui-gems');
    renderSpeedStore(); renderSpeed(); toast(`${t.speed}x speed unlocked forever!`);
  }
  function setHint(text) {
    $('g-hint').hidden = !text; if (text) $('g-hint').innerHTML = text;
    // Wind mode: glowing board + a tapping hand on the picture
    const wind = !!(game && game.mode === 'wing');
    document.querySelector('#screen-game .board').classList.toggle('wind-mode', wind);
    $('g-board-tap').hidden = !wind;
  }
  const HINTS = {
    wing: '<b>Wind:</b> tap any color in the picture<br>to blow away <u>all</u> pixels of that color!',
    pick: '<b>Free Pick:</b> tap any block in the line',
  };

  // Wind effect: every removed pixel flies away with the gust, sweeping left to right
  function windEffect(removed) {
    const cols = game.cells[0].length, cs = $('g-board').getBoundingClientRect().width / cols;
    PSRender.wind(removed, D.PALETTE, cs, cols); // PixiJS: gust + flying pixels
  }

  // ---- player taps a block ----
  function tapBlock(col, idx) {
    const g = game;
    if (!g || g.over) return;
    const tutorialTap = coachWantsTap();
    if (tutorialTap && (col !== coach.col || idx !== 0)) return; // during the tutorial only the shown block works
    const column = g.cols[col], b = column[idx];
    if (!b) return;
    if (idx > 0 && g.mode !== 'pick') return;
    const pick = g.mode === 'pick';
    const thaw = (c) => [c - 1, c + 1].forEach((k) => { const nb = g.cols[k] && g.cols[k][0]; if (nb && nb.frozen) nb.frozen = false; });
    if (b.kind === 'pipe') return toast('Pipes push their blocks up when the space above them is free');
    if (b.kind === 'lock' && pick) return toast('Locks open only with their key 🔑');
    if (pick) { if (b.link) unlink(b); } // Free Pick takes any block alone (frozen too)
    else {
      const why = blockedReason(col);
      if (why) {
        const other = g.cols.some((c, i) => i !== col && c[0] && !blockedReason(i));
        if (other) return toast(why);
        // nothing else can be played: lift the restriction so the level can never get stuck
        if (b.kind === 'lock') { g.unlocked.add(b.id); settle(g); renderQueue(); return toast('🔓 The lock opened!'); }
        b.frozen = false; if (b.link) unlink(b);
      }
    }
    if (b.kind === 'hammer') { // hammers don't need a slot: they fly to the wood plank and hit it
      column.splice(idx, 1); thaw(col);
      if (pick) { spendBooster('pick'); g.mode = null; setHint(null); }
      hammerFly(document.querySelector(`#g-queue [data-col="${col}"][data-i="${idx}"]`));
      const broke = hitWood(g);
      settle(g); haptic(); drawBoard(); renderQueue(); renderBoosters();
      toast(broke ? '🔨 Crack! The wood broke' : `🔨 Bonk! ${g.wood ? g.wood.left : 0} more hammer${g.wood && g.wood.left === 1 ? '' : 's'} to break the wood`);
      if (tutorialTap) nextCoachStep();
      return;
    }
    // linked blocks go to the slots together (the partner comes along from wherever it is in the line)
    const at = b.link ? findPartner(g, b) : null;
    const need = at ? 2 : 1, freeSlots = g.slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    if (freeSlots.length < need) return toast(need > 1 ? 'Linked blocks need 2 free slots!' : 'No free slot — wait for the bees!');
    const group = [[col, idx]];
    if (at) group.push(at);
    group.map(([c, i]) => [c, i, g.cols[c][i]]).forEach(([c, i, blk], n) => {
      g.cols[c].splice(g.cols[c].indexOf(blk), 1);
      blk.mystery = false; blk.frozen = false; blk.inFlight = 0;
      g.slots[freeSlots[n]] = blk;
      if (i === 0) thaw(c); // using a column thaws frozen blocks at the front of the neighbouring columns
    });
    settle(g);
    if (pick) { spendBooster('pick'); g.mode = null; setHint(null); }
    haptic();
    renderSlots(); renderQueue(); renderBoosters();
    freeSlots.slice(0, need).forEach((i) => { const el = document.querySelector(`#screen-game [data-slot="${i}"]`); if (el) el.classList.add('pop'); });
    if (tutorialTap) nextCoachStep();
  }
  // ---- line puzzles: why the front item of a column can't be tapped right now (null = it can) ----
  function blockedReason(c, g = game) {
    const b = g.cols[c] && g.cols[c][0];
    if (!b) return 'empty';
    if (b.kind === 'lock') return 'Locked! The bugs must collect its key 🔑 in the picture';
    if (b.kind === 'pipe') return 'Pipes push their blocks up when the space above them is free';
    if (b.kind === 'hammer') return null;
    if (b.frozen) return 'Frozen! Use a block next to it first';
    if (b.link && !findPartner(g, b)) return 'Linked! Its partner is still inside a pipe';
    return null;
  }
  function unlink(b) { game.cols.flat().concat(game.slots).forEach((o) => { if (o && o.link === b.link) o.link = null; }); }
  // the hammer flies from the line to the wood plank
  function hammerFly(fromEl) {
    if (!fromEl || !game.wood) return;
    const scr = $('screen-game').getBoundingClientRect(), a = fromEl.getBoundingClientRect(), cv = $('g-board').getBoundingClientRect();
    const W = game.cells[0].length, cs = cv.width / W, xs = game.wood.cells.map((k) => k % W), ys = game.wood.cells.map((k) => (k / W) | 0);
    const tx = cv.left + ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * cs, ty = cv.top + ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * cs;
    const img = document.createElement('img');
    img.src = 'assets/sprites/puzzles/hammer.png'; img.className = 'hammer-fly'; img.alt = '';
    Object.assign(img.style, { left: a.left - scr.left + a.width / 2 + 'px', top: a.top - scr.top + a.height / 2 + 'px' });
    $('screen-game').appendChild(img);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      img.style.transform = `translate(${tx - a.left - a.width / 2}px, ${ty - a.top - a.height / 2}px) rotate(-70deg) scale(1.3)`;
    }));
    setTimeout(() => img.remove(), 700);
  }

  // ---- bees: which pixel can be eaten? (genre rule, like Pixel Hunt / Colony Flow) ----
  // A pixel is a target when it touches the bottom edge or touches a cleared space connected to the bottom
  // (through columns AND rows). A pixel a bee is already flying to counts as cleared, same as in the level generator.
  function findTarget(g, color) {
    const W = g.cells[0].length;
    const t = pickTarget(g.cells, openFn(g), color, takeFn(g));
    return t ? { x: t[0], y: t[1], key: t[1] * W + t[0] } : null;
  }
  function beeSprite() { return { bee: 'bee_fly', ladybug: 'ladybug_fly' }[state.creature] || state.creature; }
  function launchBee(g, slotBlock, t) {
    const scr = $('screen-game').getBoundingClientRect(), hole = $('g-hole').getBoundingClientRect(), cv = $('g-board').getBoundingClientRect();
    const cs = cv.width / g.cells[0].length;
    const sx = hole.left - scr.left + hole.width / 2 + (Math.random() - 0.5) * 30, sy = hole.top - scr.top + hole.height / 2;
    const ex = cv.left - scr.left + (t.x + 0.5) * cs, ey = cv.top - scr.top + (t.y + 0.5) * cs;
    // a bee = sprite + the little pixel block it carries home (shown on the way back)
    // smaller bees and carried blocks on bigger (finer) pictures — drawn by PixiJS
    const size = Math.max(34, Math.min(44, cs * 3.4)), carry = Math.max(10, Math.min(15, cs * 1.2));
    const el = PSRender.spawnBee(`assets/sprites/${beeSprite()}.png`, size, D.PALETTE[slotBlock.color], carry);
    el.set(sx, sy, 1, 0.8);
    g.bees.push({ el, block: slotBlock, t, sx, sy, ex, ey, hx: sx, hy: sy, phase: 'out',
      cx: (sx + ex) / 2 + (Math.random() - 0.5) * 160, cy: Math.min(sy, ey) + (sy - ey) * 0.3, p: 0 });
  }
  function clearBees() { $('g-bees').innerHTML = ''; PSRender.clearBees(); }

  // ---- main loop ----
  // ~60 fps timer loop (keeps running in every browser, including test runs)
  const nextTick = () => setTimeout(() => gameTick(performance.now()), 16);
  function gameTick(now) {
    if (!game || currentScreen !== 'game') { loopOn = false; return; }
    const dt = Math.min(50, now - (game.last || now));
    game.last = now;
    if (!openPopupEl && !game.over && !document.hidden && !tutorialPausesGame()) step(dt);
    nextTick();
  }
  function step(dt) {
    const g = game, sp = g.speed;
    let slotsChanged = false, boardChanged = false;
    g.launchTimer += dt * sp;
    if (g.launchTimer >= LAUNCH_MS) {
      g.launchTimer = 0;
      // bigger pictures send more bees at once (Medium 2, Hard 3) so levels don't drag
      g.slots.forEach((b) => {
        for (let k = 0; k < g.cfg.beesPerLaunch; k++) {
          if (!b || b.amount <= 0) return;
          const t = findTarget(g, b.color);
          if (!t) return;
          // the pixel counts as eaten from the moment its bee leaves (same order as the level checker, so
          // puzzles like the cookie or the hammer react exactly as planned); it stays drawn until the bee takes it
          const ev = eatPixel(g, t.key);
          const pend = ev.cells || [t.key];
          pend.forEach((k) => g.pending.set(k, b.color)); b.amount -= 1; b.inFlight += 1;
          launchBee(g, b, t); Object.assign(g.bees[g.bees.length - 1], { ev, pend }); slotsChanged = true; boardChanged = true;
        }
      });
    }
    for (const bee of g.bees) {
      const back = bee.phase === 'back';
      bee.p = Math.min(1, bee.p + (dt * sp) / (back ? FLY_MS * 0.85 : FLY_MS));
      const p = bee.p, q = 1 - p;
      const x = q * q * bee.sx + 2 * q * p * bee.cx + p * p * bee.ex;
      const y = q * q * bee.sy + 2 * q * p * bee.cy + p * p * bee.ey + Math.sin(p * 12) * 4;
      const flip = bee.ex >= bee.sx ? 1 : -1;
      // going out: grows a bit mid-flight; coming back: shrinks into the hole
      const scale = back ? 1 - 0.65 * p * p : 0.8 + 0.3 * Math.sin(p * Math.PI);
      bee.el.set(x, y, flip, scale);
      if (p < 1) continue;
      if (!back) {
        // reached the pixel: eat it, pick up a little block of its color and fly home
        (bee.pend || [bee.t.key]).forEach((k) => g.pending.delete(k));
        puzzleEvents(bee.ev || []);
        bee.block.inFlight -= 1; boardChanged = true; slotsChanged = true;
        bee.phase = 'back'; bee.p = 0; bee.el.carry(true);
        bee.sx = bee.ex; bee.sy = bee.ey; bee.ex = bee.hx; bee.ey = bee.hy;
        bee.cx = (bee.sx + bee.ex) / 2 + (Math.random() - 0.5) * 140; bee.cy = (bee.sy + bee.ey) / 2;
      } else {
        bee.done = true; bee.el.destroy(); // back inside the tree
      }
    }
    if (g.bees.some((b) => b.done)) g.bees = g.bees.filter((b) => !b.done);
    if (boardChanged) { drawBoard(); refreshHints(); }
    // finished blocks leave their slot (linked blocks only together, once both are done)
    const done = (b) => b.amount <= 0 && b.inFlight <= 0;
    g.slots.forEach((b, i) => {
      if (b && done(b) && (!b.link || g.slots.every((o) => !o || o.link !== b.link || done(o)))) { g.slots[i] = null; slotsChanged = true; }
    });
    if (slotsChanged) renderSlots();
    PSRender.frame(); // draw this step (also when the browser throttles animation frames)
    if (g.remaining <= 0 && !g.bees.length) return endLevel(true);
    const stuck = !g.bees.length && g.slots.every((b) => b && (b.amount > 0 ? !findTarget(g, b.color) : !!b.link));
    if (stuck) endLevel(false);
  }
  // what the player sees when a bee (or the Wind) triggers a puzzle
  function puzzleEvents(ev) {
    if (!ev.length) return;
    if (ev.includes('key')) { toast('🔑 Key collected! A lock opened'); settle(game); renderQueue(); }
    if (ev.includes('cookie')) toast('🍪 Crunch! The cookie broke');
    if (ev.some((e) => e !== 'big') && state.settings.haptics) PSNative.vibrate('medium');
  }
  function endLevel(win) {
    game.over = true;
    if (state.settings.haptics) PSNative.vibrate('heavy');
    if (win) { $('g-board').parentElement.classList.add('flash'); setTimeout(() => { $('g-board').parentElement.classList.remove('flash'); showWin(3 - Math.min(2, game.extras)); }, 600); }
    else openPopup('popup-fail');
  }

  // Shuffle never leaves the player without a move: after mixing, at least one front block
  // (not frozen) must be able to eat right now. Tries several mixes, then moves a usable block to the front.
  // Puzzle pieces (frozen, locks, links, pipes, mystery) stay where they are: only the colors are mixed.
  function shuffleQueue(g) {
    const all = g.cols.flat().filter(isBlock), pay = all.map((b) => ({ color: b.color, amount: b.amount }));
    const fronts = () => g.cols.map((c, i) => (isBlock(c[0]) && !blockedReason(i, g) ? c[0] : null)).filter(Boolean);
    for (let attempt = 0; attempt < 30; attempt++) {
      for (let i = pay.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pay[i], pay[j]] = [pay[j], pay[i]]; }
      all.forEach((b, i) => Object.assign(b, pay[i]));
      if (fronts().some((b) => findTarget(g, b.color))) return;
    }
    // no luck: give a playable front block a color that can eat now
    let f = fronts()[0];
    if (!f) { f = all[0]; if (!f) return; f.frozen = false; if (f.link) unlink(f); }
    const p = all.find((b) => findTarget(g, b.color));
    if (p && p !== f) [f.color, f.amount, p.color, p.amount] = [p.color, p.amount, f.color, f.amount];
  }

  // ---- boosters ----
  function spendBooster(id) {
    state.boosters[id] = Math.max(0, (state.boosters[id] || 0) - 1);
    track('booster'); renderBoosters();
  }
  function useBooster(id) {
    const g = game, b = BOOSTERS.find((x) => x.id === id);
    if (!g || g.over) return;
    if (!(state.boosters[id] > 0)) return toast(`No ${b.name} left`);
    if (id === 'add_slot') {
      if (g.slots.length >= 7) return toast('Maximum slots reached');
      g.slots.push(null); g.slotPlace.push('main'); g.extras += 1; spendBooster(id); renderSlots(); toast('+1 slot');
    } else if (id === 'shuffle') {
      shuffleQueue(g);
      spendBooster(id); renderQueue(); toast('Shuffled!');
    } else {
      g.mode = g.mode === id ? null : id;
      setHint(g.mode ? HINTS[g.mode] : null);
      renderQueue(); renderBoosters();
    }
  }
  // Wing Help: remove every pixel of the tapped color (and its blocks)
  $('g-board').addEventListener('click', (e) => {
    const g = game;
    if (!g || g.mode !== 'wing' || g.over) return;
    const r = e.currentTarget.getBoundingClientRect(), W = g.cells[0].length, H = g.cells.length;
    const x = Math.floor(((e.clientX - r.left) / r.width) * W), y = Math.floor(((e.clientY - r.top) / r.height) * H);
    const color = g.cells[y] && g.cells[y][x];
    if (!color) return toast('Tap a colored pixel');
    const removed = [], events = [];
    g.cells.forEach((row, yy) => row.forEach((ch, xx) => {
      // every pixel of that color goes (covered and big ones too), even ones a bee is already flying to
      if (ch !== color) return;
      const k = yy * W + xx, grp = g.big.get(k);
      if (grp && grp.bitten.has(k)) return;
      removed.push([xx, yy, ch]); g.reserved.delete(k);
      events.push(...eatPixel(g, k));
    }));
    windEffect(removed);
    toast(`Whoosh! ${removed.length} pixels blown away`);
    // blocks of that color leave the line; their linked partners become normal blocks
    g.cols.flat().filter((b) => b.color === color && b.link).forEach(unlink);
    g.cols = g.cols.map((col) => col.filter((b) => b.color !== color));
    g.cols.flat().forEach((it) => { if (it.kind === 'pipe') it.items = it.items.filter((b) => b.color !== color); });
    puzzleEvents(events); settle(g);
    g.slots.forEach((b) => { if (b && b.color === color) b.amount = 0; });
    g.mode = null; setHint(null); spendBooster('wing');
    drawBoard(); renderQueue(); renderSlots();
  });

  function showWin(stars = 3) {
    const g = game;
    const firstEventWin = g.event && g.index === state.event.levels.length;
    track('level', { theme: g.theme, diff: g.diff, index: g.index, stars, event: g.event });
    $('win-pumpkins').hidden = !firstEventWin;
    $('win-pk').textContent = '+' + EVENT_PUMPKINS_PER_WIN;
    g.reward = WIN_COINS[g.diff];
    $('win-stars').innerHTML = [0, 1, 2].map((i) => `<img class="${i < stars ? '' : 'off'}" src="assets/sprites/star.png" alt="">`).join('');
    $('win-pic').src = D.gridURL(g.grid, Math.max(4, Math.floor(168 / g.grid.length)));
    $('win-name').textContent = `${themeById(g.theme).name} • ${D.PICTURES[g.picId].name}`;
    $('win-coins').textContent = '+' + g.reward;
    $('win-bee').src = `assets/sprites/${state.creature}.png`;
    openPopup('popup-complete');
  }
  function finishWin(mult) {
    grant({ coins: game.reward * mult });
    toast(`+${game.reward * mult} coins`);
    closePopup();
    const unlocked = BOOSTERS.find((b) => b.unlockAt === state.stats.levels && b.unlockAt > 0);
    const goOn = () => {
      if (game.event) { showScreen('events'); if (unlocked) showUnlock('booster', unlocked); return; }
      const next = nextLevel(game.theme);
      if (next) startGame(next.theme, next.diff, next.index);
      else { toast(`${themeById(game.theme).name} completed!`); openTheme(game.theme); }
      if (unlocked) showUnlock('booster', unlocked);
    };
    // doc: every 2 levels completed in a row, show a video ad (unless No Ads was bought)
    state.winsSinceAd = (state.winsSinceAd || 0) + 1;
    if (state.winsSinceAd >= 2 && !state.noAds && mult === 1) { state.winsSinceAd = 0; saveState(); showAd(goOn); }
    else { saveState(); goOn(); }
  }
  // New booster / new puzzle feature pop-up
  const FEATURES = {
    mystery: { icon: 'puzzles/block_mystery', name: 'Mystery Blocks', desc: "You can't see the color and amount until it reaches the front." },
    frozen:  { icon: 'puzzles/block_ice', name: 'Frozen Blocks', desc: 'Frozen blocks thaw when you use a block next to them.' },
    hidden:  { icon: 'puzzles/hidden_pixel', name: 'Hidden Pixels', desc: 'Hidden pixels reveal their color when the path to them is cleared.' },
    linked:  { icon: 'puzzles/linked_blocks', name: 'Linked Blocks', desc: 'Linked blocks are picked together (2 free slots) and leave only when BOTH are done.' },
    big:     { icon: 'puzzles/big_pixel', name: 'Big Pixel', desc: 'Big pixels need more bugs to be fully cleared. The number shows how many.' },
    pipe:    { icon: 'puzzles/pipe', name: 'Pipe', desc: 'Pipes hold blocks waiting to move upward. The number shows how many are inside.' },
    key:     { icon: 'puzzles/key', name: 'Key & Lock', desc: 'Collect the keys in the picture to unlock the locks in the line.' },
    wood:    { icon: 'puzzles/hammer', name: 'Wood Block', desc: 'Find the hammers in the line to break the wood block. The number shows how many it needs.' },
    cookie:  { icon: 'puzzles/cookie_intact', name: 'Cookie Blocker', desc: 'Clear pixels to break the cookie blocker. The number shows how many.' },
    mlinked: { icon: 'puzzles/mystery_linked_blocks', name: 'Mystery Links', desc: 'A mystery block linked to another block: you see its color only when it lands in a slot.' },
  };
  // order the "New Feature!" pop-ups appear in when a level has several new puzzles
  const PUZZLE_ORDER = ['mystery', 'frozen', 'hidden', 'linked', 'big', 'pipe', 'key', 'wood', 'cookie', 'mlinked'];
  function showUnlock(kind, item) {
    $('unlock-title').textContent = kind === 'booster' ? 'New Booster!' : 'New Feature!';
    $('unlock-icon').style.display = item.emoji ? 'none' : ''; $('unlock-emoji').hidden = !item.emoji; // (emoji kept as a fallback)
    $('unlock-emoji').textContent = item.emoji || '';
    if (item.icon) $('unlock-icon').src = `assets/sprites/${item.icon}.png`;
    $('unlock-name').textContent = item.name;
    $('unlock-desc').textContent = item.desc;
    $('unlock-btn').textContent = kind === 'booster' ? 'Claim' : 'Continue';
    $('unlock-note').textContent = kind === 'booster' ? 'You got 2 for free' : '';
    if (kind === 'booster') { state.boosters[item.id] = (state.boosters[item.id] || 0) + 2; saveState(); }
    openPopup('popup-unlock');
  }
  // =====================================================================
  //  FTUE — guided first level (edit the texts / order here)
  // =====================================================================
  // target: what gets the spotlight. wait: 'tap' = the player must tap the shown block. delay: let the game run first (ms)
  const TUTORIAL_STEPS = [
    { target: '.board', text: 'This is the <b>picture</b>. Your goal: clear <b>ALL</b> of its pixels!' },
    { target: '#g-queue', text: 'These are <b>color blocks</b>. The number is how many pixels of that color the block eats.' },
    { target: 'block', wait: 'tap', text: '<b>Tap this block!</b> It goes to a slot and bees fly out of the tree to eat its color.' },
    { target: '.board', delay: 1800, text: 'Bees eat from the <b>bottom up</b>: a pixel can only be eaten when nothing is left below it in its column.' },
    { target: '#g-slots', text: 'Slots are limited! If <b>all slots are full</b> and no bee can reach its color, you\'re <b>out of slots</b> and you <b>lose</b>.' },
    { target: '#g-boosters', text: 'Stuck? <b>Boosters</b> and <b>AD slots</b> give you extra help. Now finish the picture. Good luck!' },
  ];
  let coach = null; // { i, col, waiting }
  const coachStep = () => coach && TUTORIAL_STEPS[coach.i];
  const coachWantsTap = () => !!(coach && !coach.waiting && coachStep().wait === 'tap');
  // the game pauses while the bee is explaining (except while waiting for the first tap)
  const tutorialPausesGame = () => !!(coach && !coach.waiting && coachStep().wait !== 'tap');

  function startTutorial() { coach = { i: 0 }; showCoachStep(); }
  function showCoachStep() {
    const step = coachStep();
    let el;
    if (step.target === 'block') {
      const col = game.cols.findIndex((c) => c[0] && !c[0].frozen && findTarget(game, c[0].color));
      coach.col = col < 0 ? 0 : col;
      el = document.querySelector(`#g-queue .block[data-col="${coach.col}"][data-i="0"]`);
    } else el = document.querySelector('#screen-game ' + step.target);
    if (!el) return endTutorial();
    const app = $('app').getBoundingClientRect(), r = el.getBoundingClientRect(), pad = 8;
    const x = r.left - app.left, y = r.top - app.top;
    Object.assign($('tut-spot').style, { left: x - pad + 'px', top: y - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const tap = step.wait === 'tap';
    $('tut-hand').hidden = !tap;
    if (tap) Object.assign($('tut-hand').style, { left: x + r.width / 2 + 'px', top: y + r.height / 2 + 'px' });
    $('tut-text').innerHTML = step.text;
    $('tut-next').hidden = tap;
    // bubble on the other side of the highlighted area
    const bub = $('tut-bubble');
    bub.style.top = (y + r.height / 2 > app.height / 2 ? Math.max(60, y - pad - 150) : Math.min(app.height - 180, y + r.height + pad + 14)) + 'px';
    $('tut-dots').innerHTML = TUTORIAL_STEPS.map((_, k) => `<i class="${k === coach.i ? 'on' : ''}"></i>`).join('');
    $('tutorial').classList.toggle('click', !tap);
    $('tutorial').hidden = false;
  }
  function nextCoachStep() {
    coach.i += 1;
    if (coach.i >= TUTORIAL_STEPS.length) return endTutorial();
    const step = coachStep();
    if (!step.delay) return showCoachStep();
    $('tutorial').hidden = true; coach.waiting = true; // let the player watch the bees for a moment
    setTimeout(() => { if (coach) { coach.waiting = false; showCoachStep(); } }, step.delay);
  }
  function endTutorial() { coach = null; $('tutorial').hidden = true; state.tutorialSeen = true; saveState(); }
  function hideTutorial() { if (coach) endTutorial(); } // leaving the level or opening a pop-up ends it
  $('tutorial').addEventListener('click', () => { if (coach && !coach.waiting && coachStep().wait !== 'tap') nextCoachStep(); });

  // ---------- Level checker: solves every level instantly (no animation) with the game's own rules ----------
  // Plays the blocks in solution order, one at a time, eating pixels exactly like the bees do.
  // Open index.html#verify_all to see the report.
  function verifyLevel(theme, diff, index, force) { return checkLevel(buildLevel(theme, diff, index, force)); }
  // plays a level (changes it!) in solution order; linked blocks are played together
  function checkLevel(g) {
    if (!g) return 'the puzzles closed the picture off';
    const W = g.cells[0].length, open = openFn(g), take = takeFn(g);
    const thaw = (c) => [c - 1, c + 1].forEach((k) => { const n = g.cols[k] && g.cols[k][0]; if (n && n.frozen) n.frozen = false; });
    let turn = 0, guard = 0;
    while (g.cols.some((c) => c.length) && guard++ < 10000) {
      settle(g);
      const c = turn % 3; turn += 1;
      const col = g.cols[c];
      if (!col.length) continue;
      const b = col[0];
      if (b.kind === 'lock') return `lock reached before its key (column ${c + 1})`;
      if (b.kind === 'hammer') { col.shift(); thaw(c); hitWood(g); continue; }
      if (b.frozen) return `frozen block blocks the solution (column ${c + 1})`;
      const group = [col.shift()];
      thaw(c);
      if (b.link) {
        const at = findPartner(g, b);
        if (!at) return `linked partner is hidden in a pipe (column ${c + 1})`;
        group.push(g.cols[at[0]].splice(at[1], 1)[0]);
        if (at[1] === 0) thaw(at[0]);
        turn += 1; // the partner is the next block of the solution: its turn is used up
      }
      // the blocks eat one pixel each in turn (linked blocks work at the same time)
      const left = group.map((x) => x.amount);
      while (left.some((n) => n > 0)) {
        let moved = false;
        group.forEach((x, i) => {
          if (left[i] <= 0) return;
          const t = pickTarget(g.cells, open, x.color, take);
          if (!t) return;
          eatPixel(g, t[1] * W + t[0]); left[i] -= 1; moved = true;
        });
        if (!moved) return `stuck: a "${group[0].color}" block can't reach its pixels`;
      }
      settle(g);
    }
    return g.remaining === 0 ? 'ok' : `${g.remaining} pixel(s) left at the end`;
  }
  // "Careless player" simulation (instant): always taps the first front block that can eat right now.
  // Research target (pixel-hunt design notes): careless win rate ≤ 85% on Medium, ≤ 55% on Hard.
  function carelessWins(theme, diff, index) {
    const g = buildLevel(theme, diff, index), open = openFn(g), take = takeFn(g), W = g.cells[0].length;
    const slots = Array(g.cfg.slots).fill(null);
    const free = () => slots.filter((s) => !s).length;
    const thaw = (c) => [c - 1, c + 1].forEach((k) => { const n = g.cols[k] && g.cols[k][0]; if (n && n.frozen) n.frozen = false; });
    const playable = (c) => {
      const b = g.cols[c][0];
      if (!isBlock(b) || b.frozen) return false;
      return b.link ? !!findPartner(g, b) && free() >= 2 : free() >= 1;
    };
    const place = (c) => {
      const b = g.cols[c].shift(), group = [b];
      thaw(c);
      const at = b.link && findPartner(g, b);
      if (at) { group.push(g.cols[at[0]].splice(at[1], 1)[0]); if (at[1] === 0) thaw(at[0]); }
      const link = group.length > 1 ? {} : null;
      group.forEach((x) => { slots[slots.indexOf(null)] = { color: x.color, amount: x.amount, link }; });
      settle(g);
    };
    for (let guard = 0; guard < 20000; guard++) {
      if (g.remaining <= 0) return true;
      settle(g);
      // hammers at the front are always used straight away
      const useHammers = () => g.cols.forEach((col, c) => { while (g.cols[c][0] && g.cols[c][0].kind === 'hammer') { g.cols[c].shift(); thaw(c); hitWood(g); settle(g); } });
      // fill free slots
      while (slots.includes(null)) {
        useHammers();
        let c = g.cols.findIndex((col, i) => playable(i) && pickTarget(g.cells, open, col[0].color, take));
        if (c < 0 && slots.every((s) => !s)) c = g.cols.findIndex((col, i) => playable(i));
        if (c < 0 && slots.every((s) => !s)) { // nothing playable at all: the game lifts the restriction (like in tapBlock)
          c = g.cols.findIndex((col) => col[0]);
          if (c >= 0) {
            const b = g.cols[c][0];
            if (!isBlock(b)) { if (b.kind === 'lock') g.unlocked.add(b.id); settle(g); continue; }
            b.frozen = false; b.link = null;
          }
        }
        if (c < 0) break;
        place(c);
      }
      // every slot eats one round
      let progress = false;
      slots.forEach((s) => {
        if (!s) return;
        for (let k = 0; k < g.cfg.beesPerLaunch && s.amount > 0; k++) {
          const t = pickTarget(g.cells, open, s.color, take);
          if (!t) break;
          eatPixel(g, t[1] * W + t[0]); s.amount -= 1; progress = true;
        }
      });
      // finished blocks leave (linked ones only together with their partner)
      slots.forEach((s, i) => { if (s && s.amount <= 0 && (!s.link || slots.every((o) => !o || o.link !== s.link || o.amount <= 0))) slots[i] = null; });
      if (!progress && !slots.includes(null)) return false; // out of slots
      if (!progress && g.cols.every((c) => !c.length)) return g.remaining <= 0;
    }
    return false;
  }
  function verifyAll() {
    const rows = [];
    let ok = 0, total = 0;
    D.THEMES.forEach((t) => D.DIFFICULTIES.forEach((d) => {
      for (let i = 0; i < D.LEVELS_PER_DIFFICULTY; i++) {
        const r = verifyLevel(t.id, d, i); total += 1; if (r === 'ok') ok += 1;
        else rows.push(`${t.name} ${d} level ${i + 1}: ${r}`);
      }
    }));
    for (let i = 0; i < D.EVENT.levels; i++) {
      const r = verifyLevel(D.EVENT.id, D.eventDiff(i), i); total += 1; if (r === 'ok') ok += 1;
      else rows.push(`Event level ${i + 1}: ${r}`);
    }
    let blocks = 0, tiny = 0;
    D.THEMES.forEach((t) => D.DIFFICULTIES.forEach((d) => { for (let i = 0; i < D.LEVELS_PER_DIFFICULTY; i++) {
      buildLevel(t.id, d, i).cols.flat().forEach((b) => { blocks += 1; if (b.amount < 4) tiny += 1; }); } }));
    const careless = D.DIFFICULTIES.map((d) => {
      let w = 0, n = 0;
      D.THEMES.forEach((t) => { for (let i = 0; i < D.LEVELS_PER_DIFFICULTY; i++) { n += 1; if (carelessWins(t.id, d, i)) w += 1; } });
      return `${d} ${Math.round((w / n) * 100)}% (${w}/${n})`;
    }).join(' · ');
    // puzzles: force each one into every level of its difficulty -> is it kept (solvable) and actually there?
    const there = (lv, p) => ({ linked: lv.cols.flat().some((b) => b.link), mlinked: lv.cols.flat().some((b) => b.mystery === 'deep'),
      key: lv.cols.flat().some((b) => b.kind === 'lock'), pipe: lv.cols.flat().some((b) => b.kind === 'pipe'), hidden: lv.hidden.size > 0, big: lv.big.size > 0,
      wood: !!lv.wood && lv.cols.flat().some((b) => b.kind === 'hammer'), cookie: !!lv.cookie }[p]);
    const forced = PUZZLE_ORDER.filter((p) => PUZZLE_DIFF[p] && !['mystery', 'frozen'].includes(p)).map((p) => {
      let kept = 0, good = 0, n = 0;
      D.THEMES.forEach((t) => { for (let i = 0; i < D.LEVELS_PER_DIFFICULTY; i++) {
        n += 1;
        if (there(buildLevel(t.id, PUZZLE_DIFF[p], i, [p]), p)) kept += 1;
        if (verifyLevel(t.id, PUZZLE_DIFF[p], i, [p]) === 'ok') good += 1;
      } });
      return `${p} ${kept}/${n}${good < n ? ` (${n - good} unsolvable!)` : ''}`;
    }).join(' · ');
    // how often each puzzle shows up in the real levels
    const seenIn = {};
    D.THEMES.forEach((t) => D.DIFFICULTIES.forEach((d) => { for (let i = 0; i < D.LEVELS_PER_DIFFICULTY; i++) {
      const lv = buildLevel(t.id, d, i);
      PUZZLE_ORDER.forEach((p) => { if (there(lv, p)) seenIn[p] = (seenIn[p] || 0) + 1; });
    } }));
    return `LEVEL CHECK: ${ok}/${total} levels can be completed\nTiny blocks (< 4 pixels): ${tiny} of ${blocks}\n` +
      `Careless-player win rate: ${careless}  (targets: medium ≤ 85%, hard ≤ 55%)\n` +
      `Puzzle forced into every level (kept): ${forced}\n` +
      `Levels with each puzzle: ${Object.entries(seenIn).map(([p, n]) => `${p} ${n}`).join(' · ')}\n` + rows.join('\n');
  }

  // ---------- Test bot (used by #autoplay / #solve_* and the debug "Auto-solve") ----------
  // ordered = plays the columns in rotation (the solution order); otherwise taps any block that can eat now
  // ---------- puzzle testing ----------
  const allSeen = () => Object.fromEntries(PUZZLE_ORDER.map((p) => [p, true]));
  const PUZZLE_DIFF = { mystery: 'medium', hidden: 'medium', linked: 'medium', big: 'medium', pipe: 'medium',
    frozen: 'hard', key: 'hard', wood: 'hard', cookie: 'hard', mlinked: 'hard' };
  function testPuzzle(p, solve) {
    state.tutorialSeen = true; state.seen = allSeen();
    if (!solve) delete state.seen[p]; // show its "New Feature!" pop-up
    startGame(state.selected.theme, PUZZLE_DIFF[p], 1, { puzzles: [p] });
    if (solve) { game.speed = 8; game.forceSpeed = true; startBot(true); }
  }
  function startBot(ordered) {
    const g0 = game;
    let turn = 0;
    const bot = window.__bot = setInterval(() => {
      if (!game || game !== g0 || game.over) { clearInterval(bot); return; }
      if (openPopupEl) return;
      if (!game.slots.includes(null)) return;
      if (ordered) {
        // proof of solvability: play the solution one block at a time (wait until the slots are empty)
        if (game.slots.some(Boolean) || game.bees.length) return;
        const c = turn % 3, b = game.cols[c][0];
        if (!b) { turn += 1; return; }
        if (b.kind === 'lock') return; // its key is being collected
        if (b.kind === 'hammer') { tapBlock(c, 0); turn += 1; return; }
        if (b.frozen) { const n = [c - 1, c + 1].find((k) => game.cols[k] && game.cols[k][0]); if (n !== undefined) tapBlock(n, 0); else tapBlock(c, 0); return; }
        // wait until the previous block of the solution has finished before taking one that can't eat yet
        if (!findTarget(game, b.color) && game.bees.length) return;
        tapBlock(c, 0); turn += b.link ? 2 : 1; return; // a linked pair uses the partner's turn too
      }
      const ok = (i) => game.cols[i][0] && !blockedReason(i);
      let c = game.cols.findIndex((col) => col[0] && col[0].kind === 'hammer'); // hammers first
      if (c < 0) c = game.cols.findIndex((col, i) => ok(i) && findTarget(game, col[0].color));
      if (c < 0 && !game.bees.length) c = game.cols.findIndex((col, i) => ok(i)); // nothing useful: any block
      if (c < 0 && !game.bees.length) c = game.cols.findIndex((col) => col[0]);
      if (c >= 0) tapBlock(c, 0);
    }, 250);
  }

  // =====================================================================
  //  DEBUG CHEATS (DBG button). Set DEBUG = false before publishing the game.
  // =====================================================================
  function refreshAfterCheat() {
    saveState(); renderHud();
    if (currentScreen === 'game') { if (game) { renderBoosters(); renderSlots(); } }
    else showScreen(currentScreen);
  }
  function inGame() {
    if (currentScreen === 'game' && game && !game.over) return true;
    toast('Start a level first'); return false;
  }
  const DEBUG_CMDS = {
    win: () => { if (!inGame()) return; clearBees(); game.bees = []; game.over = true; showWin(3); },
    lose: () => { if (!inGame()) return; game.over = true; openPopup('popup-fail'); },
    solve: () => { if (!inGame()) return; startBot(true); toast('Auto-solving…'); },
    speed: () => { if (!inGame()) return; game.speed = 5; game.forceSpeed = true; renderSpeed(); toast('Speed 5x (until next level)'); },
    boost: () => { state.speedBoostUntil = Math.max(Date.now(), state.speedBoostUntil) + 30 * 60000; toast('+30 min of 2x speed'); },
    speed8: () => { state.maxSpeed = 8; toast('Permanent 8x speed unlocked'); },
    coins: () => { grant({ coins: 1000 }); toast('+1,000 coins'); },
    gems: () => { grant({ gems: 100 }); toast('+100 gems'); },
    zero: () => { state.coins = 0; state.gems = 0; toast('Coins and gems set to 0'); },
    boosters: () => { state.debugBoosters = true; BOOSTERS.forEach((b) => { state.boosters[b.id] = (state.boosters[b.id] || 0) + 5; }); toast('All boosters unlocked, +5 each'); },
    skins: () => { state.ownedSkins = SKINS.map((s) => s.id); toast('All skins unlocked'); },
    noads: () => { state.noAds = !state.noAds; $('app').classList.toggle('no-ads', state.noAds); toast(`No Ads ${state.noAds ? 'ON' : 'OFF'}`); },
    levels: () => {
      D.THEMES.forEach((t) => D.DIFFICULTIES.forEach((d) => {
        state.progress[`${t.id}-${d}`] = Array(D.LEVELS_PER_DIFFICULTY).fill(3);
        for (let i = 0; i < D.LEVELS_PER_DIFFICULTY; i++) { const p = D.levelPicture(t.id, d, i); if (!state.gallery.includes(p)) state.gallery.push(p); }
      }));
      toast('All levels completed with 3 stars');
    },
    theme: () => { state.progress[`${state.selected.theme}-easy`] = Array(D.LEVELS_PER_DIFFICULTY).fill(3); toast(`${themeById(state.selected.theme).name}: Easy done — Medium unlocked`); },
    levelup: () => { state.playerLevel += 1; state.xp = 0; toast(`Player level ${state.playerLevel}`); },
    xp: () => { state.playerLevel = 20; state.xp = 0; toast('Player level 20 (all pictures/skins level locks open)'); },
    progress0: () => { state.progress = {}; state.gallery = []; state.stats.levels = 0; state.stats.hard = 0; toast('Level progress reset'); },
    daily: () => { state.daily.last = yesterday(); toast('Daily reward can be claimed again'); },
    tasks: () => { const t = tasksToday(); TASKS.forEach((x) => { t.progress[x.id] = x.goal; }); toast('Daily tasks completed — claim them in Activities'); },
    event: () => {
      const E = state.event;
      for (let k = 0; k < 3 && E.levels.length < D.EVENT.levels; k++) { E.levels.push(3); E.pumpkins += EVENT_PUMPKINS_PER_WIN; }
      toast(`3 event levels won (${E.levels.length}/${D.EVENT.levels}) — pumpkins: ${E.pumpkins}`);
    },
    pumpkins: () => { state.event.pumpkins += 20; toast(`Pumpkins: ${state.event.pumpkins}`); },
    p_age: () => openPopup('popup-age'),
    p_offer: () => openOffer(),
    p_booster: () => showUnlock('booster', BOOSTERS[1]),
    p_feature: () => showUnlock('feature', FEATURES.frozen),
    // "Test a puzzle": a level with that puzzle (and its "New Feature!" pop-up)
    ...Object.fromEntries(PUZZLE_ORDER.map((p) => [`pz_${p}`, () => { closePopup(true); testPuzzle(p); }])),
    p_tutorial: () => { if (inGame()) startTutorial(); },
    p_story: () => startStory(() => {}),
    p_ad: () => showAd(() => toast('Ad finished')),
    reset: () => {
      if (!window.confirm('Delete ALL saved data (currencies, progress, skins, settings)?')) return;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      location.hash = ''; location.reload();
    },
  };
  function runCheat(cmd) {
    closePopup(true);
    DEBUG_CMDS[cmd]();
    if (!cmd.startsWith('p_') && !['win', 'lose', 'solve', 'speed', 'reset'].includes(cmd)) refreshAfterCheat();
  }

  // ---------- Click handling ----------
  const ACTIONS = {
    debug: () => openPopup('popup-debug'),
    dbg: (el) => runCheat(el.dataset.cmd),
    'tap-block': (el) => tapBlock(Number(el.dataset.col), Number(el.dataset.i || 0)),
    'slot-info': (el) => slotInfo(Number(el.dataset.slot)),
    // AD slot: watch a video, get one more free slot for this level (no star penalty)
    'ad-slot': (el) => {
      const k = el.dataset.k;
      if (!game || game.over || game.slotPlace.includes('ad' + k)) return;
      showAd(() => { const i = game.slots.push(null) - 1; game.slotPlace[i] = 'ad' + k; renderSlots(); toast('+1 slot unlocked!'); });
    },
    booster: (el) => useBooster(el.dataset.b),
    'booster-locked': (el) => { const b = BOOSTERS.find((x) => x.id === el.dataset.b); toast(`${b.name} unlocks at level ${b.unlockAt + 1}`); },
    // cycles through the speeds the player has (1x → 2x → 3x …); with none, opens the Speed Store
    speed: () => {
      const sp = availableSpeeds();
      if (sp.length === 1) return openSpeedStore();
      game.speed = sp[(sp.indexOf(game.speed) + 1) % sp.length];
      renderSpeed();
      toast(game.speed > 1 ? `Speed ${game.speed}x` : 'Normal speed');
    },
    'speed-store': () => openSpeedStore(),
    'sp-boost': (el) => buyBoost(Number(el.dataset.i)),
    'sp-tier': (el) => buyTier(Number(el.dataset.i)),
    pause: () => openPopup('popup-pause'),
    restart: () => { closePopup(true); startGame(game.theme, game.diff, game.index, { event: game.event }); },
    quit: () => { closePopup(true); if (game.event) showScreen('events'); else openTheme(game.theme); },
    'claim-x2': () => showAd(() => finishWin(2)),
    'win-continue': () => finishWin(1),
    'fail-addslot': () => showAd(() => { closePopup(true); game.slots.push(null); game.slotPlace.push('main'); game.extras += 1; game.over = false; renderSlots(); toast('+1 slot'); }),
    // dev shortcuts to preview the gameplay pop-ups: index.html#win, #fail, #booster, #feature, #tutorial
    game: () => startLevel(state.selected.theme, 'easy', 0),
    win: () => { ACTIONS.game(); showWin(); },
    fail: () => { ACTIONS.game(); openPopup('popup-fail'); },
    booster_popup: () => { ACTIONS.game(); showUnlock('booster', BOOSTERS[1]); },
    feature: () => { ACTIONS.game(); showUnlock('feature', FEATURES.mystery); },
    tutorial: () => { state.tutorialSeen = false; state.stats.levels = 0; ACTIONS.game(); },
    // dev: index.html#tut1 … #tut6 opens the tutorial at that step
    ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`tut${n}`, () => {
      state.tutorialSeen = false; state.stats.levels = 0; ACTIONS.game();
      coach.i = n - 1; coach.waiting = false; showCoachStep();
    }])),
    welcome: () => openPopup('popup-welcome'),
    story: () => startStory(() => toast('Story finished')),
    // dev: index.html#puzzle_key opens a level with that puzzle, #pzsolve_key lets the solution bot play it
    // #pzline_key shows the whole line (Free Pick) to see the puzzle blocks
    ...Object.fromEntries(PUZZLE_ORDER.flatMap((p) => [[`puzzle_${p}`, () => testPuzzle(p)], [`pzsolve_${p}`, () => testPuzzle(p, true)],
      [`pzline_${p}`, () => { testPuzzle(p, true); clearInterval(window.__bot); game.speed = 1; state.debugBoosters = true; state.boosters.pick = 5; useBooster('pick');
        const sel = { key: '.pz-tile.lock', wood: '.pz-tile.hammer', pipe: '.pz-tile.pipe', linked: '.linked', mlinked: '.linked' }[p] || '.block';
        const el = document.querySelector('#g-queue ' + sel);
        if (el) el.scrollIntoView({ block: 'center' }); }]])),
    story_last: () => { ACTIONS.story(); while (story.i < STORY.length - 1) nextStory(); }, // dev: jump to the last scene
    'story-next': () => nextStory(),
    'story-skip': () => endStory(),
    'welcome-play': () => { closePopup(true); startLevel('flowers', 'easy', 0); },
    howto: () => openPopup('popup-howto'),
    // dev: a simple bot plays the current level (taps a block whose color can reach a pixel)
    pick_test: () => { state.tutorialSeen = true; state.seen = allSeen(); state.debugBoosters = true; state.boosters.pick = 5; startGame(state.selected.theme, 'hard', 0); useBooster('pick'); },
    wind_test: () => { state.tutorialSeen = true; state.seen = allSeen(); state.debugBoosters = true; state.boosters.wing = 3; startGame(state.selected.theme, 'medium', 0); useBooster('wing'); },
    wind_fx: () => {
      ACTIONS.wind_test();
      setTimeout(() => { const r = $('g-board').getBoundingClientRect();
        $('g-board').dispatchEvent(new MouseEvent('click', { clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.3, bubbles: true })); }, 400);
    },
    // dev: a level with an active 2x boost (to check the countdown)
    boost_test: () => {
      state.tutorialSeen = true; state.seen = allSeen();
      state.speedBoostUntil = Date.now() + 19 * 60000 + 56000; startGame(state.selected.theme, 'easy', 0);
    },
    // dev: report of one level (flowers medium level 9 = index 3)
    level_report: () => {
      const g = buildLevel('flowers', 'medium', 3), H = g.cells.length, W = g.cells[0].length;
      const exposedColors = reachableColors(g.cells, (x, y) => !g.cells[y][x]);
      const name = (c) => `${c}(${D.PALETTE[c]})`;
      const lines = [`slots: ${g.slots.length} (+${D.AD_SLOTS} ad)`, `colors reachable at start: ${[...exposedColors].map(name).join(', ')}`,
        `columns (front first):`, ...g.cols.map((col, i) => `  col ${i + 1}: ${col.map((b) => `${b.color}${b.amount}${b.mystery ? '?' : ''}${b.frozen ? '*' : ''}`).join(' ')}`),
        `solution check: ${verifyLevel('flowers', 'medium', 3)}`];
      const pre = document.createElement('pre'); pre.id = 'verify-report'; pre.textContent = lines.join('\n'); document.body.appendChild(pre);
    },
    verify_all: () => {
      const pre = document.createElement('pre');
      pre.id = 'verify-report';
      pre.style.cssText = 'position:fixed;left:0;top:0;z-index:999;max-height:100%;overflow:auto;margin:0;padding:12px;background:#fff;font:12px monospace;white-space:pre-wrap';
      pre.textContent = verifyAll();
      document.body.appendChild(pre);
    },
    event_solve: () => { state.tutorialSeen = true; state.seen = allSeen(); startEventLevel(0); game.speed = FAST_SPEED; game.forceSpeed = true; startBot(true); },
    game_medium: () => startGame(state.selected.theme, 'medium', 0),
    game_hard: () => startGame(state.selected.theme, 'hard', 0),
    autoplay_medium: () => ACTIONS.autoplay('medium'),
    autoplay_hard: () => ACTIONS.autoplay('hard'),
    // careful bot: plays the blocks in solution order (proves every level can be won)
    solve_hard: () => ACTIONS.autoplay('hard', true),
    solve_medium: () => ACTIONS.autoplay('medium', true),
    // dev: index.html#layout_probe writes the game screen's layout boxes into <body data-rects> (for layout checks)
    layout_probe: () => { state.tutorialSeen = true; state.seen = allSeen(); startGame(state.selected.theme, 'medium', 0);
      setTimeout(() => { const r = (id) => { const b = $(id).getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
        document.body.dataset.rects = JSON.stringify({ screen: r('screen-game'), board: r('g-board'), hole: r('g-hole'), adslots: r('g-adslots'),
          slots: r('g-slots'), queue: r('g-queue'), boosters: r('g-boosters') }); }, 500); },
    autoplay: (diff, ordered) => {
      state.tutorialSeen = true; state.seen = allSeen();
      startGame(state.selected.theme, typeof diff === 'string' ? diff : 'easy', 0); game.speed = FAST_SPEED; game.forceSpeed = true;
      startBot(ordered);
    },
    levels: () => openTheme(state.selected.theme), // only the Levels screen (theme tabs) is used
    play: () => {
      const n = nextLevel(state.selected.theme);
      if (n) startLevel(n.theme, n.diff, n.index);
      else openTheme(state.selected.theme);
    },
    'open-theme': (el) => openTheme(el.dataset.theme, el.dataset.diff),
    'theme-step': (el) => stepTheme(Number(el.dataset.dir)),
    'pick-theme': (el) => { viewingTheme = el.dataset.theme; state.selected.theme = viewingTheme; saveState(); renderThemeLevels(); },
    'play-level': (el) => startLevel(el.dataset.theme, el.dataset.diff, Number(el.dataset.index)),
    theme: () => openTheme(state.selected.theme),
    collections: () => { colTab = 'gallery'; colPage = 0; showScreen('collections'); },
    'col-tab': (el) => { colTab = el.dataset.tab; colPage = 0; renderCollections(); },
    'col-page': (el) => { colPage = Math.max(0, colPage + Number(el.dataset.dir)); renderCollections(); },
    share: (el) => sharePicture(el.dataset.pic),
    events: () => showScreen('events'),
    'event-level': (el) => startEventLevel(Number(el.dataset.i)),
    'event-reward': (el) => claimEventReward(Number(el.dataset.i)),
    skins: () => showScreen('skins'),
    'skin-view': (el) => viewSkin(el.dataset.skin),
    'skin-prev': () => stepSkin(-1),
    'skin-next': () => stepSkin(1),
    'skin-use': (el) => useSkin(el.dataset.skin),
    'skin-buy': (el) => buySkin(el.dataset.skin),
    profile: () => { renderProfile(); openPopup('popup-profile'); },
    'edit-name': () => editName(),
    'pick-avatar': (el) => pickAvatar(el),
    age: (el) => chooseAge(el),
    'age-confirm': () => confirmAge(),
    offer: () => openOffer(),
    'buy-offer': () => buy('offer'),
    noads: () => { renderNoAds(); openPopup('popup-noads'); },
    restore: () => toast(state.noAds ? 'No Ads is already active' : 'No purchases to restore (test mode)'),
    age_gate: () => openPopup('popup-age'),
    activities: () => {
      activityTab = dailyInfo().claimedToday && activityCount() ? 'tasks' : 'daily';
      renderActivities(); openPopup('popup-activities');
    },
    'act-tab': (el) => { activityTab = el.dataset.tab; renderActivities(); },
    tasks: () => { activityTab = 'tasks'; renderActivities(); openPopup('popup-activities'); },
    'claim-daily': () => claimDaily(),
    'claim-task': (el) => claimTask(el.dataset.task),
    settings: () => { renderSettings(); openPopup('popup-settings'); },
    'copy-id': () => copyText(state.playerId),
    home: () => showScreen('menu'),
    store: () => showScreen('store'),
    buy: (el) => buy(el.dataset.item),
    'free-coins': () => watchFreeCoins(),
  };

  document.addEventListener('click', (e) => {
    // tutorial "tap this block" step: ignore every other button
    if (coachWantsTap()) {
      const blk = e.target.closest('[data-action="tap-block"]');
      if (!blk || Number(blk.dataset.col) !== coach.col || Number(blk.dataset.i || 0) !== 0) return;
    }
    // tap on the dark backdrop closes the pop-up
    if (openPopupEl && e.target === openPopupEl) return closePopup();
    const el = e.target.closest('[data-close], [data-toggle], [data-link], [data-action]');
    if (!el) return;
    haptic();
    if (el.hasAttribute('data-close')) return closePopup();
    if (el.dataset.toggle) return toggleSetting(el.dataset.toggle);
    if (el.dataset.link) return openLink(el.dataset.link);
    const action = el.dataset.action;
    if (el.disabled) return;
    if (ACTIONS[action]) return ACTIONS[action](el);
    toast(`${SCREEN_NAMES[action] || action} — coming soon`);
  });

  // ---------- Ambient bee swarm ----------
  function spawnSwarm(count) {
    const swarm = $('swarm');
    for (let i = 0; i < count; i++) {
      const img = document.createElement('img');
      img.src = 'assets/sprites/bee_fly.png';
      img.alt = '';
      swarm.appendChild(img);
      const bee = {
        el: img,
        x: Math.random() * 400, y: 160 + Math.random() * 500,
        a: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.8,
        wobble: Math.random() * 10, size: 24 + Math.random() * 12,
      };
      img.style.width = bee.size + 'px';
      bees.push(bee);
    }
  }
  const bees = [];
  function tick(t) {
    const w = $('app').clientWidth, h = $('app').clientHeight;
    for (const b of bees) {
      b.a += Math.sin(t / 900 + b.wobble) * 0.03;
      b.x += Math.cos(b.a) * b.speed;
      b.y += Math.sin(b.a) * b.speed * 0.6 + Math.sin(t / 200 + b.wobble) * 0.4;
      if (b.x < -40) b.x = w + 20; if (b.x > w + 40) b.x = -20;
      if (b.y < 150) b.a = Math.abs(b.a); if (b.y > h - 120) b.a = -Math.abs(b.a);
      const flip = Math.cos(b.a) > 0 ? 1 : -1; // bee_fly art faces right
      b.el.style.transform = `translate(${b.x}px, ${b.y}px) scaleX(${flip})`;
    }
    requestAnimationFrame(tick);
  }

  // ---------- Place the creature on the tree platform of the background ----------
  // assets/bg/menu.jpg is 1024x1536; the mossy platform surface is at y≈655 in that image.
  const BG = { w: 1024, h: 1536, platformY: 648 };
  function layoutMenuScene() {
    const scene = $('menu-scene'), wrap = $('ui-mascot-wrap');
    const W = scene.clientWidth, H = scene.clientHeight;
    const scale = Math.max(W / BG.w, H / BG.h);            // same math as background-size: cover
    const offsetY = (BG.h * scale - H) / 2;                 // centered crop
    const platform = BG.platformY * scale - offsetY;
    wrap.style.top = (platform - wrap.offsetHeight + 12) + 'px';
  }
  window.addEventListener('resize', layoutMenuScene);
  $('ui-mascot').addEventListener('load', layoutMenuScene);

  // ---------- Boot ----------
  $('dbg-btn').hidden = !DEBUG;
  state.launches += 1;
  saveState(); // also stores the new player id on first launch
  renderMenu();
  // First launch: age gate (cannot be skipped). Later launches: the special offer, at most once a day.
  // (skipped when a dev shortcut like index.html#skins is used)
  // ---------- Loading screen: preload images + fonts with a real progress bar ----------
  const PRELOAD = [
    'bg/menu.jpg', 'bg/event_halloween.jpg', 'bg/loading.jpg',
    ...['logo', 'bee', 'bee_fly', 'ladybug', 'ladybug_fly', 'beetle', 'butterfly', 'ant', 'firefly', 'coin', 'gem', 'coins_pile', 'gems_pile',
      'chest', 'gift', 'star', 'trophy', 'pumpkin', 'banner_wood', 'btn_plus', 'icon_settings', 'icon_collections', 'icon_activities',
      'icon_noads', 'icon_events', 'icon_store', 'icon_home', 'icon_skins', 'icon_music', 'icon_sfx', 'icon_haptics', 'icon_notifications',
      'icon_lock', 'icon_video_ad', 'icon_speed', 'block_mystery', 'block_ice', 'booster_add_slot', 'booster_shuffle', 'booster_wind',
      'booster_pick'].map((n) => `sprites/${n}.png`),
  ].map((p) => 'assets/' + p);
  function runLoading(done) {
    const fill = $('ld-fill'), start = Date.now();
    let loaded = 0;
    const total = PRELOAD.length + 1; // +1 = fonts
    const step = () => { loaded += 1; fill.style.width = Math.round((loaded / total) * 100) + '%'; if (loaded === total) finish(); };
    const finish = () => setTimeout(() => {
      $('loading').classList.add('done');
      setTimeout(() => { $('loading').remove(); done(); }, 500);
    }, Math.max(400, 2500 - (Date.now() - start))); // show it at least ~2.5 s (like commercial games)
    PRELOAD.forEach((src) => { const im = new Image(); im.onload = im.onerror = step; im.src = src; });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(step, step);
  }
  if (location.hash) {
    $('loading').remove(); // dev shortcuts skip the loading screen
  } else {
    runLoading(() => {
      if (!state.ageGroup) openPopup('popup-age');
      else maybeShowOffer();
    });
  }
  layoutMenuScene();
  renderEventTimer();
  setInterval(renderEventTimer, 30000);
  // PixiJS gameplay renderer (board, bugs, wind). If WebGL is missing the game falls back to the 2D canvas.
  const pixiReady = PSRender.init($('screen-game'),
    ['bee_fly', 'ladybug_fly', 'beetle', 'butterfly', 'ant', 'firefly', 'booster_wind'].map((n) => `assets/sprites/${n}.png`)
      .concat(['block_wood', 'cookie_intact', 'cookie_damaged', 'key', 'hidden_pixel'].map((n) => `assets/sprites/puzzles/${n}.png`)))
    .catch((e) => console.warn('PixiJS unavailable, using 2D canvas', e));
  // phone app: (re)schedule the "daily reward is ready" notification
  PSNative.scheduleDailyReward(state.settings.notifications);
  // Dev shortcut: index.html#settings opens that screen directly (after the renderer is ready)
  let startAction = location.hash.slice(1);
  // dev: add "-still" (e.g. #story_last-still) to freeze animations for screenshots
  if (startAction.endsWith('-still')) { startAction = startAction.slice(0, -6); document.body.classList.add('dev-still'); }
  pixiReady.then(() => { if (ACTIONS[startAction]) ACTIONS[startAction](); });
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    spawnSwarm(6);
    requestAnimationFrame(tick);
  }
})();
