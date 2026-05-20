"""
Exportaciones — PDF y Excel.

Cubre:
  RF-ER-05  Reportes en formato PDF
  RF-ER-06  Reporte general de un paciente en PDF
  RF-ER-11  Exportar tablas a Excel
  RF-RB-06  Credencial de beneficiario en PDF
  RF-RB-07  Exportar lista filtrada de beneficiarios a Excel
  RF-SO-10  Comprobante de servicio / cita en PDF
  RF-PS-05  Contrato de comodato en PDF
"""
import io
import logging
from datetime import datetime, date
from pathlib import Path
from typing import Optional
from app.domain.exportaciones.ports import ExportacionesRepository
from app.domain.shared.current_user import CurrentUser
from app.domain.exportaciones.entities import FilePayload
from app.domain.exceptions import InternalError, NotFoundError, ValidationError
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.privacy.crypto import decrypt_row, PACIENTE_ENCRYPTED_FIELDS

logger = logging.getLogger(__name__)

_MSG_ERROR_INTERNO = 'Error interno del servidor'
_ORG_NAME = 'Asociación de Espina Bífida'
_COL_TOTAL_PACIENTES = 'Total Pacientes'
_COL_EDAD_PROMEDIO = 'Edad Promedio'
_COL_GENERO = 'Género'
_COL_ETAPA_VIDA = 'Etapa de Vida'
_COL_PAC_ATENDIDOS = 'Pacientes Atendidos'
_COL_METRICA = 'Métrica'

UPLOAD_DOCUMENTOS_DIR = Path(__file__).resolve().parents[3] / 'uploads' / 'documentos'
LOGO_PATH = Path(__file__).resolve().parents[3] / 'uploads' / 'logo.png'

def _strip(val):
    return val.strip() if isinstance(val, str) else val

def _date_str(val) -> str:
    if val is None:
        return ''
    if isinstance(val, datetime):
        return val.strftime('%d/%m/%Y %H:%M')
    if isinstance(val, date):
        return val.strftime('%d/%m/%Y')
    return str(val)

def _pdf_payload(buffer: io.BytesIO, filename: str) -> FilePayload:
    buffer.seek(0)
    return FilePayload(content=buffer.read(), media_type='application/pdf', filename=filename)

