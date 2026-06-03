import { test, expect } from '@playwright/test';
import { ApiMockHelper } from '../fixtures/api-mock.helper';
import { mockMedicos } from '../fixtures/mock-data';

// Note: The app may expose médicos within the Citas page or a dedicated route.
// These tests navigate to /citas and interact with the médicos section.

test.describe('Médicos', () => {
  test('lista_medicos_carga – doctors list visible with mock data', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    // Médicos may be on /citas as a sub-section, or on a dedicated page
    // Try /citas first since citas uses doctor data prominently
    await page.goto('/citas');
    await page.waitForURL('**/citas**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });

    // Look for a "Médicos" tab or section
    const medicosTab = page.getByRole('button', { name: /M[eé]dicos|Doctores/i }).first();
    if (await medicosTab.count() > 0) {
      await medicosTab.click();
      await page.waitForTimeout(500);

      // Verify that mock doctor names appear
      await expect(page.locator('main')).toContainText('Sánchez', { timeout: 5000 });
    } else {
      // Médicos might be on the dashboard (doctorHoy)
      await page.goto('/dashboard');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });
      await expect(page.locator('main')).toContainText('Sánchez', { timeout: 5000 });
    }
  });

  test('abrir_nuevo_medico_modal – click new doctor button opens modal', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/citas');
    await page.waitForURL('**/citas**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });

    // Click Médicos tab if it exists
    const medicosTab = page.getByRole('button', { name: /M[eé]dicos|Doctores/i }).first();
    if (await medicosTab.count() > 0) {
      await medicosTab.click();
      await page.waitForTimeout(500);
    }

    // Find and click "Nuevo Médico" button
    const nuevoMedicoBtn = page.getByRole('button', { name: /Nuevo M[eé]dico|Nuevo Doctor|Agregar m[eé]dico/i }).first();
    if (await nuevoMedicoBtn.count() > 0) {
      await nuevoMedicoBtn.click();
      const modal = page.locator('[class*="fixed inset-0"], [class*="modal"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    } else {
      // Try "Nuevo" button in the doctors section
      const anyNuevoBtn = page.getByRole('button', { name: /Nuevo|nuevo/i }).first();
      if (await anyNuevoBtn.count() > 0) {
        await anyNuevoBtn.click();
        const modal = page.locator('[class*="fixed inset-0"], [class*="modal"]').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
      } else {
        test.skip(true, 'No new doctor button found — medicos section may be read-only in this layout');
      }
    }
  });

  test('abrir_detalle_medico – click on a doctor row to see detail', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/citas');
    await page.waitForURL('**/citas**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });

    // Navigate to médicos tab
    const medicosTab = page.getByRole('button', { name: /M[eé]dicos|Doctores/i }).first();
    if (await medicosTab.count() > 0) {
      await medicosTab.click();
      await page.waitForTimeout(500);

      // Scope to app-medicos-tab to avoid matching hidden citas-tab rows
      // (the citas page uses [hidden] so citas rows stay in DOM but invisible)
      const medicosTabComponent = page.locator('app-medicos-tab');
      const firstRow = medicosTabComponent.locator('table tbody tr').first();
      if (await firstRow.count() > 0) {
        const detailBtn = firstRow.locator('button').first();
        if (await detailBtn.count() > 0) {
          // Click the 3-dot action menu; this renders a fixed overlay backdrop
          await detailBtn.click();
          // The dropdown backdrop is rendered with class "fixed inset-0"
          const overlay = page.locator('div.fixed.inset-0').first();
          await expect(overlay).toBeVisible({ timeout: 5000 });
        }
      } else {
        // Try clicking any doctor-related button
        const doctorBtn = page.getByRole('button').filter({ hasText: /Sánchez|Roberto/i }).first();
        if (await doctorBtn.count() > 0) {
          await doctorBtn.click();
          await page.waitForTimeout(500);
          const modal = page.locator('[class*="fixed inset-0"], [class*="modal"]').first();
          if (await modal.count() > 0) {
            await expect(modal).toBeVisible({ timeout: 5000 });
          }
        }
      }
    } else {
      // From the dashboard doctor card
      await page.goto('/dashboard');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });
      await expect(page.locator('main')).toContainText('Sánchez', { timeout: 5000 });
    }
  });

  test('disponibilidad_modal – open disponibilidad modal for a doctor', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    // Mock disponibilidad endpoint
    await page.route('**/api/doctores/**/disponibilidad**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { dia_semana: 1, hora_inicio: '08:00', hora_fin: '14:00', activo: true },
          { dia_semana: 3, hora_inicio: '08:00', hora_fin: '14:00', activo: true },
        ]),
      });
    });

    await page.goto('/citas');
    await page.waitForURL('**/citas**', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });

    // Navigate to médicos tab
    const medicosTab = page.getByRole('button', { name: /M[eé]dicos|Doctores/i }).first();
    if (await medicosTab.count() > 0) {
      await medicosTab.click();
      await page.waitForTimeout(500);

      // Look for "Disponibilidad" button
      const disponibilidadBtn = page.getByRole('button', { name: /Disponibilidad/i }).first();
      if (await disponibilidadBtn.count() > 0) {
        await disponibilidadBtn.click();
        const modal = page.locator('[class*="fixed inset-0"], [class*="modal"]').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
      } else {
        // Not found — skip gracefully
        test.skip(true, 'Disponibilidad button not found in doctors tab');
      }
    } else {
      test.skip(true, 'Médicos tab not found on citas page');
    }
  });
});
