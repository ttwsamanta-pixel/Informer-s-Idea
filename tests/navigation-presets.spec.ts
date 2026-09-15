import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resizePresets } from '../src/config/resize-presets';

async function uploadPhoto(page: Page) {
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#4166dd';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#ffb457';
    ctx.fillRect(180, 100, 280, 280);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  });
}

test('hover mega menus contain icons and close on leave, switch, scroll, and navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const image = nav.getByRole('button', { name: 'Image Tools', exact: true });
  await image.hover();
  await expect(page.locator('#menu-image')).toBeVisible();
  await expect(page.locator('#menu-image .mega-tool-icon')).toHaveCount(15);
  await expect(image).toHaveAttribute('aria-expanded', 'true');
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/mega-menu-desktop.png',
  });
  await image.click();
  await page.mouse.move(20, 750);
  await expect(page.locator('#menu-image')).toHaveCount(0);
  await image.hover();
  await nav.getByRole('button', { name: 'PDF Tools', exact: true }).hover();
  await expect(page.locator('#menu-pdf')).toBeVisible();
  await expect(page.locator('#menu-image')).toHaveCount(0);
  await nav.getByRole('button', { name: 'All Tools', exact: true }).hover();
  await expect(page.locator('#menu-all a[href^="/tools/"]')).toHaveCount(82);
  await page.locator('#menu-all').evaluate((el) => {
    el.scrollTop = 150;
  });
  await expect(page.locator('#menu-all')).toBeVisible();
  await page.mouse.wheel(0, 500);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(page.locator('#menu-all')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500);
  // Return to the top before Playwright scrolls the sticky trigger into view.
  // Otherwise that automatic scroll correctly dismisses the newly opened menu.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await image.hover();
  await page
    .locator('#menu-image')
    .getByRole('link', { name: 'Resize Image' })
    .click();
  await expect(page).toHaveURL(/tools\/resize-image/);
  await expect(page.locator('.mega-panel')).toHaveCount(0);
});

test('keyboard and outside click dismiss menus without leaving them stuck open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const trigger = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Image Tools', exact: true });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(page.locator('#menu-image a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-image')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.hover();
  await page.mouse.click(20, 750);
  await expect(page.locator('.mega-panel')).toHaveCount(0);
  await trigger.focus();
  await trigger.press('ArrowDown');
  await page.getByRole('button', { name: 'Search tools', exact: true }).focus();
  await expect(page.locator('.mega-panel')).toHaveCount(0);
});

test('YouTube replaces the header CTA with two local channel logos and exact links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: /YouTube/ }).hover();
  const panel = page.locator('#menu-youtube');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.channel-card')).toHaveCount(2);
  for (const [handle, name] of [
    ['informersidea', "Informer's Idea"],
    ['informersideabangla', "Informer's Idea Bangla"],
  ]) {
    const link = panel.locator(`a[href="https://www.youtube.com/@${handle}"]`);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toContainText(name);
    expect(
      await link
        .locator('img')
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    ).toBeTruthy();
  }
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/youtube-dropdown-desktop.png',
  });
  await expect(
    page.locator('header .nav-actions a[href="/all-tools"]'),
  ).toHaveCount(0);
  await expect(
    page
      .locator('footer')
      .getByRole('link', { name: 'All Tools', exact: true }),
  ).toBeVisible();
  await page.mouse.move(20, 750);
  await expect(panel).toHaveCount(0);
});

test('mobile menus support tap, tool expansion, channel links, and small screens', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: /YouTube/ }).tap();
  await expect(page.locator('#menu-youtube')).toBeVisible();
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/youtube-dropdown-mobile.png',
  });
  await page.getByRole('button', { name: /YouTube/ }).tap();
  await expect(page.locator('#menu-youtube')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  const mobile = page.getByRole('navigation', { name: 'Mobile navigation' });
  await mobile
    .getByRole('button', { name: 'Show Image Tools', exact: true })
    .tap();
  await expect(mobile.locator('#mobile-image')).toBeVisible();
  await mobile.getByRole('link', { name: 'Resize Image', exact: true }).tap();
  await expect(page).toHaveURL(/tools\/resize-image/);
  await expect(mobile).toHaveCount(0);
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBeTruthy();
  }
  await context.close();
});

test('each resize preset applies exact dimensions and produces the chosen output size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/tools/resize-image');
  for (const preset of resizePresets)
    await expect(
      page.getByRole('button', { name: new RegExp('^' + preset.name + ' ') }),
    ).toBeDisabled();
  await uploadPhoto(page);
  for (const preset of resizePresets) {
    const button = page.getByRole('button', {
      name: new RegExp('^' + preset.name + ' '),
    });
    await button.click();
    await expect(page.getByLabel('Width (px)', { exact: true })).toHaveValue(
      String(preset.width),
    );
    await expect(page.getByLabel('Height (px)', { exact: true })).toHaveValue(
      String(preset.height),
    );
    await expect(page.getByLabel('Lock aspect ratio')).not.toBeChecked();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: /^PAN Card / }).click();
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/resize-presets-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Resize Image', exact: true }).click();
  const download = page.waitForEvent('download');
  await page
    .locator('.result-card')
    .getByRole('button', { name: 'Download', exact: true })
    .click();
  const buffer = await readFile((await (await download).path())!);
  const size = await page.evaluate(async (data) => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(data)]));
    const size = [bitmap.width, bitmap.height];
    bitmap.close();
    return size;
  }, Array.from(buffer));
  expect(size).toEqual([295, 413]);
  await page.getByLabel('Width (px)', { exact: true }).fill('300');
  await expect(page.locator('.resize-preset[aria-pressed=true]')).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Process another / Clear' }).click();
  await expect(page.locator('.resize-preset[aria-pressed=true]')).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: /^PAN Card / })).toBeDisabled();
});
