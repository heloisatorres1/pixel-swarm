import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

const THEME = { id: 'flowers', name: 'Flowers' };
const MEDIUM_WIN_COINS = 45; // coins a Medium win gives (WIN_COINS in js/app.js)

/**
 * A returning player (all Easy levels done) wins the first Medium level of Flowers.
 * Checks the win pop-up, the coin reward, and that the win is saved: stars on the
 * Levels screen and the next Medium level unlocked.
 */
test('Player completes a Medium level (Flowers, level 1)', async ({ page }) => {
  const game = new GamePage(page);

  await test.step('Open the game as a returning player (Easy levels already finished)', async () => {
    await game.open();
    await game.openLevels();
    await game.pickTheme(THEME.id);
  });

  await test.step('Before: Medium level 1 is open, level 2 is locked, no Medium stars yet', async () => {
    await expect(game.levelButton(THEME.id, 'medium', 0)).toBeVisible();
    await expect(game.levelButton(THEME.id, 'medium', 1)).toHaveCount(0);
    await expect(game.starsTotal('medium')).toHaveText('★ 0/18');
  });

  let coinsBefore = 0;
  await test.step('Start Medium level 1 at 5x speed', async () => {
    await game.startLevel(THEME.id, 'medium', 0);
    await expect(game.levelSubtitle).toHaveText(`${THEME.name} • Medium`);
    await game.setSpeed('5x');
    coinsBefore = await game.coinCount();
  });

  await test.step('Play the level to the end (real clicks on the blocks)', async () => {
    await game.solveLevel();
  });

  await test.step('The "Level Complete" pop-up shows the picture, stars and coin reward', async () => {
    await expect(game.winPopup).toBeVisible();
    await expect(game.winName).toContainText(THEME.name);
    await expect(game.winCoins).toHaveText(`+${MEDIUM_WIN_COINS}`);
    expect(await game.winStars.count()).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(1500); // let the star animation play, so it shows in the video
  });

  await test.step(`Continue: the player receives ${MEDIUM_WIN_COINS} coins`, async () => {
    await game.continueAfterWin();
    await expect.poll(() => game.coinCount()).toBe(coinsBefore + MEDIUM_WIN_COINS);
  });

  await test.step('After: the win is saved (Medium stars, level 2 unlocked)', async () => {
    await game.exitToLevels();
    await expect(game.starsTotal('medium')).not.toHaveText('★ 0/18');
    await expect(game.levelButton(THEME.id, 'medium', 1)).toBeVisible();
    await page.waitForTimeout(2000); // hold the final screen at the end of the video
  });
});
