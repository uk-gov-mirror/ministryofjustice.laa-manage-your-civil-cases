import { test, expect } from '../fixtures/index.js';
import { t, getClientDetailsUrlByStatus, setupAuth } from '../utils/index.js';
import { EditEmailPage } from '../pages/EditEmailPage.js';

test.beforeEach(async ({ page }) => {
  await setupAuth(page);
});

test('viewing change email-address form, to see the expected elements', async ({ page, i18nSetup }) => {
  const editEmailPage = new EditEmailPage(page);

  // Navigate to the email edit form
  await editEmailPage.navigate();

  // Assert all main elements are visible
  await editEmailPage.assertMainElementsVisible();
});


test('change email address form displays validation errors correctly', async ({ page, i18nSetup }) => {
  const editEmailPage = new EditEmailPage(page);

  // Navigate to the change form and test validation
  await editEmailPage.navigate();
  await editEmailPage.assertInvalidEmailValidation('JackYoungs.com');
});

test('invalid email rejected by backend should not update client details', async ({ page, i18nSetup }) => {
  // This test verifies that when MSW rejects invalid email data,
  // the client details are NOT updated
  const editEmailPage = new EditEmailPage(page);
  
  // First, get the original email from the client details page
  // Use more specific selector to get client's email (first one in the client details section)
  await page.goto('/cases/PC-1922-1879/client-details');
  await page.waitForLoadState('networkidle');
  const clientDetailsSection = page.locator('.govuk-summary-list').first();
  const emailRow = clientDetailsSection.locator('.govuk-summary-list__row').filter({ hasText: 'Email address' });
  const originalEmail = await emailRow.locator('.govuk-summary-list__value').textContent();
  
  // Navigate to edit email page
  await editEmailPage.navigate();
  
  // Submit an invalid email (MSW will reject non-email format)
  await editEmailPage.fillEmailAddress('not-an-email-address');
  await editEmailPage.clickSave();
  
  // The app currently redirects despite the error
  await page.waitForURL(/client-details/, { timeout: 5000 });
  
  // Verify the email was NOT updated - should still show original email
  const clientDetailsSectionAfter = page.locator('.govuk-summary-list').first();
  const emailRowAfter = clientDetailsSectionAfter.locator('.govuk-summary-list__row').filter({ hasText: 'Email address' });
  const currentEmail = await emailRowAfter.locator('.govuk-summary-list__value').textContent();
  expect(currentEmail).toBe(originalEmail);
  expect(currentEmail).not.toBe('not-an-email-address');
});

test('email address edit page should be accessible', {
  tag: '@accessibility',
}, async ({ page, checkAccessibility }) => {
  const editEmailPage = new EditEmailPage(page);
  await editEmailPage.navigate();
  await checkAccessibility();
});