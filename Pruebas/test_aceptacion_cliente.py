"""Pruebas de Aceptación con Cliente — Sesión 2026-05-27.

Tipo: Manuales (no automatizables — se ejecutaron en vivo con el cliente).
Cliente: Lupita (David Robles Arreola) — Asociación de Espina Bífida (EBIF).
Equipo: Andrés Huerta Robinson, Ricardo Bastida Rodríguez, Emilio Antonio Peralta Montiel.
Duración de la sesión: 36 min 3 s.
Ambiente: Producción (URL pública).

Resultados generales:
  PASS  6 / 8 escenarios
  FAIL  1 / 8 escenarios (exportar PDF)
  WARN  1 / 8 escenarios (issue menor en selector de fecha)

Veredicto del cliente: ACEPTADO con observaciones.
  "Está muy completo y la verdad sí me gusta este manejo de este sistema."

Ejecución:
  Estos tests se marcan con ``pytest.mark.manual`` y siempre se saltan en CI.
  Para registrar los resultados en Qase manualmente, usa la interfaz web de Qase TestOps:
    https://app.qase.io/run/FJ26SV
"""

from __future__ import annotations

import pytest
from qase.pytest import qase
from Pruebas.qase_decorators import qase_case

pytestmark = pytest.mark.manual


# ─────────────────────────────────────────────────────────────────────────────
# AT-01  Acceso y autenticación en producción
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT01",
    title_es="Acceso y autenticación en producción",
    layer="e2e",
)
def test_at01_acceso_autenticacion() -> None:
    """
    Escenario: El cliente accede a la aplicación desplegada en producción.

    Pasos ejecutados (0:42 – 2:45):
      1. El equipo comparte el link de la aplicación.
      2. El cliente abre la URL en su MacBook.
      3. El cliente localiza las credenciales de demostración en el login.
      4. Ingresa correo y contraseña; hace clic en "Iniciar sesión".
      5. La aplicación carga el dashboard principal.

    Resultado esperado: Login exitoso; dashboard visible con menú de navegación.
    Resultado real:     ✅ PASS — Login completado correctamente.
                        El cliente observó: "Sí ya lo vi, no me había percatado que
                        aquí estaba abajo." (credenciales de demo).
    Observación: En producción final las credenciales de demo no estarán visibles.
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-02  Crear recibo de cobro completo
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT02",
    title_es="Crear recibo de cobro completo (paciente + productos + pago)",
    layer="e2e",
)
def test_at02_crear_recibo_cobro() -> None:
    """
    Escenario: El cliente registra un cobro para Juan Carlos García con consulta,
    sonda y gel antibacterial, pagado en efectivo.

    Pasos ejecutados (3:00 – 11:44):
      1. Desde el dashboard, hace clic en "Nuevo recibo".
      2. Busca y selecciona al paciente "Juan Carlos García".
      3. Agrega concepto: Consulta (servicio).
      4. Agrega concepto: Sonda (10 unidades).
      5. Agrega concepto: Gel antibacterial (20 unidades).
      6. Hace clic en "Agregar 3 conceptos al cobro".
      7. Selecciona método de pago: Efectivo, monto $175.
      8. Hace clic en "Guardar cobro".

    Resultado esperado: Recibo creado; confirmación visible.
    Resultado real:     ✅ PASS — Cobro guardado exitosamente.

    Incidente registrado (DEF-01):
      En el primer intento, el sistema devolvió error 500 "No se puede registrar
      venda" (10:54). Causa: el equipo también tenía una sesión abierta
      simultáneamente, causando conflicto de concurrencia en producción.
      Resolución inmediata: el cliente refrescó la página y reintentó (11:15);
      el cobro se guardó sin problemas.
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-03  Registro de nuevo beneficiario
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT03",
    title_es="Registro de nuevo beneficiario (formulario multi-paso)",
    layer="e2e",
)
def test_at03_registro_nuevo_beneficiario() -> None:
    """
    Escenario: El cliente registra un beneficiario de prueba "David Humberto
    Roblesque Arreola" llenando el formulario completo.

    Pasos ejecutados (12:09 – 21:11):
      1. Navega al módulo Beneficiarios.
      2. Hace clic en "Nuevo beneficiario".
      3. Ingresa nombre, apellidos.
      4. Intenta seleccionar fecha de nacimiento con el ícono de calendario.
         → Issue menor: el doble clic en el ícono no abrió el selector de año/mes.
         → Se corrigió: el cliente ingresó la fecha manualmente.
      5. Ingresa CURP (con formato válido).
      6. Selecciona tipo de sangre: "O Positivo".
      7. Omite campos no obligatorios (colonia, teléfono) — sin asterisco.
      8. Hace clic en "Guardar beneficiario".
      9. Verifica la credencial del beneficiario desde los 3 puntitos de acción.

    Resultado esperado: Beneficiario registrado; credencial generada y visible.
    Resultado real:     ✅ PASS — Beneficiario guardado y credencial mostrada.
                        El cliente tomó captura de pantalla de la credencial (21:06).

    Issue registrado (DEF-02):
      El selector de fecha (doble clic en ícono de calendario) no desplegó el
      picker de año/mes en el equipo MacBook del cliente. El workaround de
      escritura manual funcionó correctamente.

    Observación del cliente (21:03):
      "¿Es que iba a preguntarle a Berta si había problema por hacer cambio de
      formato?" → El equipo confirmó que pueden ajustar el formato de credencial
      si el cliente pasa su plantilla actual.
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-04  Agregar existencias al inventario
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT04",
    title_es="Agregar existencias a producto existente (recepción de mercancía)",
    layer="e2e",
)
def test_at04_agregar_existencias_inventario() -> None:
    """
    Escenario: El cliente simula haber recibido 700 unidades de Gel Antibacterial 1L
    y actualiza el stock desde el módulo de Almacén.

    Pasos ejecutados (24:45 – 26:50):
      1. Navega al módulo Almacén > pestaña Inventario.
      2. Usa el buscador (lupa) y busca "gel".
      3. Localiza "Gel Antibacterial 1L" (18 piezas existentes).
      4. En la columna Acciones, hace clic en el botón "+" (Agregar unidades).
      5. Ingresa cantidad: 700 unidades.
      6. Motivo: "Recepción de mercancía" (valor predeterminado).
      7. Hace clic en "Confirmar entrada".

    Resultado esperado: Stock actualizado; contador del inventario refleja 706 piezas
                        (18 previas + 700 nuevas = 706 con el gel de cobro del AT-02).
    Resultado real:     ✅ PASS — Stock actualizado a 706 piezas (27:00).
                        Cliente: "OK, ya está aquí el inventario 706, muy bien."

    Nota del equipo (26:49):
      Ricardo explicó que el campo "Motivo" alimenta la bitácora de almacén y es
      recomendable mantener el texto descriptivo para auditoría.
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-05  Reporte consolidado mensual (visualización)
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT05",
    title_es="Reporte consolidado mensual — visualización y desglose",
    layer="e2e",
)
def test_at05_reporte_consolidado_mensual() -> None:
    """
    Escenario: El cliente consulta el reporte mensual del mes en curso y verifica
    las gráficas, totales y desglose por método de pago.

    Pasos ejecutados (27:00 – 30:25):
      1. Navega al módulo Reportes.
      2. En el reporte mensual, el rango de fechas ya está en el mes actual.
      3. Hace clic en "Consultar".
      4. Revisa los KPIs en grande (números y gráficas).
      5. Baja para ver el desglose de métodos de pago (sección añadida por el equipo).
      6. Baja para ver el reporte en formato David (reporte consolidado).
      7. Hace clic en "Consultar" en esa sección.

    Resultado esperado: Reporte visible con gráficas, totales, y desglose de métodos de pago.
    Resultado real:     ✅ PASS — Reporte mostrado correctamente.
                        Cliente: "De hecho, me agrada así porque los números están en
                        grande, las gráficas y acá el dato desglosado."
                        Cliente sobre el desglose de pagos: "no está perfecto." (aprobado).

    Clarificación de tabla "Edades" (30:45 – 31:40):
      El equipo tenía duda sobre una tabla con números que el cliente les había enviado.
      Cliente aclaró: la tabla muestra el total de personas que asisten por mes
      (ej. enero: 75 beneficiarios atendidos). El promedio anual es de 80-84 personas/mes.
      El equipo confirmó que se agregará en la entrega final.
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-06  Exportar reporte a PDF
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT06",
    title_es="Exportar reporte consolidado mensual a PDF",
    layer="e2e",
)
def test_at06_exportar_reporte_pdf() -> None:
    """
    Escenario: El cliente intenta exportar el reporte consolidado mensual como PDF.

    Pasos ejecutados (28:03 – 28:20):
      1. Desde la sección de Reportes, con el reporte mensual consultado.
      2. Hace clic en el botón "PDF".

    Resultado esperado: Se genera y descarga el PDF del reporte.
    Resultado real:     ❌ FAIL — El cliente reporta: "Dice error de conexión en
                        general PDF, chicos." (28:06).

    Defecto registrado (DEF-03):
      Error de conexión al generar PDF en el ambiente de producción/hosteo.
      El equipo confirmó: "Eso todavía no queda entonces" / "Debe ser por el
      cambio a hosteo." El error está relacionado con la configuración del
      WebSocket de exportación en el servidor de producción.
      Prioridad: Alta — debe resolverse antes de la entrega final.
    """
    pytest.skip("Prueba de aceptación manual — FALLO registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-07  Mapa de distribución geográfica de beneficiarios
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT07",
    title_es="Mapa de distribución geográfica de beneficiarios",
    layer="e2e",
)
def test_at07_mapa_distribucion_geografica() -> None:
    """
    Escenario: El cliente visualiza el mapa interactivo de beneficiarios por
    ubicación geográfica y filtra por estado.

    Pasos ejecutados (34:12 – 35:09):
      1. En la sección Reportes, hace clic en la pestaña "Mapa" o sube al mapa.
      2. Visualiza el mapa general con puntos de beneficiarios.
      3. Filtra por estado para ver distribución específica.

    Resultado esperado: Mapa visible con distribución de beneficiarios; filtro por estado funcional.
    Resultado real:     ✅ PASS — Mapa funcional con filtro por estado.
                        Cliente: "Esta es muy buena idea." (34:58).
                        Ricardo: "Estas son estadísticas como nos mencionó David que
                        pueden ser muy útiles para mostrar a inversores o personas interesadas."
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# AT-08  Soporte de variantes de producto (calibres de sondas)
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.skip(reason="Prueba de aceptación manual — ejecutada el 2026-05-27 con cliente")
@qase_case(
    suite="[AT] Aceptación — Sesión cliente 2026-05-27",
    fj_code="FJ26SV-AT08",
    title_es="Gestión de inventario con variantes de producto (calibres)",
    layer="e2e",
)
def test_at08_variantes_calibres_sondas() -> None:
    """
    Escenario: El cliente plantea el caso de uso de recibir sondas en múltiples
    calibres (8, 10, 12, 14, 16) en distintas cantidades.

    Pasos ejecutados (23:11 – 24:11):
      1. El cliente describe el escenario: "Me llegó un pedido de sondas, pero son
         diferentes calibres: 500 del 8, 500 del 10, 500 del 12, 700 del 14, 200 del 16."
      2. El equipo explica el flujo actual: cada calibre requiere un producto separado.
      3. El equipo propone desarrollar soporte para variantes dentro de un mismo producto.

    Resultado esperado (funcionalidad solicitada):
      Un producto padre "Sonda" con variantes por calibre, cada una con su propio stock.
    Resultado real (estado actual):
      ⚠️ WORKAROUND — El cliente debe crear un producto separado por cada calibre.
      El equipo está desarrollando el soporte de variantes (calibres/tallas).

    Mejora registrada (MEJ-01):
      Soporte nativo de variantes de producto con stock independiente por calibre/talla.
      El cliente estuvo de acuerdo con el workaround temporal.

    Nota: La funcionalidad de variantes ya está parcialmente implementada en el backend
    (endpoint POST /api/almacen/productos/{id}/variantes) y en el frontend
    (botón de variante en inventario para productos MEDICAMENTO sin padre).
    """
    pytest.skip("Prueba de aceptación manual — resultado registrado en docstring")


