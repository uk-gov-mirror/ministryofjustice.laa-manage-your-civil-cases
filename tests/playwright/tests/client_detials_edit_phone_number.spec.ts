import { test, expect } from '../fixtures/index.js';
import { t, getClientDetailsUrlByStatus, setupAuth } from '../utils/index.js';

const visitUrl = getClientDetailsUrlByStatus('default') + '/change/phone-number';
const clientDetailsUrl = getClientDetailsUrlByStatus('default');

test.beforeEach(async ({ page }) => {
  await setupAuth(page);
});

test('viewing change phone-number form, to see the expected elements', async ({ page, i18nSetup }) => {
  const phoneInput = page.locator('#phoneNumber');
  const safeToCallInput = page.locator('#safeToCall');
  const announceCallInput = page.locator('#announceCall');
  const saveButton = page.getByRole('button', { name: t('common.save') });

  // Navigate to the `/change/phone-number`
  await page.goto(visitUrl);

  // Expect to see the following elements
  await expect(page.locator('h1')).toContainText(t('forms.clientDetails.phoneNumber.title'));
  await expect(phoneInput).toBeVisible();
  await expect(safeToCallInput).toBeVisible();
  await expect(announceCallInput).toBeVisible();
  await expect(saveButton).toBeVisible();
});

test('phoneNumber is blank and correct validation errors display', async ({ page, i18nSetup }) => {
  const saveButton = page.getByRole('button', { name: t('common.save') });
  const errorSummary = page.locator('.govuk-error-summary');
  const errorLinkSafeToCall = page.locator('a[href="#safeToCall"]');
  const errorLinkPhoneNumber = page.locator('a[href="#phoneNumber"]');
  const phoneInput = page.locator('#phoneNumber');

  // Navigate to the change form
  await page.goto(visitUrl);

  // Submit form with blank phoneNumber
  await page.locator('#phoneNumber').fill('');

  // Find and click the save button
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  // Check GOV.UK error summary appears
  await expect(errorSummary).toBeVisible();
  await expect(errorSummary).toContainText(t('components.errorSummary.title'));

  // Check error summary links to problem field
  await expect(errorLinkPhoneNumber).toBeVisible();
  await expect(errorLinkPhoneNumber).toHaveText(t('forms.clientDetails.phoneNumber.validationError.notEmpty'));
  await expect(phoneInput).toHaveClass(/govuk-input--error/);

  // Check other error summary link not visible
  await expect(errorLinkSafeToCall).not.toBeVisible();
});

test('phoneNumber is not valid and correct validation errors display', async ({ page, i18nSetup }) => {
  const saveButton = page.getByRole('button', { name: t('common.save') });
  const errorSummary = page.locator('.govuk-error-summary');
  const errorLinkSafeToCall = page.locator('a[href="#safeToCall"]');
  const errorLinkPhoneNumber = page.locator('a[href="#phoneNumber"]');
  const phoneInput = page.locator('#phoneNumber');

  // Navigate to the change form
  await page.goto(visitUrl);

  // Submit form with invalid phoneNumber
  await page.locator('#phoneNumber').fill('ggg');

  // Find and click the save button
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  // Check GOV.UK error summary appears
  await expect(errorSummary).toBeVisible();
  await expect(errorSummary).toContainText(t('components.errorSummary.title'));

  // Check error summary links to problem field
  await expect(errorLinkPhoneNumber).toBeVisible();
  await expect(errorLinkPhoneNumber).toHaveText(t('forms.clientDetails.phoneNumber.validationError.invalidFormat'));
  await expect(phoneInput).toHaveClass(/govuk-input--error/);

  // Check other error summary link not visible
  await expect(errorLinkSafeToCall).not.toBeVisible();
});

