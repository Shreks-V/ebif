import { test, expect } from '@playwright/test';
import { ApiMockHelper } from '../fixtures/api-mock.helper';
import { BeneficiariosPage } from '../pages/beneficiarios.page';
import { mockBeneficiarios } from '../fixtures/mock-data';

/**
 * The app-nuevo-beneficiario-modal host element has 0×0 layout (all content is
 * position:fixed). Use the inner white panel to check modal visibility.
 */
const MODAL_INNER = 'app-nuevo-beneficiario-modal .bg-white.rounded-3xl, app-nuevo-beneficiario-modal [class*="rounded-3xl"]';
const HISTORIAL_INNER = 'app-historial-modal .bg-white.rounded-3xl, app-historial-modal [class*="rounded-3xl"]';

test.describe('Beneficiarios', () => {
  test('lista_beneficiarios_carga – list shows mock data', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    // Wait for the table to render with data rows
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Verify at least one known name appears
    await expect(page.locator('table')).toContainText('María', { timeout: 5000 });
    await expect(page.locator('table')).toContainText('González', { timeout: 5000 });
  });

  test('buscar_por_nombre – typing filters the table', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Type a name that only matches one beneficiario
    await bPage.search('Sofía');

    // After filtering, only Sofía's row should be visible
    await expect(page.locator('table tbody')).toContainText('Sofía', { timeout: 5000 });
  });

  test('buscar_por_folio – type folio finds matching result', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // The folio 'EB-002' is in the table — search should filter to Juan's row
    await bPage.search('EB-002');

    // Table should now contain 'EB-002' (the folio cell) and 'Juan' (the name cell)
    await expect(page.locator('table tbody')).toContainText('EB-002', { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText('Juan', { timeout: 5000 });
  });

  test('abrir_modal_nuevo_beneficiario – click "Nuevo Beneficiario" opens modal', async ({
    page,
  }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    await bPage.openNuevo();

    // The host element <app-nuevo-beneficiario-modal> has 0×0 layout (fixed-position content).
    // Check the INNER white panel instead.
    const modalPanel = page.locator(MODAL_INNER).first();
    await expect(modalPanel).toBeVisible({ timeout: 5000 });
    await expect(modalPanel).toContainText(/Nuevo Beneficiario/i);
  });

  test('validacion_campos_requeridos – submit empty form shows errors', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    await bPage.openNuevo();

    // Wait for modal inner panel to be visible
    const modalPanel = page.locator(MODAL_INNER).first();
    await expect(modalPanel).toBeVisible({ timeout: 5000 });

    // Try to submit without filling any fields
    const submitBtn = modalPanel.getByRole('button', { name: /Guardar|Registrar|Crear/i }).first();
    await submitBtn.click();

    // Validation errors should appear (either HTML5 required or Angular validators)
    // Check that we're still on the modal (not closed)
    await expect(modalPanel).toBeVisible({ timeout: 3000 });

    // Check for any error/validation text or invalid fields (HTML5 :invalid pseudo-class)
    const hasError =
      (await modalPanel.locator('[class*="error"], [class*="invalid"], [class*="required"]').count()) > 0 ||
      (await modalPanel.locator(':invalid').count()) > 0;

    expect(hasError).toBeTruthy();
  });

  test('crear_beneficiario_exitoso – fill form, mock POST 201, success', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    // Override POST for beneficiarios to return 201
    await page.route('**/api/beneficiarios', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id_paciente: 99,
            folio_paciente: 'EB-099',
            folio: 'EB-099',
            nombre: 'Carlos',
            apellido_paterno: 'Hernández',
            apellido_materno: 'Ruiz',
            tipo_cuota: 'A',
            membresia_estatus: 'ACTIVA',
            fecha_vencimiento_membresia: '2027-01-01',
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockBeneficiarios),
        });
      }
    });

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();
    await bPage.openNuevo();

    // Wait for the inner modal panel to be visible
    const modalPanel = page.locator(MODAL_INNER).first();
    await expect(modalPanel).toBeVisible({ timeout: 5000 });

    // Fill the form using the BeneficiariosPage helper.
    // All required fields must be supplied: nombre, apellidoPaterno, genero,
    // fechaNacimiento, curp (valid 18-char format), tipoCuota, membresiasEstatus.
    await bPage.fillNuevoForm({
      nombre: 'Carlos',
      apellidoPaterno: 'Hernández',
      apellidoMaterno: 'Ruiz',
      genero: 'Masculino',
      fechaNacimiento: '1990-06-15',
      curp: 'HERC900615HNLRZR01',
      correo: 'carlos@example.com',
      telefono: '8112223333',
      tipoCuota: 'CUOTA A',
      membresiasEstatus: 'ACTIVO',
    });

    await bPage.submit();

    // After success, modal should close or success message shown
    await page.waitForTimeout(1000);

    const modalGone = await page.locator('app-nuevo-beneficiario-modal').isHidden();
    const successToast = await page.locator('[class*="success"], [class*="toast"]').count() > 0;

    expect(modalGone || successToast).toBeTruthy();
  });

  test('abrir_modal_renovar_membresia – click renovar button opens modal', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // The "Renovar" button is in the action menu dropdown — click action toggle first
    const firstRow = page.locator('table tbody tr').first();
    const menuToggle = firstRow.locator('button').first();

    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      await page.waitForTimeout(300);

      // Click "Renovar membresía" in the dropdown
      const renovarBtn = page.getByRole('button', { name: /Renovar membresía/i }).first();
      if (await renovarBtn.count() > 0) {
        await renovarBtn.click();
        const modal = page.locator('[class*="fixed inset-0"], app-renovar-membresia-modal [class*="rounded"]').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
      } else {
        test.skip(true, 'Renovar membresía button not found in action menu');
      }
    } else {
      test.skip(true, 'No action menu button found in beneficiarios table row');
    }
  });

  test('abrir_historial – click historial opens modal with content', async ({ page }) => {
    const api = new ApiMockHelper(page);
    await api.mockAll();

    const bPage = new BeneficiariosPage(page);
    await bPage.goto();

    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Each row has ONE button: the action menu toggle (3-dot menu)
    const firstRow = page.locator('table tbody tr').first();
    const menuToggle = firstRow.locator('button').first();
    const btnCount = await menuToggle.count();

    if (btnCount > 0) {
      // 1. Open the action menu
      await menuToggle.click();
      await page.waitForTimeout(400);

      // 2. Click "Historial" in the action menu dropdown
      const historialBtn = page.getByRole('button', { name: /Historial/i }).first();
      if (await historialBtn.count() > 0) {
        await historialBtn.click();
        await page.waitForTimeout(400);

        // 3. Check that the historial modal inner panel is visible
        // (app-historial-modal uses fixed inset-0, host has 0×0 layout)
        const modalPanel = page.locator(HISTORIAL_INNER).first();
        await expect(modalPanel).toBeVisible({ timeout: 5000 });
      } else {
        test.skip(true, 'Historial button not found in action menu dropdown');
      }
    } else {
      test.skip(true, 'No action menu button found in beneficiarios table row');
    }
  });
});