# ─────────────────────────────────────────────────────────────────────────────
# Resumen de defectos y mejoras identificadas
# ─────────────────────────────────────────────────────────────────────────────

class _Defectos:
    """
    Defectos identificados durante la sesión de aceptación del 2026-05-27.

    DEF-01 (Media): Error 500 al guardar cobro por concurrencia de sesiones.
      Módulo: Recibos / Nuevo cobro.
      Reproducción: Dos usuarios autenticados simultáneamente intentan operar.
      Workaround: Refrescar la página y reintentar.
      Estado: A revisar — puede ser un deadlock de transacción Oracle.

    DEF-02 (Baja): Selector de fecha (doble clic en ícono de calendario) no abre
      el picker de año/mes en MacBook del cliente (macOS).
      Módulo: Beneficiarios / Nuevo beneficiario — campo Fecha de Nacimiento.
      Workaround: Escribir la fecha manualmente en el campo de texto.
      Estado: A revisar compatibilidad con Safari/Chrome en macOS.

    DEF-03 (Alta): Exportar reporte a PDF falla con error de conexión en producción.
      Módulo: Reportes / Exportar PDF (WebSocket de progreso).
      Causa probable: Configuración de WebSocket en servidor de hosting de producción.
      Estado: Pendiente de resolución antes de entrega final.
    """


class _MejorasSolicitadas:
    """
    Mejoras y funcionalidades solicitadas por el cliente durante la sesión.

    MEJ-01: Soporte nativo para variantes de producto (calibres/tallas).
      Prioridad: Media. El cliente lo mencionó explícitamente para sondas.

    MEJ-02: Agregar tabla de visitas mensuales promedio al reporte de David.
      Detalle: La tabla muestra el total de beneficiarios atendidos por mes y el
      promedio anual. Ej: enero=75, promedio=80-84 personas/mes.
      El equipo confirmó que se agregará en la entrega final.

    MEJ-03: Ajustar formato del reporte mensual al formato que maneja la asociación.
      El cliente ofrecerá su plantilla actual para que el equipo la adapte.
    """