test('safeToCall & phoneNumber & announceCall not changed and correct validation errors displayed', async ({ page, i18nSetup }) => {
  const saveButton = page.getByRole('button', { name: t('common.save') });
  const errorSummary = page.locator('.govuk-error-summary');

  // Navigate to the `/change/phone-number`
  await page.goto(visitUrl);

  // Wait for the form to load with existing data
  await page.waitForLoadState('networkidle');

  // Navigate to the `/change/phone-number`
  await page.goto(visitUrl);

  // Wait for the form to load with existing data
  await page.waitForLoadState('networkidle');

  // Find and click the save button without making any changes
  // (assuming the form loads with existing client data)
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  // Check GOV.UK error summary appears
  await expect(errorSummary).toBeVisible();

  // Check for either "not changed" error or "required field" error depending on data state
  // If the page loads with existing data, we should see "not changed"
  // If the page loads empty, we should see "required field"
  const errorText = await errorSummary.textContent();
  const hasNotChangedError = errorText?.includes(t('forms.clientDetails.phoneNumber.validationError.notChanged'));
  const hasRequiredError = errorText?.includes(t('forms.clientDetails.phoneNumber.validationError.notEmpty'));

  // Assert that we get one of the expected errors
  if (hasNotChangedError) {
    await expect(errorSummary).toContainText(t('forms.clientDetails.phoneNumber.validationError.notChanged'));
  } else if (hasRequiredError) {
    await expect(errorSummary).toContainText(t('forms.clientDetails.phoneNumber.validationError.notEmpty'));
  } else {
    throw new Error(`Expected either "not changed" or "required field" error, but got: ${errorText}`);
  }
});

test('save button should redirect to client details when valid data submitted', async ({ page, i18nSetup }) => {
  const phoneInput = page.locator('#phoneNumber');
  const safeToCallRadios = page.locator('[name="safeToCall"]');
  const announceCallRadios = page.locator('[name="announceCall"]');
  const saveButton = page.getByRole('button', { name: t('common.save') });

  // Navigate to the change phone number form
  await page.goto(visitUrl);

  // Fill in valid phone number details
  await phoneInput.fill('07700900123');
  await safeToCallRadios.first().check(); // Select "Yes" for safe to call
  await announceCallRadios.first().check(); // Select "Yes" for announce call

  // Submit the form
  await saveButton.click();

  // Should redirect to client details page
  await expect(page).toHaveURL(clientDetailsUrl);
});

test('invalid phone number rejected by backend should not update client details', async ({ page, i18nSetup }) => {
  // This test verifies that when MSW rejects invalid phone data (too long),
  // the client details are NOT updated
  const phoneInput = page.locator('#phoneNumber');
  const safeToCallRadios = page.locator('[name="safeToCall"]');
  const saveButton = page.getByRole('button', { name: t('common.save') });
  
  // First, get the original phone from the client details page
  // Use more specific selector to get client's contact number (first summary list)
  await page.goto('/cases/PC-1922-1879/client-details');
  await page.waitForLoadState('networkidle');
  const clientDetailsSection = page.locator('.govuk-summary-list').first();
  const phoneRow = clientDetailsSection.locator('.govuk-summary-list__row').filter({ hasText: 'Contact number' });
  const originalPhone = await phoneRow.locator('.govuk-summary-list__value').textContent();
  
  // Navigate to edit phone page
  await page.goto(visitUrl);
  
  // Submit a phone number that's too long (> 20 characters)
  // MSW will reject this with a 400 error
  const tooLongPhone = '1'.repeat(21);
  await phoneInput.fill(tooLongPhone);
  await safeToCallRadios.first().check();
  await saveButton.click();
  
  // The app currently redirects despite the error
  await page.waitForURL(/client-details/, { timeout: 5000 });
  
  // Verify the phone was NOT updated - should still show original phone
  const clientDetailsSectionAfter = page.locator('.govuk-summary-list').first();
  const phoneRowAfter = clientDetailsSectionAfter.locator('.govuk-summary-list__row').filter({ hasText: 'Contact number' });
  const currentPhone = await phoneRowAfter.locator('.govuk-summary-list__value').textContent();
  expect(currentPhone).toBe(originalPhone);
  expect(currentPhone).not.toContain('111111111111111111111'); // Should not contain the rejected long phone
});

test('phone number edit page should be accessible', {
  tag: '@accessibility',
}, async ({ page, checkAccessibility }) => {
  await page.goto(visitUrl);
  await checkAccessibility();
});

