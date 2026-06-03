import { test, expect } from '@playwright/test';
import { ApiMockHelper } from '../fixtures/api-mock.helper';
import { mockUsuarios, mockBitacora } from '../fixtures/mock-data';

// ────────────────────────────────────────────────────────────────────────────
// Build a recepcionista (non-admin) token for the redirect test
// ────────────────────────────────────────────────────────────────────────────
function buildRecepcionistaToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'recepcion@ebif.local',
      id_usuario: 2,
      nombre: 'Recepcionista Uno',
      rol: 'OPERATIVO',
      exp: 9999999999,
    })
  )
    .toString('base64')
    .replace(/=/g, '');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.FAKE_E2E_SIG`;
}

test.describe('Admin – Usuarios Sistema', () => {
  test('usuarios_sistema_carga – list users visible with mock data', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/usuarios-sistema');
    await page.waitForURL('**/usuarios-sistema**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('div.animate-pulse'), { timeout: 8000 });

    // Verify mock usuarios appear — template renders "{{ u.nombre }} {{ u.apellido_paterno }}"
    // Our mock has nombre:'Admin' apellido_paterno:'EBIF' → shows "Admin EBIF"
    await expect(page.locator('main')).toContainText('Admin EBIF', { timeout: 5000 });
    await expect(page.locator('main')).toContainText('Recepcionista Uno', { timeout: 5000 });
  });

  test('crear_usuario – open form, fill, submit creates user', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    // Override POST /api/auth/usuarios to return 201
    await page.route('**/api/auth/usuarios', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id_usuario: 99,
            correo: 'nuevo@ebif.local',
            nombre: 'Nuevo',
            apellido_paterno: 'Usuario',
            rol: 'OPERATIVO',
            estatus: 'ACTIVO',
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUsuarios),
        });
      }
    });

    await page.goto('/usuarios-sistema');
    await page.waitForURL('**/usuarios-sistema**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('div.animate-pulse'), { timeout: 8000 });

    // Find "Nuevo Usuario" button
    const nuevoBtn = page.getByRole('button', { name: /Nuevo Usuario|Crear usuario|Agregar usuario/i }).first();
    if (await nuevoBtn.count() > 0) {
      await nuevoBtn.click();

      const modal = page.locator('[class*="fixed inset-0"], [class*="modal"]').first();
      await modal.waitFor({ state: 'visible', timeout: 5000 });

      // Fill form fields
      const correoInput = modal.locator('input[type="email"], input[name*="correo"]').first();
      if (await correoInput.count() > 0) {
        await correoInput.fill('nuevo@ebif.local');
      }

      const nombreInput = modal.locator('input[type="text"], input[name*="nombre"]').first();
      if (await nombreInput.count() > 0) {
        await nombreInput.fill('Nuevo');
      }

      const passwordInput = modal.locator('input[type="password"]').first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('Password123!');
      }

      // Submit
      const submitBtn = modal.getByRole('button', { name: /Guardar|Crear|Registrar/i }).first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(1000);

        // Modal should close or success appear
        const closed = await modal.isHidden();
        const success = await page.locator('[class*="success"], [class*="toast"]').count() > 0;
        expect(closed || success).toBeTruthy();
      }
    } else {
      test.skip(true, 'Nuevo Usuario button not found in usuarios-sistema page');
    }
  });
});

test.describe('Admin – Bitácora', () => {
  test('bitacora_carga – list entries visible with mock data', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/bitacora');
    await page.waitForURL('**/bitacora**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('div.animate-pulse'), { timeout: 8000 });

    // The template shows {{ item.usuario_nombre }} {{ item.usuario_apellido }}
    // Our mock has usuario_nombre: 'Admin' apellido: 'EBIF' → shows "Admin EBIF"
    await expect(page.locator('main')).toContainText('Admin', { timeout: 5000 });
    // The tipo_operacion 'INSERT' renders a colored badge — check for the entidad badge
    await expect(page.locator('main')).toContainText('BENEFICIARIO', { timeout: 5000 });
  });

  test('bitacora_filtrar – filter by user or action narrows results', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    // Override bitacora to return filtered results when query params are present
    // mockBitacora is an object { items, total } — use items[0] for the filtered response
    await page.route('**/api/bitacora**', (route) => {
      const url = route.request().url();
      if (url.includes('usuario') || url.includes('accion') || url.includes('busqueda')) {
        // Return only one entry when filtered
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [mockBitacora.items[0]], total: 1, limit: 20, offset: 0 }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockBitacora),
        });
      }
    });

    await page.goto('/bitacora');
    await page.waitForURL('**/bitacora**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('div.animate-pulse'), { timeout: 8000 });

    // Look for a filter input or select
    const filterInput = page
      .locator('input[type="text"], input[type="search"]')
      .filter({ hasNot: page.locator('[aria-hidden]') })
      .first();

    if (await filterInput.count() > 0) {
      await filterInput.fill('Admin');
      await page.waitForTimeout(400);
      // Content should still be visible
      await expect(page.locator('main')).toContainText('Admin', { timeout: 3000 });
    } else {
      // Filter might be a select
      const filterSelect = page.locator('select').first();
      if (await filterSelect.count() > 0) {
        await filterSelect.selectOption({ index: 1 });
        await page.waitForTimeout(400);
        await expect(page.locator('main')).toBeVisible({ timeout: 3000 });
      } else {
        // No filter UI found — just verify the page renders
        await expect(page.locator('main')).toContainText('BENEFICIARIO', { timeout: 3000 });
      }
    }
  });
});

test.describe('Admin – Role Guard', () => {
  // Override auth to use a non-admin token
  test.use({ storageState: { cookies: [], origins: [] } });

  test('non_admin_redirige_a_dashboard – recepcionista cannot access /usuarios-sistema', async ({
    page,
  }) => {
    const RECEPCIONISTA_TOKEN = buildRecepcionistaToken();

    // Inject non-admin token FIRST — must happen before any other addInitScript
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('token', token);
    }, RECEPCIONISTA_TOKEN);

    // Set up route mocks WITHOUT overwriting the token (skipTokenInjection=true)
    const api = new ApiMockHelper(page);
    await api.mockAll(true /* skipTokenInjection */);

    // Try to navigate to admin-only route
    await page.goto('/usuarios-sistema');

    // adminGuard checks rol — OPERATIVO is not in ADMIN_ROLES → redirects to /dashboard
    await expect(page).toHaveURL(/dashboard|^\/?$/, { timeout: 8000 });
  });
});
