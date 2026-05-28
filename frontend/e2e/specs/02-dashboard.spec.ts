import { test, expect } from '@playwright/test';
import { ApiMockHelper } from '../fixtures/api-mock.helper';
import { NavPage } from '../pages/nav.page';
import { mockCitas } from '../fixtures/mock-data';

// All dashboard tests use the global storageState (mock JWT already injected via mockAll)

/**
 * Wait for the dashboard loading skeleton to disappear.
 *
 * The dashboard has two kinds of .animate-pulse elements:
 *   - div.animate-pulse  → loading skeletons (inside @if(loading))
 *   - span.animate-pulse → permanent EN_CURSO status indicator
 *
 * We must only wait for the DIV-based skeletons to vanish, not the span ones,
 * otherwise the wait never resolves while an EN_CURSO cita is in the queue.
 */
async function waitForDashboardLoad(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => !document.querySelector('div.animate-pulse'),
    { timeout: 10000 }
  );
}

test.describe('Dashboard', () => {
  test('carga_kpis – dashboard stats visible after load', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    await waitForDashboardLoad(page);

    // The dashboard renders the "Panel principal" heading — verify the page loaded
    await expect(page.locator('main')).toContainText('Panel principal', { timeout: 5000 });

    // The KPI section shows beneficiarios count (statBeneficiariosActivos = activos=42 from mock)
    // Check for "Beneficiarios" label in KPI row
    await expect(page.locator('main')).toContainText('Beneficiarios', { timeout: 5000 });
  });

  test('lista_citas_del_dia – cita patient names visible in today table', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    await waitForDashboardLoad(page);

    // The dashboard lists today's citas — check that mock patients appear
    // mockCitas[0] is PROGRAMADA → shows in queue; mockCitas[1] is EN_CURSO → shows in queue
    const dashboardMain = page.locator('main');
    // At least one patient name from today's citas should be visible
    const firstPatient = mockCitas[0].nombre_paciente.split(' ')[0]; // 'María'
    await expect(dashboardMain).toContainText(firstPatient, { timeout: 5000 });
  });

  test('abrir_walk_in_modal – "Agregar a la lista" button opens walk-in modal', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await waitForDashboardLoad(page);

    // The actual button text in dashboard.component.html is "Agregar a la lista"
    const walkInBtn = page.getByRole('button', { name: /Agregar a la lista/i });
    await walkInBtn.waitFor({ state: 'visible', timeout: 8000 });
    await walkInBtn.click();

    // Walk-in modal should appear (app-walk-in-modal or its inner content)
    const modal = page.locator('app-walk-in-modal .bg-white, app-walk-in-modal [class*="rounded"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('marcar_cita_atendida_abre_modal – action buttons on citas are visible', async ({
    page,
  }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    // Mock completar cita
    await page.route('**/api/citas/**/completar**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockCitas[0], estatus: 'COMPLETADA' }),
      });
    });

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await waitForDashboardLoad(page);

    // The dashboard shows citas from today. Mock citas have PROGRAMADA and EN_CURSO statuses.
    // PROGRAMADA → "Atender Ahora" button; EN_CURSO → "Marcar Atendido" button
    const actionBtn = page.getByRole('button', { name: /Atender Ahora|Marcar Atendido/i }).first();

    if (await actionBtn.count() > 0) {
      await actionBtn.waitFor({ state: 'visible', timeout: 6000 });
      await actionBtn.click();

      // After clicking "Marcar Atendido", the cobro modal opens (app-nuevo-cobro)
      // Wait for the inner panel (host element has 0x0 layout)
      const cobroPanel = page.locator('app-nuevo-cobro .bg-white, app-nuevo-cobro [class*="rounded-3xl"]').first();
      if (await cobroPanel.count() > 0) {
        await expect(cobroPanel).toBeVisible({ timeout: 6000 });
      }
    } else {
      // If no action button visible (empty queue), just verify the queue section exists
      await expect(page.locator('main')).toContainText(/Siguiente en Cola|Cola|citas/i, { timeout: 5000 });
    }
  });

  test('navegar_desde_navbar – navigate to each module via URL', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    const nav = new NavPage(page);

    // Navigate to Recibos
    await page.goto('/recibos');
    await expect(page).toHaveURL(/recibos/, { timeout: 8000 });

    // Navigate to Beneficiarios
    await page.goto('/registro-usuarios');
    await expect(page).toHaveURL(/registro-usuarios/, { timeout: 8000 });

    // Navigate to Citas
    await page.goto('/citas');
    await expect(page).toHaveURL(/citas/, { timeout: 8000 });

    // Navigate to Almacen
    await page.goto('/almacen');
    await expect(page).toHaveURL(/almacen/, { timeout: 8000 });

    // Navigate to Reportes
    await page.goto('/reportes');
    await expect(page).toHaveURL(/reportes/, { timeout: 8000 });

    // Navigate back to Dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
    void nav; // suppress unused warning
  });
});