def _excel_payload(buffer: io.BytesIO, filename: str) -> FilePayload:
    buffer.seek(0)
    return FilePayload(content=buffer.read(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename=filename)

def _exportar_reporte_pdf(  # noqa: C901  # nosonar
    tipo: str = 'resumen',
    genero: Optional[str] = None,
    estado: Optional[str] = None,
    tipo_espina: Optional[int] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    current_user: CurrentUser | None = None,
):
    """Generar reporte estadístico en PDF (RF-ER-05)."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph,
        Spacer, Image as RLImage, HRFlowable, KeepTogether,
    )
    from app.infrastructure.reportes.repository import (
        reporte_resumen, reporte_por_genero, reporte_por_etapa_vida,
        reporte_por_estado, reporte_por_tipo_espina, reporte_servicios_por_tipo,
        reporte_estudios_por_tipo, reporte_pagos_exentos, reporte_por_ciudad,
        reporte_consolidado_mensual, indicadores_desempeno,
    )

    NAVY     = colors.HexColor('#1e3a5f')
    NAVY_LT  = colors.HexColor('#f0f4f8')
    BORDER   = colors.HexColor('#e2e8f0')
    GRAY     = colors.HexColor('#64748b')
    ROW_ALT  = colors.HexColor('#f8fafc')
    WHITE    = colors.white

    PAGE_W, _ = letter
    L_MARGIN = R_MARGIN = 0.75 * inch
    COL = PAGE_W - L_MARGIN - R_MARGIN   # ~7 inches usable

    try:
        styles = getSampleStyleSheet()
        h1 = ParagraphStyle('H1', parent=styles['Title'], fontSize=16, leading=20, spaceAfter=2)
        h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=11, textColor=NAVY,
                             spaceBefore=14, spaceAfter=4)
        note = ParagraphStyle('Note', parent=styles['Normal'], fontSize=8, textColor=GRAY)

        def _pct(v, total):
            return f'{v / total * 100:.1f}%' if total else '—'

        def _money(v):
            return f'${float(v or 0):,.2f}'

        def _data_table(rows, widths, has_totals=False):
            t = Table(rows, colWidths=widths)
            cmds = [
                ('BACKGROUND',   (0, 0),  (-1, 0),  NAVY),
                ('TEXTCOLOR',    (0, 0),  (-1, 0),  WHITE),
                ('FONTNAME',     (0, 0),  (-1, 0),  'Helvetica-Bold'),
                ('FONTSIZE',     (0, 0),  (-1, -1), 9),
                ('GRID',         (0, 0),  (-1, -1), 0.4, BORDER),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2 if has_totals else -1), [WHITE, ROW_ALT]),
                ('TOPPADDING',   (0, 0),  (-1, -1), 5),
                ('BOTTOMPADDING',(0, 0),  (-1, -1), 5),
                ('LEFTPADDING',  (0, 0),  (-1, -1), 7),
                ('RIGHTPADDING', (0, 0),  (-1, -1), 7),
            ]
            if has_totals:
                cmds += [
                    ('BACKGROUND', (0, -1), (-1, -1), NAVY_LT),
                    ('FONTNAME',   (0, -1), (-1, -1), 'Helvetica-Bold'),
                    ('LINEABOVE',  (0, -1), (-1, -1), 1, NAVY),
                ]
            t.setStyle(TableStyle(cmds))
            return t

        def _kpi_table(headers, values):
            n = len(headers)
            w = COL / n
            t = Table([headers, values], colWidths=[w] * n)
            t.setStyle(TableStyle([
                ('BACKGROUND',    (0, 0), (-1, 0),  NAVY),
                ('TEXTCOLOR',     (0, 0), (-1, 0),  WHITE),
                ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
                ('BACKGROUND',    (0, 1), (-1, 1),  NAVY_LT),
                ('FONTNAME',      (0, 1), (-1, 1),  'Helvetica-Bold'),
                ('FONTSIZE',      (0, 0), (-1, -1), 9),
                ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
                ('GRID',          (0, 0), (-1, -1), 0.5, BORDER),
                ('TOPPADDING',    (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ]))
            return t

        def _page_footer(cv, doc):
            cv.saveState()
            cv.setFont('Helvetica', 7)
            cv.setFillColor(GRAY)
            cv.drawString(L_MARGIN, 0.4 * inch,
                          'Confidencial — Asociación de Espina Bífida de Nuevo León A.B.P.')
            cv.drawRightString(PAGE_W - R_MARGIN, 0.4 * inch, f'Pág. {doc.page}')
            cv.restoreState()

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=letter,
            topMargin=0.6 * inch, bottomMargin=0.75 * inch,
            leftMargin=L_MARGIN, rightMargin=R_MARGIN,
        )
        els = []

        # ── Shared header ──────────────────────────────────────
        if LOGO_PATH.exists():
            logo = RLImage(str(LOGO_PATH), width=2.2 * inch, height=0.93 * inch)
            logo.hAlign = 'CENTER'
            els.append(logo)
            els.append(Spacer(1, 4))

        tipo_labels = {
            'resumen':             'Reporte de Resumen de Período',
            'por-genero':          'Distribución por Género',
            'por-etapa-vida':      'Distribución por Etapa de Vida',
            'por-estado':          'Distribución por Estado de Residencia',
            'por-tipo-espina':     'Distribución por Tipo de Espina Bífida',
            'consolidado-mensual': 'Reporte Consolidado Mensual',
            'indicadores':         'Indicadores de Desempeño',
        }
        els.append(Paragraph(_ORG_NAME, h1))
        els.append(Paragraph(tipo_labels.get(tipo, f'Reporte: {tipo}'), styles['Heading2']))
        periodo_str = ''
        if fecha_inicio or fecha_fin:
            periodo_str = f'Período: {fecha_inicio or "—"} al {fecha_fin or "—"}   |   '
        elif mes and anio:
            meses_n = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
            periodo_str = f'Período: {meses_n[mes]} {anio}   |   '
        els.append(Paragraph(
            f'{periodo_str}Generado: {datetime.now().strftime("%d/%m/%Y %H:%M")}', note))
        els.append(HRFlowable(width='100%', thickness=1, color=NAVY, spaceAfter=10, spaceBefore=6))

        kwargs = {"genero": genero, "estado": estado, "tipo_espina": tipo_espina,
                  "fecha_inicio": fecha_inicio, "fecha_fin": fecha_fin, "current_user": current_user}

        # ═══════════════════════════════════════════════════════
        # RESUMEN DE PERÍODO — multi-sección completo
        # ═══════════════════════════════════════════════════════
        if tipo == 'resumen':
            d_res   = reporte_resumen(**kwargs)
            d_gen   = reporte_por_genero(**kwargs)
            d_etapa = reporte_por_etapa_vida(**kwargs)
            d_esp   = reporte_por_tipo_espina(**kwargs)
            d_est_r = reporte_por_estado(**kwargs)
            d_svc   = reporte_servicios_por_tipo(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, current_user=current_user)
            d_estu  = reporte_estudios_por_tipo(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, current_user=current_user)
            d_pag   = reporte_pagos_exentos(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, current_user=current_user)
            d_ciu   = reporte_por_ciudad(current_user=current_user)

            total_p = d_res.get('total_pacientes', 0)
            activos = d_res.get('activos', 0)
            hombres = d_res.get('por_genero', {}).get('Hombre', 0)
            mujeres = d_res.get('por_genero', {}).get('Mujer', 0)
            edad_p  = d_res.get('edad_promedio', 0)
            estados_r = d_res.get('estados_representados', 0)

            # KPI
            els.append(Paragraph('Resumen Ejecutivo', h2))
            els.append(_kpi_table(
                [_COL_TOTAL_PACIENTES, 'Activos', 'Hombres', 'Mujeres', _COL_EDAD_PROMEDIO, 'Estados'],
                [str(total_p), str(activos), str(hombres), str(mujeres),
                 f'{edad_p:.1f} años', str(estados_r)],
            ))
            els.append(Spacer(1, 10))

            # Género
            if d_gen.get('labels'):
                tot = d_gen.get('total', 0)
                rows = [[_COL_GENERO, 'Pacientes', '%']]
                for l, v in zip(d_gen['labels'], d_gen['values']):
                    rows.append([l, str(v), _pct(v, tot)])
                rows.append(['Total', str(tot), '100%'])
                els.append(KeepTogether([
                    Paragraph('Distribución por Género', h2),
                    _data_table(rows, [COL * .55, COL * .22, COL * .23], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            # Etapa de vida
            if d_etapa.get('labels'):
                tot = d_etapa.get('total', 0)
                rows = [[_COL_ETAPA_VIDA, 'Pacientes', '%']]
                for l, v in zip(d_etapa['labels'], d_etapa['values']):
                    rows.append([l, str(v), _pct(v, tot)])
                rows.append(['Total', str(tot), '100%'])
                els.append(KeepTogether([
                    Paragraph('Distribución por Etapa de Vida', h2),
                    _data_table(rows, [COL * .60, COL * .20, COL * .20], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            # Tipo de espina
            if d_esp.get('labels'):
                tot = d_esp.get('total', 0)
                rows = [['Tipo de Espina Bífida', 'Pacientes', '%']]
                for l, v in zip(d_esp['labels'], d_esp['values']):
                    rows.append([l, str(v), _pct(v, tot)])
                rows.append(['Total', str(tot), '100%'])
                els.append(KeepTogether([
                    Paragraph('Distribución por Tipo de Espina Bífida', h2),
                    _data_table(rows, [COL * .60, COL * .20, COL * .20], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            # Por estado
            if d_est_r.get('labels'):
                tot = d_est_r.get('total', 0)
                labels_e = d_est_r['labels'][:20]
                values_e = d_est_r['values'][:20]
                rows = [['Estado de Residencia', 'Pacientes', '%']]
                for l, v in zip(labels_e, values_e):
                    rows.append([l, str(v), _pct(v, tot)])
                if len(d_est_r['labels']) > 20:
                    resto = tot - sum(values_e)
                    rows.append([f'Otros ({len(d_est_r["labels"]) - 20} estados)', str(resto), _pct(resto, tot)])
                rows.append(['Total', str(tot), '100%'])
                els.append(KeepTogether([
                    Paragraph('Distribución por Estado de Residencia', h2),
                    _data_table(rows, [COL * .58, COL * .21, COL * .21], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            # Servicios
            if d_svc.get('labels'):
                montos = d_svc.get('montos', [0] * len(d_svc['labels']))
                rows = [['Servicio', 'Cantidad', 'Monto']]
                for l, v, m in zip(d_svc['labels'], d_svc['values'], montos):
                    rows.append([l, str(v), _money(m)])
                rows.append(['Total', str(d_svc.get('total', 0)), _money(sum(montos))])
                els.append(KeepTogether([
                    Paragraph('Servicios Brindados en el Período', h2),
                    _data_table(rows, [COL * .55, COL * .18, COL * .27], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            # Estudios
            if d_estu.get('labels'):
                rows = [['Estudio / Servicio', 'Cantidad']]
                for l, v in zip(d_estu['labels'], d_estu['values']):
                    rows.append([l, str(v)])
                rows.append(['Total', str(d_estu.get('total', 0))])
                els.append(KeepTogether([
                    Paragraph('Estudios Realizados en el Período', h2),
                    _data_table(rows, [COL * .75, COL * .25], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            # Pagos exentos
            els.append(Paragraph('Pagos Exentos vs Cuotas de Recuperación', h2))
            pg_rows = [
                ['Concepto', 'Cantidad', 'Monto Total'],
                ['Pagos Exentos',
                 str(d_pag.get('total_exentos', 0)),
                 _money(d_pag.get('monto_exentos', 0))],
                ['Cuotas de Recuperación',
                 str(d_pag.get('total_cuotas', 0)),
                 _money(d_pag.get('monto_cuotas', 0))],
                ['Total General',
                 str(d_pag.get('total_exentos', 0) + d_pag.get('total_cuotas', 0)),
                 _money(d_pag.get('monto_total', 0))],
            ]
            els.append(_data_table(pg_rows, [COL * .55, COL * .18, COL * .27], has_totals=True))
            els.append(Spacer(1, 8))

            # Ciudades
            if d_ciu.get('labels'):
                top = 25
                ci_tot = d_ciu.get('total', 0)
                rows = [['Ciudad', 'Estado', 'Pacientes', '%']]
                for l, e, v in zip(
                    d_ciu['labels'][:top],
                    d_ciu.get('estados', [''] * top)[:top],
                    d_ciu['values'][:top],
                ):
                    rows.append([l, e, str(v), _pct(v, ci_tot)])
                if len(d_ciu['labels']) > top:
                    resto = ci_tot - sum(d_ciu['values'][:top])
                    rows.append(['Otras ciudades', '', str(resto), _pct(resto, ci_tot)])
                rows.append(['Total', '', str(ci_tot), '100%'])
                els.append(KeepTogether([
                    Paragraph(f'Distribución por Ciudad de Residencia (Top {top})', h2),
                    _data_table(rows, [COL * .34, COL * .29, COL * .19, COL * .18], has_totals=True),
                ]))

        # ═══════════════════════════════════════════════════════
        # CONSOLIDADO MENSUAL
        # ═══════════════════════════════════════════════════════
        elif tipo == 'consolidado-mensual':
            from datetime import date as _date
            _mes  = mes  or _date.today().month
            _anio = anio or _date.today().year
            d = reporte_consolidado_mensual(mes=_mes, anio=_anio, current_user=current_user)
            meses_n = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

            els.append(Paragraph(f'Período: {meses_n[_mes]} {_anio}', h2))
            els.append(_kpi_table(
                [_COL_PAC_ATENDIDOS, 'Total Servicios', 'Monto Servicios', 'Total Ventas', 'Monto Ventas'],
                [str(d.get('pacientes_atendidos', 0)),
                 str(d.get('total_servicios', 0)),
                 _money(d.get('monto_servicios', 0)),
                 str(d.get('total_ventas', 0)),
                 _money(d.get('monto_ventas', 0))],
            ))
            els.append(Spacer(1, 12))

            citas_est = d.get('citas_por_estatus', {})
            if citas_est:
                rows = [['Estatus', 'Cantidad']]
                tot_c = 0
                for k, v in citas_est.items():
                    rows.append([k, str(v)])
                    tot_c += v
                rows.append(['Total', str(tot_c)])
                els.append(KeepTogether([
                    Paragraph('Citas por Estatus', h2),
                    _data_table(rows, [COL * .65, COL * .35], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

            pg = d.get('por_genero', {})
            if pg:
                rows = [[_COL_GENERO, _COL_PAC_ATENDIDOS]]
                tot_g = 0
                for k, v in pg.items():
                    rows.append([k, str(v)])
                    tot_g += v
                rows.append(['Total', str(tot_g)])
                els.append(KeepTogether([
                    Paragraph('Pacientes Atendidos por Género', h2),
                    _data_table(rows, [COL * .65, COL * .35], has_totals=True),
                ]))

        # ═══════════════════════════════════════════════════════
        # INDICADORES DE DESEMPEÑO
        # ═══════════════════════════════════════════════════════
        elif tipo == 'indicadores':
            d = indicadores_desempeno(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, current_user=current_user)

            els.append(_kpi_table(
                ['Beneficiarios Activos', 'Nuevos en Período', 'Hombres', 'Mujeres'],
                [str(d.get('beneficiarios_activos', 0)),
                 str(d.get('nuevos_en_periodo', 0)),
                 str(d.get('hombres', 0)),
                 str(d.get('mujeres', 0))],
            ))
            els.append(Spacer(1, 10))

            municipios = d.get('municipios', [])
            if municipios:
                mun_tot = sum(m.get('value', 0) for m in municipios)
                rows = [['Municipio / Lugar', 'Beneficiarios', '%']]
                for m in municipios:
                    rows.append([m.get('label', ''), str(m.get('value', 0)), _pct(m.get('value', 0), mun_tot)])
                rows.append(['Total', str(mun_tot), '100%'])
                els.append(KeepTogether([
                    Paragraph('Beneficiarios por Municipio (Nuevo León)', h2),
                    _data_table(rows, [COL * .58, COL * .22, COL * .20], has_totals=True),
                ]))
                els.append(Spacer(1, 10))

            tablas = d.get('tablas', {})
            tabla_cfgs = [
                ('por_curp',           'Sujetos por CURP',                    ['CURP N.L.',          'CURP Foráneo'         ]),
                ('curp_nl_genero',     'CURP N.L. por Género',                ['Hombre',             'Mujer'                ]),
                ('curp_foraneo_genero','CURP Foráneo por Género',             ['Hombre',             'Mujer'                ]),
                ('residencia',         'Lugar de Residencia por Etapa',        ['Viven en N.L.',      'Viven en otros estados']),
                ('nacimiento',         'País de Nacimiento por Etapa',         ['Mexicanos',          'Nac. extranjera'      ]),
                ('etapa_vida_genero',  'Etapa de Vida por Género',             ['Hombre',             'Mujer'                ]),
            ]
            for key, titulo_t, cols in tabla_cfgs:
                t_rows = tablas.get(key, [])
                if not t_rows:
                    continue
                rows = [[_COL_ETAPA_VIDA, cols[0], cols[1], 'Total']]
                for r in t_rows:
                    rows.append([
                        r.get('etapa', ''),
                        str(r.get(cols[0], 0) or 0),
                        str(r.get(cols[1], 0) or 0),
                        str(r.get('total', 0) or 0),
                    ])
                els.append(KeepTogether([
                    Paragraph(titulo_t, h2),
                    _data_table(rows, [COL * .44, COL * .18, COL * .20, COL * .18], has_totals=True),
                ]))
                els.append(Spacer(1, 8))

        # ═══════════════════════════════════════════════════════
        # REPORTES SIMPLES: por-genero, por-etapa-vida, etc.
        # ═══════════════════════════════════════════════════════
        else:
            report_funcs = {
                'por-genero':      reporte_por_genero,
                'por-etapa-vida':  reporte_por_etapa_vida,
                'por-estado':      reporte_por_estado,
                'por-tipo-espina': reporte_por_tipo_espina,
            }
            func = report_funcs.get(tipo)
            if not func:
                raise ValidationError(f'Tipo de reporte no válido: {tipo}')
            data  = func(**kwargs)
            d_res = reporte_resumen(**kwargs)

            # Context strip
            ctx = Table(
                [['Pacientes Activos', 'Período', 'Generado'],
                 [str(d_res.get('activos', 0)),
                  f'{fecha_inicio or "—"} al {fecha_fin or "—"}',
                  datetime.now().strftime('%d/%m/%Y')]],
                colWidths=[COL / 3] * 3,
            )
            ctx.setStyle(TableStyle([
                ('BACKGROUND',    (0, 0), (-1, 0), NAVY),
                ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
                ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND',    (0, 1), (-1, 1), NAVY_LT),
                ('FONTSIZE',      (0, 0), (-1, -1), 9),
                ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
                ('GRID',          (0, 0), (-1, -1), 0.5, BORDER),
                ('TOPPADDING',    (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ]))
            els.append(ctx)
            els.append(Spacer(1, 12))

            col_names = {
                'por-genero': _COL_GENERO, 'por-etapa-vida': _COL_ETAPA_VIDA,
                'por-estado': 'Estado', 'por-tipo-espina': 'Tipo de Espina',
            }
            tot = data.get('total', 0)
            rows = [[col_names.get(tipo, 'Categoría'), 'Cantidad', '%']]
            for l, v in zip(data['labels'], data['values']):
                rows.append([l, str(v), _pct(v, tot)])
            rows.append(['Total', str(tot), '100%'])
            els.append(_data_table(rows, [COL * .60, COL * .20, COL * .20], has_totals=True))

        doc.build(els, onFirstPage=_page_footer, onLaterPages=_page_footer)

        ts = datetime.now().strftime('%Y%m%d')
        if tipo == 'consolidado-mensual':
            fname = f'consolidado_{mes or ""}_{anio or ""}_{ts}.pdf'
        elif tipo == 'indicadores':
            fname = f'indicadores_{fecha_inicio or ts}_{fecha_fin or ts}.pdf'
        else:
            fname = f'reporte_{tipo}_{fecha_inicio or ts}.pdf'
        return _pdf_payload(buf, fname)

    except (NotFoundError, ValidationError, InternalError):
        raise
    except Exception:
        logger.exception('Error al generar PDF de reporte')
        raise InternalError(_MSG_ERROR_INTERNO)

def _exportar_beneficiario_pdf(folio: str, _current_user: CurrentUser | None = None):  # nosonar
    """Generar reporte PDF de un beneficiario con sus datos y documentos (RF-ER-06)."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
            paciente = row_to_dict(cur)
            if not paciente:
                raise NotFoundError('Beneficiario no encontrado')
            paciente = decrypt_row(paciente, PACIENTE_ENCRYPTED_FIELDS)
            nombre = f'{paciente['nombre']} {paciente['apellido_paterno']} {paciente.get('apellido_materno') or ''}'.strip()
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        elements = []
        if LOGO_PATH.exists():
            logo = RLImage(str(LOGO_PATH), width=2.5*inch, height=1.05*inch)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 6))
        elements.append(Paragraph(_ORG_NAME, styles['Title']))
        elements.append(Paragraph(f'Expediente del Beneficiario — {nombre}', styles['Heading2']))
        elements.append(Paragraph(f'Folio: {folio} | Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}', styles['Normal']))
        elements.append(Spacer(1, 20))
        fields = [('Nombre', nombre), ('CURP', paciente.get('curp') or ''), (_COL_GENERO, _strip(paciente.get('genero')) or ''), ('Fecha de Nacimiento', _date_str(paciente.get('fecha_nacimiento'))), ('Tipo de Sangre', paciente.get('tipo_sangre') or ''), ('Usa Válvula', 'Sí' if _strip(paciente.get('usa_valvula')) == 'S' else 'No'), ('Dirección', paciente.get('direccion') or ''), ('Colonia', paciente.get('colonia') or ''), ('Ciudad', paciente.get('ciudad') or ''), ('Estado', paciente.get('estado') or ''), ('C.P.', paciente.get('codigo_postal') or ''), ('Teléfono Casa', paciente.get('telefono_casa') or ''), ('Teléfono Celular', paciente.get('telefono_celular') or ''), ('Correo', paciente.get('correo_electronico') or ''), ('Contacto Emergencia', paciente.get('en_emergencia_avisar_a') or ''), ('Tel. Emergencia', paciente.get('telefono_emergencia') or ''), ('Membresía', _strip(paciente.get('membresia_estatus')) or ''), ('Tipo Cuota', _strip(paciente.get('tipo_cuota')) or ''), ('Fecha Alta', _date_str(paciente.get('fecha_alta')))]
        table_data = [['Campo', 'Valor']]
        for label, val in fields:
            table_data.append([label, str(val)])
        t = Table(table_data, colWidths=[180, 300])
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 9), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4f8')]), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
        elements.append(t)
        doc.build(elements)
        return _pdf_payload(buf, f'expediente_{folio}_{datetime.now().strftime('%Y%m%d')}.pdf')
    except (NotFoundError, ValidationError, InternalError):
        raise
    except Exception:
        logger.exception('Error al generar PDF del beneficiario')
        raise InternalError(_MSG_ERROR_INTERNO)

