import { test, expect } from '../fixtures/index.js';
import { t, getClientDetailsUrlByStatus, setupAuth } from '../utils/index.js';

const visitUrl = getClientDetailsUrlByStatus('default') + '/change/address';
const clientDetailsUrl = getClientDetailsUrlByStatus('default');

test.beforeEach(async ({ page }) => {
  await setupAuth(page);
});

test('viewing change address form, to see the expected elements', async ({ page, i18nSetup }) => {
  const addressInput = page.locator('#address');
  const postcodeInput = page.locator('#postcode');
  const saveButton = page.getByRole('button', { name: t('common.save') });

  // Navigate to the `/change/address`
  await page.goto(visitUrl);

  // Expect to see the following elements
  await expect(page.locator('h1')).toContainText(t('forms.clientDetails.address.title'));
  await expect(addressInput).toBeVisible();
  await expect(postcodeInput).toBeVisible();
  await expect(saveButton).toBeVisible();

  // Note: Form pre-population testing requires mock data service configuration
  // For now, we test the form structure without specific data expectations
});

test('unchanged fields trigger change detection error (AC5)', async ({ page, i18nSetup }) => {
  const saveButton = page.getByRole('button', { name: t('common.save') });
  const errorSummary = page.locator('.govuk-error-summary');

  // Navigate to the edit form
  await page.goto(visitUrl);

  // Submit form (should trigger AC5 validation error)
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  // Check GOV.UK error summary appears for change detection
  await expect(errorSummary).toBeVisible();
  await expect(errorSummary).toContainText(t('components.errorSummary.title'));
  await expect(errorSummary).toContainText(t('forms.clientDetails.address.validationError.notChanged'));

  // AC5 change detection error should NOT have inline field error messages
  const addressErrorMessage = page.locator('#address-error');
  const postcodeErrorMessage = page.locator('#postcode-error');
  await expect(addressErrorMessage).not.toBeVisible();
  await expect(postcodeErrorMessage).not.toBeVisible();
});

test('save button should redirect to client details when valid data submitted', async ({ page, i18nSetup }) => {
  const addressInput = page.locator('#address');
  const postcodeInput = page.locator('#postcode');
  const saveButton = page.getByRole('button', { name: t('common.save') });

  // Navigate to the change address form
  await page.goto(visitUrl);

  // Fill in valid address details (ensure they're different from any existing data)
  await addressInput.fill('123 New Street\nLondon');
  await postcodeInput.fill('SW1A 1AA');

  // Submit the form
  await saveButton.click();

  // Should redirect to client details page
  await expect(page).toHaveURL(clientDetailsUrl);
});

test('invalid address rejected by backend should not update client details', async ({ page, i18nSetup }) => {
  // This test verifies that when MSW rejects invalid address data (too long),
  // the client details are NOT updated
  const addressInput = page.locator('#address');
  const postcodeInput = page.locator('#postcode');
  const saveButton = page.getByRole('button', { name: t('common.save') });
  
  // First, get the original address from the client details page
  await page.goto('/cases/PC-1922-1879/client-details');
  
  // Get the client's address (row 4, which is index 3 in 0-based)
  // Note: Row 4 is in the "Contact Details" section, Row 12 is third party's address
  const allRows = await page.locator('.govuk-summary-list__row').all();
  const clientAddressRow = allRows[4]; // 5th row (0-indexed) is the client's address
  const originalAddress = await clientAddressRow.locator('.govuk-summary-list__value').textContent();
  console.log('[TEST] Original address:', originalAddress);
  
  // Navigate to edit address page
  await page.goto(visitUrl);
  
  // Submit an address with street that's too long (> 255 characters)
  // MSW will reject this with a 400 error
  const tooLongStreet = 'A'.repeat(256);
  console.log('[TEST] Submitting street with length:', tooLongStreet.length);
  await addressInput.fill(tooLongStreet);
  await postcodeInput.fill('SW1A 1AA');
  await saveButton.click();
  
  // The app currently redirects despite the error
  await page.waitForURL(/client-details/, { timeout: 5000 });
  
  // Verify the address was NOT updated - should still show original address
  const allRowsAfter = await page.locator('.govuk-summary-list__row').all();
  const clientAddressRowAfter = allRowsAfter[4];
  const currentAddress = await clientAddressRowAfter.locator('.govuk-summary-list__value').textContent();
  console.log('[TEST] Current address after rejected update:', currentAddress);
  expect(currentAddress).toBe(originalAddress);
  expect(currentAddress).not.toContain('AAAA'); // Should not contain the rejected long street
});

test('address edit page should be accessible', {
  tag: '@accessibility',
}, async ({ page, checkAccessibility }) => {
  await page.goto(visitUrl);
  await checkAccessibility();
});
