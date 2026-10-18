const { chromium } = require('playwright');
const path = require('path');

async function captureAll() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone']
  });
  const page = await context.newPage();

  // 1. Landing Screen
  console.log('Loading landing page...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_landing.png' });
  console.log('Saved screenshot_landing.png');

  // 2. Setup Screen
  console.log('Navigating to setup screen...');
  await page.click('button:has-text("Proceed to Interview Setup")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_setup.png' });
  console.log('Saved screenshot_setup.png');

  // 3. Permissions Check Modal
  console.log('Opening Hardware & Permissions modal...');
  await page.click('button:has-text("Next: Hardware & Permissions Check")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshot_permissions.png' });
  console.log('Saved screenshot_permissions.png');

  // 4. DSA Round Screen
  console.log('Entering DSA Round...');
  await page.click('button:has-text("Enter Fullscreen Interview")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot_dsa_round.png' });
  console.log('Saved screenshot_dsa_round.png');

  // 5. Test Running Code in DSA Round
  console.log('Testing "Run Code" in DSA Round...');
  const runBtn = await page.$('button:has-text("Run (5 Open Cases)")');
  if (runBtn) {
    await runBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'screenshot_dsa_executed.png' });
    console.log('Saved screenshot_dsa_executed.png');
  }

  // 6. Navigate to Technical Round
  console.log('Advancing to Technical Round...');
  const proceedBtn = await page.$('button:has-text("Proceed to Next Round")');
  if (proceedBtn) {
    await proceedBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot_technical.png' });
    console.log('Saved screenshot_technical.png');

    // 7. Conclude Technical Round to advance to HR Round
    console.log('Concluding Technical Round...');
    const concludeBtn = await page.$('button:has-text("Conclude Round")');
    if (concludeBtn) {
      await concludeBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshot_hr.png' });
      console.log('Saved screenshot_hr.png');

      // 8. Conclude HR Round to reach Results Screen
      console.log('Finishing HR Round to reach Results Screen...');
      const finishBtn = await page.$('button:has-text("Finish & View Assessment")');
      if (finishBtn) {
        await finishBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshot_results.png', fullPage: true });
        console.log('Saved screenshot_results.png');
      }
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureAll().catch(console.error);