def _exportar_credencial_pdf(folio: str, _current_user: CurrentUser | None = None):  # nosonar
    """Generar credencial del beneficiario en PDF (RF-RB-06)."""
    from reportlab.lib.pagesizes import landscape, A6
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas as pdf_canvas
    NAVY   = colors.HexColor('#00328b')
    NAVY_L = colors.HexColor('#e8eef8')
    GRAY   = colors.HexColor('#64748b')
    LGRAY  = colors.HexColor('#f1f5f9')
    BLACK  = colors.HexColor('#1e293b')
    WHITE  = colors.white
    def _lbl(cv, x, y, txt):
        cv.setFillColor(NAVY); cv.setFont('Helvetica-Bold', 6.5)
        cv.drawString(x, y, txt.upper())
    def _val(cv, x, y, txt, bold=False, size=8):
        cv.setFillColor(BLACK)
        cv.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
        cv.drawString(x, y, str(txt) if txt else '-')
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
            paciente = row_to_dict(cur)
            if not paciente:
                raise NotFoundError('Beneficiario no encontrado')
            paciente = decrypt_row(paciente, PACIENTE_ENCRYPTED_FIELDS)
            cur.execute(
                'SELECT te.NOMBRE FROM PACIENTE_TIPO_ESPINA pte '
                'JOIN TIPO_ESPINA_BIFIDA te ON te.ID_TIPO_ESPINA = pte.ID_TIPO_ESPINA '
                'WHERE pte.ID_PACIENTE = :id', {'id': paciente['id_paciente']}
            )
            tipos = [r[0].strip() for r in cur.fetchall()]
            cur.execute(
                'SELECT dp.ID_DOCUMENTO, dp.RUTA_ARCHIVO, dp.FORMATO_ARCHIVO, dp.FECHA_CARGA, '
                '       td.NOMBRE AS TIPO_NOMBRE '
                'FROM DOCUMENTO_PACIENTE dp '
                'LEFT JOIN TIPO_DOCUMENTO td ON td.ID_TIPO_DOCUMENTO = dp.ID_TIPO_DOCUMENTO '
                "WHERE dp.ID_PACIENTE = :id AND dp.ACTIVO = 'S'",
                {'id': paciente['id_paciente']}
            )
            documentos = rows_to_dicts(cur)

        foto_path = None
        imagenes = [
            d for d in documentos
            if str(d.get('formato_archivo') or '').strip().upper() in {'JPG', 'JPEG', 'PNG', 'WEBP'}
        ]
        if imagenes:
            fotos_por_tipo = [
                d for d in imagenes
                if any(
                    marker in str(d.get('tipo_nombre') or '').lower()
                    for marker in ('foto', 'fotografia', 'imagen')
                )
            ]
            candidatas = fotos_por_tipo or imagenes
            candidatas.sort(key=lambda d: d.get('fecha_carga') or datetime.min, reverse=True)
            ruta = str(candidatas[0].get('ruta_archivo') or '').strip()
            if ruta:
                ruta_local = (UPLOAD_DOCUMENTOS_DIR / Path(ruta).name).resolve()
                if ruta_local.exists() and ruta_local.is_file():
                    foto_path = ruta_local

        def _sv(k): return _strip(paciente.get(k)) or ''
        nombre_completo = f"{_sv('nombre')} {_sv('apellido_paterno')} {_sv('apellido_materno')}".strip()
        direccion = f"{_sv('direccion')}, {_sv('colonia')}"
        ciudad_est = f"{_sv('ciudad')}{', ' + _sv('estado') if _sv('estado') else ''}"
        fecha_nac = (_sv('fecha_nacimiento') or '')[:10]
        fecha_exp = (_sv('fecha_alta') or '')[:10]
        valvula = 'Si' if (_sv('usa_valvula') or 'N').upper() == 'S' else 'No'
        padecimiento = ', '.join(tipos) if tipos else 'No especificado'
        # Card size: A6 landscape (148 x 105 mm)
        W, H = landscape(A6)
        buf = io.BytesIO()
        cv = pdf_canvas.Canvas(buf, pagesize=(W, H))
        # Background
        cv.setFillColor(WHITE); cv.rect(0, 0, W, H, fill=1, stroke=0)
        # Header bar
        hdr_h = 1.6 * cm
        cv.setFillColor(NAVY); cv.rect(0, H - hdr_h, W, hdr_h, fill=1, stroke=0)
        logo_w_hdr = 1.4 * cm
        logo_h_hdr = 1.4 * cm
        if LOGO_PATH.exists():
            try:
                cv.drawImage(str(LOGO_PATH), 0.2 * cm, H - hdr_h + 0.1 * cm, logo_w_hdr, logo_h_hdr, preserveAspectRatio=True, anchor='c', mask='auto')
            except Exception:
                pass
        txt_x = logo_w_hdr + 0.45 * cm
        cv.setFillColor(WHITE); cv.setFont('Helvetica-Bold', 9)
        cv.drawString(txt_x, H - 1.05 * cm, 'ESPINA BIFIDA - Asociacion de Nuevo Leon ABP')
        cv.setFont('Helvetica', 7)
        cv.drawString(txt_x, H - 1.4 * cm, 'CREDENCIAL DE BENEFICIARIO')
        cv.setFont('Helvetica-Bold', 9)
        cv.drawRightString(W - 0.5 * cm, H - 1.05 * cm, f'Folio: {folio}')
        cv.setFont('Helvetica', 7)
        cv.drawRightString(W - 0.5 * cm, H - 1.4 * cm, f'Membresia No.: {_sv("id_paciente") or "N/A"}')
        # Photo box (left column)
        photo_x, photo_y = 0.4 * cm, H - hdr_h - 3.9 * cm
        photo_w, photo_h = 2.8 * cm, 3.5 * cm
        cv.setFillColor(LGRAY); cv.setStrokeColor(colors.HexColor('#cbd5e1'))
        cv.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=1)
        if foto_path:
            try:
                cv.drawImage(
                    str(foto_path),
                    photo_x + 0.05 * cm,
                    photo_y + 0.05 * cm,
                    photo_w - 0.10 * cm,
                    photo_h - 0.10 * cm,
                    preserveAspectRatio=True,
                    anchor='c',
                    mask='auto',
                )
            except Exception:
                logger.warning('No se pudo renderizar la foto del beneficiario en credencial', exc_info=True)
                cv.setFillColor(GRAY); cv.setFont('Helvetica', 6)
                cv.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2 + 0.3 * cm, 'FOTOGRAFIA')
                cv.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2 - 0.1 * cm, 'DEL PORTADOR')
        else:
            cv.setFillColor(GRAY); cv.setFont('Helvetica', 6)
            cv.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2 + 0.3 * cm, 'FOTOGRAFIA')
            cv.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2 - 0.1 * cm, 'DEL PORTADOR')
        # Left column content (below photo)
        lx = 0.4 * cm
        ly = photo_y - 0.65 * cm
        _lbl(cv, lx, ly, 'Nombre Completo'); ly -= 0.35 * cm
        _val(cv, lx, ly, nombre_completo[:42], bold=True, size=7); ly -= 0.5 * cm
        _lbl(cv, lx, ly, 'Direccion'); ly -= 0.32 * cm
        _val(cv, lx, ly, direccion[:38], size=7); ly -= 0.28 * cm
        _val(cv, lx, ly, ciudad_est[:38], size=7); ly -= 0.45 * cm
        _lbl(cv, lx, ly, 'Tel. Casa'); ly -= 0.32 * cm
        _val(cv, lx, ly, _sv('telefono_casa') or '-', size=7); ly -= 0.45 * cm
        _lbl(cv, lx, ly, 'Nombre de Padre / Madre'); ly -= 0.32 * cm
        _val(cv, lx, ly, (_sv('nombre_padre_madre') or '-')[:35], size=7); ly -= 0.45 * cm
        _lbl(cv, lx, ly, 'Fecha de Expedicion'); ly -= 0.32 * cm
        _val(cv, lx, ly, fecha_exp or '-', size=7)
        # Vertical divider
        mid_x = 3.6 * cm
        cv.setStrokeColor(colors.HexColor('#e2e8f0'))
        cv.line(mid_x, 0.55 * cm, mid_x, H - hdr_h - 0.2 * cm)
        # Right column
        rx = mid_x + 0.4 * cm
        ry = H - hdr_h - 0.55 * cm
        _lbl(cv, rx, ry, 'Padecimiento'); ry -= 0.32 * cm
        _val(cv, rx, ry, padecimiento[:55], bold=True, size=7); ry -= 0.5 * cm
        col2 = rx + 3.5 * cm
        _lbl(cv, rx, ry, 'Tipo de Sangre'); _lbl(cv, col2, ry, 'Tiene Valvula')
        ry -= 0.32 * cm
        _val(cv, rx, ry, _sv('tipo_sangre') or '-', bold=True, size=9)
        _val(cv, col2, ry, valvula, bold=True, size=8); ry -= 0.55 * cm
        _lbl(cv, rx, ry, 'En caso de accidente avisar a'); ry -= 0.32 * cm
        _val(cv, rx, ry, (_sv('en_emergencia_avisar_a') or '-')[:42], size=7); ry -= 0.42 * cm
        _lbl(cv, rx, ry, 'Telefono de Emergencia'); ry -= 0.32 * cm
        _val(cv, rx, ry, _sv('telefono_emergencia') or '-', size=7); ry -= 0.42 * cm
        _lbl(cv, rx, ry, 'Correo Electronico'); ry -= 0.32 * cm
        _val(cv, rx, ry, (_sv('correo_electronico') or '-')[:45], size=7); ry -= 0.52 * cm
        # Horizontal divider
        cv.setStrokeColor(colors.HexColor('#e2e8f0'))
        cv.line(rx, ry + 0.15 * cm, W - 0.4 * cm, ry + 0.15 * cm)
        ry -= 0.25 * cm
        # Birth data 3 sub-cols
        c3a = rx; c3b = rx + 2.2 * cm; c3c = rx + 4.6 * cm
        _lbl(cv, c3a, ry, 'Datos de Nacimiento'); ry -= 0.32 * cm
        _lbl(cv, c3a, ry, 'Fecha'); _lbl(cv, c3b, ry, 'Lugar Nac.'); _lbl(cv, c3c, ry, 'Hospital')
        ry -= 0.32 * cm
        _val(cv, c3a, ry, fecha_nac or '-', size=7)
        _val(cv, c3b, ry, (_sv('estado_nacimiento') or '-')[:16], size=7)
        _val(cv, c3c, ry, (_sv('hospital_nacimiento') or '-')[:18], size=7)
        ry -= 0.5 * cm
        # Association box
        box_w = W - rx - 0.4 * cm
        box_h = 0.9 * cm
        cv.setFillColor(NAVY_L); cv.setStrokeColor(NAVY)
        cv.roundRect(rx, ry - box_h + 0.25 * cm, box_w, box_h, 0.15 * cm, fill=1, stroke=1)
        cx_box = rx + box_w / 2
        cv.setFillColor(NAVY); cv.setFont('Helvetica-Bold', 6.5)
        cv.drawCentredString(cx_box, ry - 0.08 * cm, 'ASOCIACION DE ESPINA BIFIDA DE NUEVO LEON ABP')
        cv.setFont('Helvetica', 6)
        cv.drawCentredString(cx_box, ry - 0.42 * cm, 'www.espinabifida.org.mx')
        # Bottom footer
        cv.setFillColor(LGRAY); cv.rect(0, 0, W, 0.55 * cm, fill=1, stroke=0)
        cv.setFillColor(GRAY); cv.setFont('Helvetica', 6)
        cuota = _sv('tipo_cuota') or 'No asignada'
        vencimiento = (_sv('fecha_vencimiento_membresia') or '')[:10] or 'Indefinida'
        cv.drawString(0.4 * cm, 0.2 * cm, f'Cuota: {cuota}')
        cv.drawCentredString(W / 2, 0.2 * cm, f'Vigencia: {vencimiento}')
        cv.drawRightString(W - 0.4 * cm, 0.2 * cm, f'CURP: {_sv("curp") or "N/A"}')
        cv.save()
        return _pdf_payload(buf, f'credencial_{folio}.pdf')
    except (NotFoundError, ValidationError, InternalError):
        raise
    except Exception:
        logger.exception('Error al generar credencial PDF')
        raise InternalError(_MSG_ERROR_INTERNO)


