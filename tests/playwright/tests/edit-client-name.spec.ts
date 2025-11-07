import { test, expect } from '../fixtures/index.js';
import { setupAuth } from '../utils/index.js';

test.describe('Edit Client Name', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('viewing change name form should display expected elements', async ({ pages, i18nSetup }) => {
    const editNamePage = pages.editName;
    await editNamePage.navigate();
    await editNamePage.expectPageLoaded(editNamePage.getExpectedHeading());
  });

  test('cancel link should navigate back to client details', async ({ pages, i18nSetup }) => {
    await pages.editName.expectCancelNavigatesBack();
  });

  test('save button should redirect to client details when valid data submitted', async ({ pages, i18nSetup }) => {
    const editNamePage = pages.editName;
    await editNamePage.submitWithValidName('John Updated Smith');
    await editNamePage.expectSuccessfulSubmission();
  });

  test('MSW handler should reject invalid request data structure', async ({ page, pages, i18nSetup }) => {
    // This test verifies that the MSW handler validates the request payload
    // We'll send a name that's too long (> 400 characters)
    const editNamePage = pages.editName;
    await editNamePage.navigate();
    
    // Create a name that exceeds the 400 character limit
    const tooLongName = 'A'.repeat(401);
    
    // Intercept the PATCH request to verify MSW returns 400
    let requestFailed = false;
    let responseStatus = 0;
    
    page.on('response', async (response) => {
      if (response.url().includes('/personal_details/') && response.request().method() === 'PATCH') {
        responseStatus = response.status();
        if (responseStatus === 400) {
          requestFailed = true;
          const body = await response.json();
          // Verify the error structure matches what we expect from MSW
          expect(body).toHaveProperty('full_name');
          expect(body.full_name).toContain('Ensure this field has no more than 400 characters.');
        }
      }
    });
    
    await editNamePage.fillName(tooLongName);
    await editNamePage.clickSave();
    
    // Wait a moment for the API call to complete
    await page.waitForTimeout(500);
    
    // Verify MSW rejected the request
    expect(requestFailed).toBe(true);
    expect(responseStatus).toBe(400);
  });

  test('name form displays validation errors correctly', async ({ pages, i18nSetup }) => {
    const editNamePage = pages.editName;
    await editNamePage.submitWithEmptyName();
    await editNamePage.expectErrorSummaryVisible();
    
    // Check individual field error appears
    await expect(editNamePage.nameError).toBeVisible();
  });

  test('unchanged name triggers change detection error', async ({ pages, i18nSetup }) => {
    const editNamePage = pages.editName;
    await editNamePage.submitWithoutChanges();
    await editNamePage.expectErrorSummaryVisible();
    
    // Check that the error summary contains the expected change detection message
    const errorSummary = editNamePage.errorSummary;
    await expect(errorSummary).toContainText("Change the client name");
  });

  test('name edit page should be accessible', {
    tag: '@accessibility',
  }, async ({ pages, checkAccessibility }) => {
    await pages.editName.navigate();
    await checkAccessibility();
  });
});