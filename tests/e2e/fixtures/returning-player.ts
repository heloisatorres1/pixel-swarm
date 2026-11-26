/**
 * Test data: a saved game for a returning player.
 * Loading it before the page opens skips the first-launch flow (age gate, story, tutorial),
 * the "New Feature!" pop-ups and the shop pop-ups, so the test goes straight to the levels.
 */
export const SAVE_KEY = 'pixelswarm.save.v1';

const ALL_PUZZLES = ['mystery', 'frozen', 'hidden', 'linked', 'big', 'pipe', 'key', 'wood', 'cookie', 'mlinked'];
const EASY_DONE = [3, 3, 3, 3, 3, 3]; // the 6 Easy levels finished with 3 stars: Medium is unlocked

export const returningPlayerSave = {
  ageGroup: '18+',
  storySeen: true,
  tutorialSeen: true,
  seen: Object.fromEntries(ALL_PUZZLES.map((p) => [p, true])),
  progress: { 'flowers-easy': EASY_DONE },
  stats: { levels: 6 },
  launches: 0,       // the special-offer pop-up only appears from the 2nd launch
  noAds: true,       // no video-ad breaks between levels
  maxSpeed: 5,       // the 5x speed is unlocked, so a level finishes faster
};