def _exportar_comprobante_cita(id_cita: int, _current_user: CurrentUser | None = None):
    """Generar comprobante PDF de una cita con sus servicios (RF-SO-10)."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT c.ID_CITA, c.FECHA_HORA, c.ESTATUS, c.NOTAS,\n                          p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '') AS nombre_paciente,\n                          p.FOLIO AS folio_paciente\n                   FROM CITA c\n                   JOIN PACIENTE p ON p.ID_PACIENTE = c.ID_PACIENTE\n                   WHERE c.ID_CITA = :id_cita", {'id_cita': id_cita})
            cita = row_to_dict(cur)
            if not cita:
                raise NotFoundError('Cita no encontrada')
            cur.execute('SELECT s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO, d.CANCELADO\n                   FROM DETALLE_CITA_SERVICIO d\n                   JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO\n                   WHERE d.ID_CITA = :id_cita', {'id_cita': id_cita})
            servicios = rows_to_dicts(cur)
            cur.execute(
                'SELECT DISTINCT dr.NOMBRE || \' \' || dr.APELLIDO_PATERNO AS nombre_doctor,'
                ' dr.ESPECIALIDAD'
                ' FROM DETALLE_CITA_SERVICIO d'
                ' JOIN DOCTOR dr ON dr.ID_DOCTOR = d.ID_DOCTOR'
                ' WHERE d.ID_CITA = :id_cita AND d.ID_DOCTOR IS NOT NULL',
                {'id_cita': id_cita}
            )
            doctores = rows_to_dicts(cur)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        elements = []
        if LOGO_PATH.exists():
            logo = RLImage(str(LOGO_PATH), width=2.5*inch, height=1.05*inch)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 6))
        elements.append(Paragraph(_ORG_NAME, styles['Title']))
        elements.append(Paragraph('Comprobante de Servicio', styles['Heading2']))
        elements.append(Spacer(1, 10))
        info_data = [['Paciente', cita['nombre_paciente']], ['Folio Paciente', cita['folio_paciente']], ['Fecha', _date_str(cita['fecha_hora'])], ['Estatus', _strip(cita['estatus'])], ['Notas', cita.get('notas') or '']]
        if doctores:
            for doc_row in doctores:
                info_data.append(['Doctor', f'{doc_row['nombre_doctor']} — {_strip(doc_row.get('especialidad') or '')}'])
        t_info = Table(info_data, colWidths=[120, 360])
        t_info.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 10), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
        elements.append(t_info)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph('Servicios', styles['Heading3']))
        svc_data = [['Servicio', 'Cantidad', 'Monto', 'Cancelado']]
        total_monto = 0.0
        for s in servicios:
            monto = float(s.get('monto_pagado') or 0)
            total_monto += monto
            svc_data.append([_strip(s['nombre']), str(s.get('cantidad', 1)), f'${monto:,.2f}', 'Sí' if _strip(s.get('cancelado')) == 'S' else 'No'])
        svc_data.append(['', '', f'Total: ${total_monto:,.2f}', ''])
        t_svc = Table(svc_data, colWidths=[200, 80, 100, 100])
        t_svc.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 9), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('ALIGN', (1, 0), (-1, -1), 'CENTER'), ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
        elements.append(t_svc)
        doc.build(elements)
        return _pdf_payload(buf, f'comprobante_cita_{id_cita}.pdf')
    except (NotFoundError, ValidationError, InternalError):
        raise
    except Exception:
        logger.exception('Error al generar comprobante PDF')
        raise InternalError(_MSG_ERROR_INTERNO)

def _exportar_contrato_comodato(id_comodato: int, _current_user: CurrentUser | None = None):
    """Generar contrato de comodato en PDF (RF-PS-05)."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT c.*, p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '') AS nombre_paciente,\n                          p.FOLIO AS folio_paciente, pr.NOMBRE AS nombre_equipo,\n                          eq.NUMERO_SERIE, eq.MARCA, eq.MODELO\n                   FROM COMODATO c\n                   JOIN PACIENTE p ON p.ID_PACIENTE = c.ID_PACIENTE\n                   JOIN PRODUCTO pr ON pr.ID_PRODUCTO = c.ID_EQUIPO\n                   LEFT JOIN EQUIPO_MEDICO eq ON eq.ID_PRODUCTO = c.ID_EQUIPO\n                   WHERE c.ID_COMODATO = :id", {'id': id_comodato})
            com = row_to_dict(cur)
            if not com:
                raise NotFoundError('Comodato no encontrado')
            cur.execute('SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': com['id_paciente']})
            paciente = row_to_dict(cur)
            paciente = decrypt_row(paciente, PACIENTE_ENCRYPTED_FIELDS)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=50, bottomMargin=50)
        styles = getSampleStyleSheet()
        elements = []
        if LOGO_PATH.exists():
            logo = RLImage(str(LOGO_PATH), width=2.5*inch, height=1.05*inch)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 6))
        elements.append(Paragraph(_ORG_NAME, styles['Title']))
        elements.append(Paragraph('CONTRATO DE COMODATO', styles['Heading2']))
        elements.append(Spacer(1, 15))
        folio_com = _strip(com.get('folio_comodato')) or str(id_comodato)
        elements.append(Paragraph(f'<b>Folio:</b> {folio_com}', styles['Normal']))
        elements.append(Paragraph(f'<b>Fecha:</b> {_date_str(com.get('fecha_prestamo'))}', styles['Normal']))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph('<b>DATOS DEL BENEFICIARIO</b>', styles['Heading3']))
        ben_data = [['Nombre', com['nombre_paciente']], ['Folio', com['folio_paciente']], ['Dirección', paciente.get('direccion') or ''], ['Teléfono', paciente.get('telefono_celular') or paciente.get('telefono_casa') or '']]
        t_ben = Table(ben_data, colWidths=[120, 360])
        t_ben.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 10), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
        elements.append(t_ben)
        elements.append(Spacer(1, 10))
        elements.append(Paragraph('<b>EQUIPO EN PRÉSTAMO</b>', styles['Heading3']))
        eq_data = [['Equipo', _strip(com.get('nombre_equipo')) or ''], ['Número de Serie', _strip(com.get('numero_serie')) or 'N/A'], ['Marca', _strip(com.get('marca')) or 'N/A'], ['Modelo', _strip(com.get('modelo')) or 'N/A']]
        t_eq = Table(eq_data, colWidths=[120, 360])
        t_eq.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 10), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
        elements.append(t_eq)
        elements.append(Spacer(1, 10))
        elements.append(Paragraph('<b>CONDICIONES ECONÓMICAS</b>', styles['Heading3']))
        monto_total = float(com.get('monto_total') or 0)
        monto_pagado = float(com.get('monto_pagado') or 0)
        saldo = float(com.get('saldo_pendiente') or 0)
        exento = _strip(com.get('exento_pago'))
        fin_data = [['Monto Total', f'${monto_total:,.2f}'], ['Monto Pagado', f'${monto_pagado:,.2f}'], ['Saldo Pendiente', f'${saldo:,.2f}'], ['Exento de Pago', 'Sí' if exento == 'S' else 'No']]
        t_fin = Table(fin_data, colWidths=[120, 360])
        t_fin.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 10), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
        elements.append(t_fin)
        elements.append(Spacer(1, 30))
        elements.append(Paragraph('_________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_________________________', styles['Normal']))
        elements.append(Paragraph('Firma del Beneficiario&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Firma del Responsable', styles['Normal']))
        doc.build(elements)
        return _pdf_payload(buf, f'contrato_comodato_{folio_com}.pdf')
    except (NotFoundError, ValidationError, InternalError):
        raise
    except Exception:
        logger.exception('Error al generar contrato de comodato PDF')
        raise InternalError(_MSG_ERROR_INTERNO)

