import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page (route: /).
 * Mirrors the login.component.html selectors.
 */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    // The login form uses id="correo" and id="password"
    this.emailInput = page.locator('#correo');
    this.passwordInput = page.locator('#password');
    // The submit button has type="submit" and contains "Iniciar sesión"
    this.submitButton = page.getByRole('button', { name: /Iniciar sesión/i });
    // Error message lives inside a div with bg-gradient-to-r from-red-50
    this.errorMessage = page.locator('div.bg-gradient-to-r p');
  }

  /** Navigate to the login page. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForSelector('#correo', { timeout: 8000 });
  }

  /**
   * Fill credentials and click the submit button.
   * Does NOT wait for navigation — caller is responsible.
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Fill credentials and submit, then wait for navigation away from '/'.
   */
  async loginAndWaitForNav(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await Promise.all([
      this.page.waitForURL((url) => !url.pathname.endsWith('/'), { timeout: 10000 }),
      this.submitButton.click(),
    ]);
  }

  /** Assert that an error message containing the given text is visible. */
  async expectError(text: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
    await expect(this.errorMessage).toContainText(text);
  }

  /** Assert that the page is at the login route. */
  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/^\/?$|\/$/);
    await expect(this.emailInput).toBeVisible();
  }
}
