# Migraciones de Base de Datos — Sistema EBIF

Scripts SQL para Oracle Autonomous Database. Se aplican en orden estrictamente secuencial sobre el esquema de producción.

---

## Migraciones disponibles

| Archivo | Descripción |
|---|---|
| `001_pre_sp_schema_changes.sql` | Schema inicial: tablas base y constraints |
| `002_triggers.sql` | Triggers de auditoría y auto-generación de folios |
| `003_sp_almacen.sql` | Stored procedures de almacén e inventario |
| `004_sp_ventas.sql` | Stored procedures de ventas y recibos |
| `005_sp_pacientes_citas.sql` | SPs de beneficiarios y agenda médica |
| `006_sp_doctores_usuarios.sql` | SPs de médicos y administración de usuarios |
| `007_bitacora_tipo_login.sql` | Columna tipo_login en bitácora |
| `008_venta_folio_vta.sql` | Folio único por venta (secuencia VTA-XXXXXX) |
| `009_movimiento_tipo_check.sql` | Check constraint en tipo de movimiento de inventario |
| `010_sync_seq_venta_folio.sql` | Sincronización de secuencia de folios con datos existentes |
| `011_comodato_estatus_donado.sql` | Estado DONADO en comodatos |
| `012_metodo_pago_pendiente.sql` | Método de pago PENDIENTE |
| `013_membresia_anual.sql` | Membresías anuales con fecha de expiración |
| `014_sp_movimiento_comodato_types.sql` | Tipos de movimiento en comodatos |
| `015_venta_linea.sql` | Tabla VENTA_LINEA para ítems de recibo |
| `016_disponibilidad_especial.sql` | Disponibilidad especial de médicos (días festivos, vacaciones) |
| `017_cita_estatus_en_curso.sql` | Estado EN_CURSO en citas médicas |
| `018_seed_data.sql` | Datos semilla: categorías, servicios, usuario admin inicial |
| `019_servicio_categoria.sql` | Categorías de servicios médicos |
| `020_add_perdonado_column.sql` | Columna PERDONADO en VENTA (separación Perdonado vs Exento) |
| `021_product_variants.sql` | Columnas `ID_PRODUCTO_PADRE` + `NOMBRE_VARIANTE` en PRODUCTO (auto-referencia para variantes/calibres) |

---

## Cómo aplicar migraciones

### Via DBeaver (recomendado para desarrollo)

1. Conectar a la instancia Oracle ADB usando el wallet en `wallet/`
2. Abrir el archivo SQL deseado
3. Ejecutar en orden (F5 o botón Run Script)

### Via SQL*Plus

```bash
# Configurar TNS_ADMIN apuntando al wallet
export TNS_ADMIN=/ruta/a/ebif/wallet

# Aplicar una migración
sqlplus ebif_user@tu_dsn @backend/db/migrations/001_pre_sp_schema_changes.sql

# Aplicar todas en orden (macOS/Linux)
for f in backend/db/migrations/*.sql; do
    echo "Aplicando $f..."
    sqlplus ebif_user/password@tu_dsn @"$f"
done
```

### Via Python (para automatización)

```python
import oracledb

conn = oracledb.connect(user="ebif_user", password="...", dsn="...")
cursor = conn.cursor()

with open("backend/db/migrations/020_add_perdonado_column.sql") as f:
    sql = f.read()
    cursor.execute(sql)
    conn.commit()
```

---

## Reglas importantes

- **Nunca modificar** una migración ya aplicada en producción. Crear siempre una nueva.
- Las migraciones son **idempotentes cuando es posible**: usan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` o bloques `BEGIN/EXCEPTION/END` para no fallar si la columna ya existe.
- La migración `018_seed_data.sql` solo debe aplicarse en ambientes nuevos (contiene datos semilla que podrían duplicarse).
- Hacer siempre un **respaldo del esquema** antes de aplicar migraciones en producción.

---

## Estado actual del schema

El schema completo (21 migraciones aplicadas) incluye las siguientes tablas principales:

`USUARIO_SISTEMA` · `PACIENTE` · `TIPO_ESPINA_BIFIDA` · `PACIENTE_TIPO_ESPINA` · `TIPO_DOCUMENTO` · `DOCUMENTO_PACIENTE` · `DOCTOR` · `SERVICIO` · `DOCTOR_SERVICIO` · `DISPONIBILIDAD_DOCTOR` · `DISPONIBILIDAD_ESPECIAL_DOCTOR` · `CITA` · `DETALLE_CITA_SERVICIO` · `METODO_PAGO` · `VENTA` · `VENTA_LINEA` · `VENTA_METODO_PAGO` · `PRODUCTO` · `MEDICAMENTO` · `EQUIPO_MEDICO` · `EXISTENCIA_PRODUCTO` · `COMODATO` · `MOVIMIENTO_INVENTARIO` · `SOLICITUD_PREREGISTRO` · `BITACORA_CAMBIOS` · `SCHEMA_MIGRATIONS`

Ver el modelo relacional completo en [`docs/sdd.md`](../../../docs/sdd.md) (§7.2).