def _exportar_beneficiarios_excel(genero: Optional[str]=None, estado: Optional[str]=None, membresia_estatus: Optional[str]=None, busqueda: Optional[str]=None, _current_user: CurrentUser | None = None):
    """Exportar lista filtrada de beneficiarios a Excel (RF-RB-07)."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    try:
        with get_db() as conn:
            cur = conn.cursor()
            conditions = ["p.ACTIVO = 'S'", "p.ESTATUS_REGISTRO = 'APROBADO'"]
            params: dict = {}
            if genero:
                conditions.append('p.GENERO = :genero')
                params['genero'] = genero
            if estado:
                conditions.append('p.ESTADO = :estado')
                params['estado'] = estado
            if membresia_estatus:
                conditions.append('p.MEMBRESIA_ESTATUS = :membresia_estatus')
                params['membresia_estatus'] = membresia_estatus
            if busqueda:
                conditions.append('(LOWER(p.NOMBRE) LIKE :busqueda OR LOWER(p.APELLIDO_PATERNO) LIKE :busqueda OR LOWER(p.FOLIO) LIKE :busqueda)')
                params['busqueda'] = f'%{busqueda.lower()}%'
            where = ' AND '.join(conditions)
            cur.execute(f'SELECT p.FOLIO, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,\n                           p.GENERO, p.FECHA_NACIMIENTO, p.ESTADO, p.CIUDAD,\n                           p.MEMBRESIA_ESTATUS, p.TIPO_CUOTA, p.FECHA_ALTA\n                    FROM PACIENTE p WHERE {where}\n                    ORDER BY p.ID_PACIENTE', params)
            rows = rows_to_dicts(cur)
        wb = Workbook()
        ws = wb.active
        ws.title = 'Beneficiarios'
        headers = ['Folio', 'Nombre', 'Apellido Paterno', 'Apellido Materno', _COL_GENERO, 'Fecha Nacimiento', 'Estado', 'Ciudad', 'Membresía', 'Tipo Cuota', 'Fecha Alta']
        header_fill = PatternFill(start_color='1e3a5f', end_color='1e3a5f', fill_type='solid')
        header_font = Font(color='FFFFFF', bold=True, size=11)
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        for row_idx, row in enumerate(rows, 2):
            ws.cell(row=row_idx, column=1, value=_strip(row.get('folio')))
            ws.cell(row=row_idx, column=2, value=_strip(row.get('nombre')))
            ws.cell(row=row_idx, column=3, value=_strip(row.get('apellido_paterno')))
            ws.cell(row=row_idx, column=4, value=_strip(row.get('apellido_materno')))
            ws.cell(row=row_idx, column=5, value=_strip(row.get('genero')))
            ws.cell(row=row_idx, column=6, value=_date_str(row.get('fecha_nacimiento')))
            ws.cell(row=row_idx, column=7, value=_strip(row.get('estado')))
            ws.cell(row=row_idx, column=8, value=_strip(row.get('ciudad')))
            ws.cell(row=row_idx, column=9, value=_strip(row.get('membresia_estatus')))
            ws.cell(row=row_idx, column=10, value=_strip(row.get('tipo_cuota')))
            ws.cell(row=row_idx, column=11, value=_date_str(row.get('fecha_alta')))
        for col in ws.columns:
            max_len = max((len(str(cell.value or '')) for cell in col))
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 3, 40)
        buf = io.BytesIO()
        wb.save(buf)
        return _excel_payload(buf, f'beneficiarios_{datetime.now().strftime('%Y%m%d')}.xlsx')
    except Exception:
        logger.exception('Error al generar Excel de beneficiarios')
        raise InternalError(_MSG_ERROR_INTERNO)

def _exportar_reporte_excel(tipo: str='resumen', fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, mes: Optional[int]=None, anio: Optional[int]=None, current_user: CurrentUser | None = None):  # nosonar
    """Exportar datos de reportes a Excel (RF-ER-11)."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from app.infrastructure.reportes.repository import (reporte_resumen, reporte_por_genero, reporte_por_etapa_vida,
        reporte_por_estado, reporte_por_tipo_espina, reporte_servicios_por_tipo, reporte_pagos_exentos, reporte_consolidado_mensual)
    try:
        wb = Workbook()
        ws = wb.active
        header_fill = PatternFill(start_color='1e3a5f', end_color='1e3a5f', fill_type='solid')
        header_font = Font(color='FFFFFF', bold=True, size=11)

        def write_headers(sheet, headers):
            for ci, h in enumerate(headers, 1):
                cell = sheet.cell(row=1, column=ci, value=h)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal='center')
        common_kwargs = {'current_user': current_user}
        if tipo == 'all':
            # Multi-sheet workbook: one sheet per report type
            wb.remove(ws)
            base_kw = {'genero': None, 'estado': None, 'tipo_espina': None,
                       'fecha_inicio': fecha_inicio, 'fecha_fin': fecha_fin, **common_kwargs}
            # Sheet 1: Resumen
            ws1 = wb.create_sheet('Resumen')
            d = reporte_resumen(**base_kw)
            write_headers(ws1, [_COL_METRICA, 'Valor'])
            items = [(_COL_TOTAL_PACIENTES, d['total_pacientes']), ('Activos', d['activos']),
                     ('Inactivos', d['inactivos']), (_COL_EDAD_PROMEDIO, d['edad_promedio']),
                     ('Estados Representados', d['estados_representados'])]
            for k, v in d.get('por_genero', {}).items(): items.append((f'Género: {k}', v))
            for k, v in d.get('por_tipo_espina', {}).items(): items.append((f'Tipo Espina: {k}', v))
            for i, (lb, vl) in enumerate(items, 2):
                ws1.cell(row=i, column=1, value=lb); ws1.cell(row=i, column=2, value=vl)
            # Sheet 2: Por Género
            ws2 = wb.create_sheet('Por Género')
            d2 = reporte_por_genero(**base_kw)
            write_headers(ws2, [_COL_GENERO, 'Cantidad'])
            for i, (lb, vl) in enumerate(zip(d2['labels'], d2['values']), 2):
                ws2.cell(row=i, column=1, value=lb); ws2.cell(row=i, column=2, value=vl)
            # Sheet 3: Por Etapa de Vida
            ws3 = wb.create_sheet('Por Etapa de Vida')
            d3 = reporte_por_etapa_vida(**base_kw)
            write_headers(ws3, [_COL_ETAPA_VIDA, 'Cantidad'])
            for i, (lb, vl) in enumerate(zip(d3['labels'], d3['values']), 2):
                ws3.cell(row=i, column=1, value=lb); ws3.cell(row=i, column=2, value=vl)
            # Sheet 4: Por Estado
            ws4 = wb.create_sheet('Por Estado')
            d4 = reporte_por_estado(**base_kw)
            write_headers(ws4, ['Estado', 'Cantidad'])
            for i, (lb, vl) in enumerate(zip(d4['labels'], d4['values']), 2):
                ws4.cell(row=i, column=1, value=lb); ws4.cell(row=i, column=2, value=vl)
            # Sheet 5: Por Tipo de Espina
            ws5 = wb.create_sheet('Por Tipo de Espina')
            d5 = reporte_por_tipo_espina(**base_kw)
            write_headers(ws5, ['Tipo de Espina', 'Cantidad'])
            for i, (lb, vl) in enumerate(zip(d5['labels'], d5['values']), 2):
                ws5.cell(row=i, column=1, value=lb); ws5.cell(row=i, column=2, value=vl)
            # Sheet 6: Servicios por Tipo
            ws6 = wb.create_sheet('Servicios por Tipo')
            d6 = reporte_servicios_por_tipo(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, **common_kwargs)
            write_headers(ws6, ['Servicio', 'Cantidad', 'Monto'])
            for i, (lb, vl) in enumerate(zip(d6['labels'], d6['values']), 2):
                ws6.cell(row=i, column=1, value=lb); ws6.cell(row=i, column=2, value=vl)
                ws6.cell(row=i, column=3, value=d6['montos'][i - 2])
            # Sheet 7: Pagos Exentos
            ws7 = wb.create_sheet('Pagos Exentos')
            d7 = reporte_pagos_exentos(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, **common_kwargs)
            write_headers(ws7, ['Concepto', 'Cantidad', 'Monto'])
            ws7.cell(row=2, column=1, value='Exentos')
            ws7.cell(row=2, column=2, value=d7['total_exentos'])
            ws7.cell(row=2, column=3, value=d7['monto_exentos'])
            ws7.cell(row=3, column=1, value='Cuotas')
            ws7.cell(row=3, column=2, value=d7['total_cuotas'])
            ws7.cell(row=3, column=3, value=d7['monto_cuotas'])
        elif tipo == 'servicios-por-tipo':
            ws.title = 'Servicios por Tipo'
            data = reporte_servicios_por_tipo(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, **common_kwargs)
            write_headers(ws, ['Servicio', 'Cantidad', 'Monto'])
            for i, (label, val) in enumerate(zip(data['labels'], data['values']), 2):
                ws.cell(row=i, column=1, value=label)
                ws.cell(row=i, column=2, value=val)
                ws.cell(row=i, column=3, value=data['montos'][i - 2])
        elif tipo == 'pagos-exentos':
            ws.title = 'Pagos Exentos vs Cuotas'
            data = reporte_pagos_exentos(fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, **common_kwargs)
            write_headers(ws, ['Concepto', 'Cantidad', 'Monto'])
            ws.cell(row=2, column=1, value='Exentos')
            ws.cell(row=2, column=2, value=data['total_exentos'])
            ws.cell(row=2, column=3, value=data['monto_exentos'])
            ws.cell(row=3, column=1, value='Cuotas')
            ws.cell(row=3, column=2, value=data['total_cuotas'])
            ws.cell(row=3, column=3, value=data['monto_cuotas'])
        elif tipo == 'consolidado-mensual':
            ws.title = 'Consolidado Mensual'
            data = reporte_consolidado_mensual(mes=mes, anio=anio, **common_kwargs)
            write_headers(ws, [_COL_METRICA, 'Valor'])
            metrics = [('Mes/Año', f'{data['mes']}/{data['anio']}'), (_COL_PAC_ATENDIDOS, data['pacientes_atendidos']), ('Total Servicios', data['total_servicios']), ('Monto Servicios', data['monto_servicios']), ('Total Ventas', data['total_ventas']), ('Monto Ventas', data['monto_ventas'])]
            for k, v in data.get('citas_por_estatus', {}).items():
                metrics.append((f'Citas {k}', v))
            for k, v in data.get('por_genero', {}).items():
                metrics.append((f'Género {k}', v))
            for i, (label, val) in enumerate(metrics, 2):
                ws.cell(row=i, column=1, value=label)
                ws.cell(row=i, column=2, value=val)
        else:
            ws.title = 'Resumen'
            data = reporte_resumen(genero=None, estado=None, tipo_espina=None, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, **common_kwargs)
            write_headers(ws, [_COL_METRICA, 'Valor'])
            metrics = [(_COL_TOTAL_PACIENTES, data['total_pacientes']), ('Activos', data['activos']), ('Inactivos', data['inactivos']), (_COL_EDAD_PROMEDIO, data['edad_promedio']), ('Estados Representados', data['estados_representados'])]
            for k, v in data.get('por_genero', {}).items():
                metrics.append((f'Género: {k}', v))
            for i, (label, val) in enumerate(metrics, 2):
                ws.cell(row=i, column=1, value=label)
                ws.cell(row=i, column=2, value=val)
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = max((len(str(cell.value or '')) for cell in col))
                sheet.column_dimensions[col[0].column_letter].width = min(max_len + 3, 40)
        buf = io.BytesIO()
        wb.save(buf)
        filename = f'reportes_completo_{datetime.now().strftime("%Y%m%d")}.xlsx' if tipo == 'all' else f'reporte_{tipo}_{datetime.now().strftime("%Y%m%d")}.xlsx'
        return _excel_payload(buf, filename)
    except Exception:
        logger.exception('Error al generar Excel de reportes')
        raise InternalError(_MSG_ERROR_INTERNO)


