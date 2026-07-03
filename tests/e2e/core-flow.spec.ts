import { test, expect } from '@playwright/test';

test.describe('CareerOS Core Flow', () => {
  test('User can paste career info and generate a resume', async ({ page }) => {
    // Navigate to the app workspace
    await page.goto('http://localhost:3000/app');

    // Wait for initial load
    await expect(page.locator('text=CareerPath AI')).toBeVisible();

    // Fill the chat input with messy career info
    const chatInput = page.locator('textarea[placeholder*="Paste career info"]');
    await chatInput.fill('I am a frontend developer with 5 years of experience using React and Next.js. I worked at TechCorp and built a dashboard that increased engagement by 20%.');
    
    // Press send
    await chatInput.press('Enter');

    // Wait for AI response and "CareerPath AI is working" animation to finish
    await expect(page.locator('text=CareerPath AI is working')).toBeVisible();
    await expect(page.locator('text=CareerPath AI is working')).toBeHidden({ timeout: 15000 });

    // Verify the resume score is displayed
    await expect(page.locator('text=Career Readiness Score')).toBeVisible();
    
    // Switch to Memory tab
    await page.click('button:has-text("Memory")');
    await expect(page.locator('text=TechCorp')).toBeVisible();
    
    // Verify the Score Panel exists on the sidebar
    await expect(page.locator('aside h2:has-text("Resume Score")')).toBeVisible();
  });
});
