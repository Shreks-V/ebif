import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../pages/login.page';
import { NavPage } from '../pages/nav.page';
import { ApiMockHelper } from '../fixtures/api-mock.helper';

// ────────────────────────────────────────────────────────────────────────────
// Build the same mock token that global-setup creates, so we can inject it
// directly into sessionStorage for auth tests that need it.
// ────────────────────────────────────────────────────────────────────────────
function buildMockToken(): string {
  const tokenPath = path.join(__dirname, '../.auth/token.txt');
  if (fs.existsSync(tokenPath)) {
    return fs.readFileSync(tokenPath, 'utf8').trim();
  }
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin@ebif.local',
      id_usuario: 1,
      nombre: 'Admin EBIF',
      rol: 'ADMINISTRADOR',
      exp: 9999999999,
    })
  )
    .toString('base64')
    .replace(/=/g, '');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.FAKE_E2E_SIG`;
}

const MOCK_TOKEN = buildMockToken();

// ── Auth tests bypass the global storageState ────────────────────────────────
test.describe('Auth', () => {
  // Disable the pre-injected auth state so login tests start clean
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login_correcto – fill credentials and navigate to dashboard', async ({ page }) => {
    const api = new ApiMockHelper(page);

    // Mock the login endpoint to return our fake JWT
    await page.route('**/api/auth/login**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: MOCK_TOKEN, token_type: 'bearer' }),
      });
    });

    // Mock all protected API calls so dashboard can load
    await api.mockAll();

    const login = new LoginPage(page);
    await login.goto();

    // Fill and submit
    await login.emailInput.fill('admin@espinabifida.org');
    await login.passwordInput.fill('admin123');

    await Promise.all([
      page.waitForURL('**/dashboard**', { timeout: 10000 }),
      login.submitButton.click(),
    ]);

    await expect(page).toHaveURL(/dashboard/);
  });

  test('login_credenciales_invalidas – 401 response shows error message', async ({ page }) => {
    // Mock login to fail
    await page.route('**/api/auth/login**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Credenciales incorrectas' }),
      });
    });

    const login = new LoginPage(page);
    await login.goto();
    await login.login('wrong@example.com', 'wrongpassword');

    // Should show error and stay on login
    await login.expectError(/credenciales|incorrecto|error/i);
    await expect(page).toHaveURL(/^\/?$|\/\s*$/);
  });

  test('login_campos_vacios – cannot submit with empty fields', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // Submit button should be disabled when fields are empty
    await expect(login.submitButton).toBeDisabled();

    // Fill only email — still disabled
    await login.emailInput.fill('test@test.com');
    await expect(login.submitButton).toBeDisabled();

    // Fill only password (clear email first)
    await login.emailInput.fill('');
    await login.passwordInput.fill('secret');
    await expect(login.submitButton).toBeDisabled();
  });

  test('redirige_a_login_sin_auth – unauthenticated navigation to /dashboard redirects to /', async ({
    page,
  }) => {
    // No storageState, no token — navigating to a protected route should redirect
    await page.goto('/dashboard');
    // Angular's authGuard redirects to '' (root / login)
    await expect(page).toHaveURL(/^\/?$|\/\s*$/, { timeout: 8000 });
  });

  test('logout – click logout in navbar, redirected to /', async ({ page }) => {
    // Inject a valid token so the app thinks we are logged in
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('token', token);
    }, MOCK_TOKEN);

    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    const nav = new NavPage(page);
    await nav.logout();

    await expect(page).toHaveURL(/^\/?$|\/\s*$/, { timeout: 8000 });
  });
});