class OracleExportacionesRepository(ExportacionesRepository):
    def exportar_reporte_pdf(self, tipo='resumen', genero=None, estado=None, tipo_espina=None, fecha_inicio=None, fecha_fin=None, mes=None, anio=None, current_user=None):
        return _exportar_reporte_pdf(tipo, genero, estado, tipo_espina, fecha_inicio, fecha_fin, mes, anio, current_user)

    def exportar_beneficiario_pdf(self, folio, current_user=None):
        return _exportar_beneficiario_pdf(folio, current_user)

    def exportar_credencial_pdf(self, folio, current_user=None):
        return _exportar_credencial_pdf(folio, current_user)

    def exportar_comprobante_cita(self, id_cita, current_user=None):
        return _exportar_comprobante_cita(id_cita, current_user)

    def exportar_contrato_comodato(self, id_comodato, current_user=None):
        return _exportar_contrato_comodato(id_comodato, current_user)

    def exportar_beneficiarios_excel(self, genero=None, estado=None, membresia_estatus=None, busqueda=None, current_user=None):
        return _exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user)

    def exportar_reporte_excel(self, tipo='resumen', fecha_inicio=None, fecha_fin=None, mes=None, anio=None, current_user=None):
        return _exportar_reporte_excel(tipo, fecha_inicio, fecha_fin, mes, anio, current_user)
