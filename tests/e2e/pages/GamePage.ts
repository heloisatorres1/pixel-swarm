import { expect, type Locator, type Page } from '@playwright/test';
import { SAVE_KEY, returningPlayerSave } from '../fixtures/returning-player';

export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Page object for Pixel Swarm: the screens the test uses and the actions a player does on them.
 * Everything happens through real clicks on the page, like a person would play.
 */
export class GamePage {
  readonly menuLevelsButton: Locator;
  readonly levelsScreen: Locator;
  readonly gameScreen: Locator;
  readonly levelSubtitle: Locator;
  readonly speedButton: Locator;
  readonly speedLabel: Locator;
  readonly coins: Locator;
  readonly winPopup: Locator;
  readonly winName: Locator;
  readonly winCoins: Locator;
  readonly winStars: Locator;
  readonly failPopup: Locator;

  constructor(private readonly page: Page) {
    this.menuLevelsButton = page.locator('#screen-menu [data-action="levels"]');
    this.levelsScreen = page.locator('#screen-theme');
    this.gameScreen = page.locator('#screen-game');
    this.levelSubtitle = page.locator('#g-sub');
    this.speedButton = page.locator('#screen-game [data-action="speed"]');
    this.speedLabel = page.locator('#g-speed-label');
    this.coins = page.locator('#screen-game .ui-coins');
    this.winPopup = page.locator('#popup-complete');
    this.winName = page.locator('#win-name');
    this.winCoins = page.locator('#win-coins');
    this.winStars = page.locator('#win-stars img:not(.off)');
    this.failPopup = page.locator('#popup-fail');
  }

  // ---------- Levels screen ----------

  /** A level on the Levels screen. It is a button only when it can be played; locked levels are not. */
  levelButton(theme: string, difficulty: Difficulty, index: number): Locator {
    return this.page.locator(
      `#diff-sections [data-action="play-level"][data-theme="${theme}"][data-diff="${difficulty}"][data-index="${index}"]`,
    );
  }

  /** The star counter of a difficulty on the Levels screen, e.g. "★ 3/18". */
  starsTotal(difficulty: Difficulty): Locator {
    return this.page.locator(`#sec-${difficulty} .stars-total`);
  }

  /** Load a returning player's save, open the game and wait until the loading screen is gone. */
  async open() {
    await this.page.addInitScript(({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 2, savedAt: Date.now(), data }));
    }, { key: SAVE_KEY, data: returningPlayerSave });
    await this.page.goto('/');
    await expect(this.page.locator('#loading')).toHaveCount(0, { timeout: 30_000 });
    await expect(this.menuLevelsButton).toBeVisible();
  }

  /** Main menu -> Levels screen. */
  async openLevels() {
    await this.menuLevelsButton.click();
    await expect(this.levelsScreen).toBeVisible();
  }

  /** On the Levels screen: pick a theme tab (e.g. "flowers") and show its levels. */
  async pickTheme(theme: string) {
    await this.page.locator(`#theme-tabs [data-action="pick-theme"][data-theme="${theme}"]`).click();
  }

  /** On the Levels screen: start a level of the theme that is shown. */
  async startLevel(theme: string, difficulty: Difficulty, index: number) {
    await this.levelButton(theme, difficulty, index).click();
    await expect(this.gameScreen).toBeVisible();
  }

  // ---------- In a level ----------

  /** Tap the speed button until it shows the wanted speed (e.g. "5x"). */
  async setSpeed(label: string) {
    for (let i = 0; i < 5 && (await this.speedLabel.textContent()) !== label; i++) await this.speedButton.click();
    await expect(this.speedLabel).toHaveText(label);
  }

  /** The coins shown at the top of the level screen, as a number. */
  async coinCount(): Promise<number> {
    return Number((await this.coins.textContent())?.replace(/\D/g, ''));
  }

  /**
   * Play the level to the end, as fast as possible.
   * Strategy: take the front block of each column in turn (left, middle, right, left...); this order
   * always solves the level. Every free slot is used straight away, so several groups of bugs eat at
   * the same time instead of one after the other.
   */
  async solveLevel() {
    const freeSlot = '#g-slots .slot:not(:has(.block))';
    const columns = this.page.locator('#g-queue .qcol');
    const columnCount = await columns.count();
    let turn = 0;
    let emptyInARow = 0;

    while (!(await this.winPopup.isVisible())) {
      if (await this.failPopup.isVisible()) throw new Error('Level lost: the slots filled up');

      // wait for a free slot (or the end of the level)
      await this.page.waitForFunction(
        (sel) => !!document.querySelector(sel)
          || !document.getElementById('popup-complete')!.hidden
          || !document.getElementById('popup-fail')!.hidden,
        freeSlot, { timeout: 60_000, polling: 100 },
      );
      if (await this.winPopup.isVisible()) break;
      const free = await this.page.locator(freeSlot).count();
      if (!free) continue; // the fail pop-up opened; checked at the top of the loop

      const front = columns.nth(turn % columnCount).locator('[data-action="tap-block"]');
      if (await front.count()) {
        // Linked blocks (joined by a chain) go to the slots together: they need 2 free slots,
        // and the partner block uses the next column's turn.
        const linked = (await front.getAttribute('data-chain')) !== null;
        if (linked && free < 2) {
          await this.page.waitForTimeout(100);
          continue;
        }
        await front.click();
        if (linked) turn += 1;
        emptyInARow = 0;
      } else if (++emptyInARow > columnCount) {
        // every column is empty: the last bugs are still flying, the win pop-up comes next
        await expect(this.winPopup).toBeVisible({ timeout: 60_000 });
      }
      turn += 1;
    }
  }

  /** Close the "Level Complete" pop-up with Continue (the coins are added at this moment). */
  async continueAfterWin() {
    await this.winPopup.locator('[data-action="win-continue"]').click();
    await expect(this.winPopup).toBeHidden();
  }

  /** In a level: Menu button -> "Exit to Menu" (goes back to the Levels screen). */
  async exitToLevels() {
    await this.page.locator('#screen-game [data-action="pause"]').click();
    await this.page.locator('[data-action="quit"]', { hasText: 'Exit to Menu' }).click();
    await expect(this.levelsScreen).toBeVisible();
  }
}
