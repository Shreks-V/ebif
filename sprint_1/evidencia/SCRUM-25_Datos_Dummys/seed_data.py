"""
Script de seed: genera datos dummy realistas para todos los modulos.
Ejecutar: python seed_data.py
"""

import random
from datetime import date, datetime, timedelta
from app.core.database import get_db
from app.core.crypto import encrypt
from app.core.security import get_password_hash

random.seed(42)

# ═══════════════════════════════════════════════════════════════
# DATA POOLS - Nombres y datos realistas mexicanos
# ═══════════════════════════════════════════════════════════════

NOMBRES_M = [
    "Santiago", "Mateo", "Sebastián", "Leonardo", "Emiliano",
    "Diego", "Miguel Ángel", "Daniel", "Alejandro", "Carlos",
    "Andrés", "Fernando", "Ricardo", "Jorge", "Luis",
    "Ángel", "Pablo", "Adrián", "Juan Pablo", "Eduardo",
    "Roberto", "Héctor", "Jesús", "Francisco", "Manuel",
]

NOMBRES_F = [
    "Sofía", "Valentina", "Regina", "Camila", "María José",
    "Ximena", "Renata", "Isabella", "Mariana", "Gabriela",
    "Daniela", "Ana Paula", "Victoria", "Natalia", "Lucía",
    "Andrea", "Fernanda", "Paola", "Carolina", "Elena",
    "Montserrat", "Alejandra", "Diana", "Valeria", "Karla",
]

APELLIDOS = [
    "García", "Hernández", "López", "Martínez", "González",
    "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres",
    "Flores", "Rivera", "Gómez", "Díaz", "Cruz",
    "Reyes", "Morales", "Gutiérrez", "Ortiz", "Ruiz",
    "Castillo", "Mendoza", "Vargas", "Chávez", "Jiménez",
    "Salazar", "Delgado", "Vega", "Ramos", "Aguilar",
]

COLONIAS_MTY = [
    "Centro", "Mitras Centro", "Cumbres", "San Jerónimo",
    "Contry", "Del Valle", "Vista Hermosa", "Anáhuac",
    "San Nicolás Centro", "Linda Vista", "Residencial Lincoln",
    "Las Puentes", "Moderna", "Obispado", "Chepevera",
    "Loma Larga", "Colinas de San Jerónimo", "Valle de Lincoln",
    "Residencial San Agustín", "Fierro",
]

CALLES_MTY = [
    "Av. Constitución", "Av. Morones Prieto", "Av. Gonzalitos",
    "Av. Revolución", "Av. Lázaro Cárdenas", "Av. Eugenio Garza Sada",
    "Av. Universidad", "Calle Padre Mier", "Calle Zuazua",
    "Calle Morelos", "Av. Ruiz Cortines", "Av. Alfonso Reyes",
    "Calle Hidalgo", "Av. Venustiano Carranza", "Calle Zaragoza",
]

CIUDADES_NL = ["Monterrey", "San Pedro Garza García", "San Nicolás de los Garza",
               "Guadalupe", "Apodaca", "Escobedo", "Santa Catarina", "García"]

ESTADOS_MX = ["Nuevo León", "Coahuila", "Tamaulipas", "San Luis Potosí",
              "Chihuahua", "Durango", "Zacatecas"]

HOSPITALES = [
    "Hospital Universitario Dr. José Eleuterio González",
    "Hospital Regional de Alta Especialidad Materno Infantil",
    "Hospital Metropolitano Dr. Bernardo Sepúlveda",
    "Hospital San José TecSalud",
    "Christus Muguerza Hospital Alta Especialidad",
    "Hospital General de Zona No. 33 IMSS",
    "Hospital Regional Materno Infantil",
    "Star Médica Monterrey",
]

TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

ESPECIALIDADES_MEDICAS = [
    "Neurocirugía", "Urología", "Ortopedia", "Pediatría",
    "Rehabilitación Física", "Fisioterapia", "Psicología",
    "Trabajo Social", "Neurología", "Nutrición",
]


def random_curp():
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits = "0123456789"
    return (
        "".join(random.choices(letters, k=4))
        + "".join(random.choices(digits, k=6))
        + random.choice(["H", "M"])
        + "".join(random.choices(letters, k=2))
        + "".join(random.choices(letters + digits, k=3))
        + random.choice(digits)
    )


def random_phone():
    return f"81{random.randint(10000000, 99999999)}"


def random_email(nombre, apellido):
    dom = random.choice(["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"])
    n = nombre.lower().split()[0].replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    a = apellido.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    return f"{n}.{a}{random.randint(1, 99)}@{dom}"


def random_date(start_year, end_year):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def random_cp():
    return str(random.randint(64000, 67999))


# ═══════════════════════════════════════════════════════════════
# SEED FUNCTIONS
# ═══════════════════════════════════════════════════════════════


def seed_usuarios(conn):
    """Insertar usuario doctor adicional."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM USUARIO_SISTEMA WHERE CORREO = :1", ["almacen@espinabifida.org"])
    if cursor.fetchone()[0] > 0:
        print("  Usuarios adicionales ya existen, saltando...")
        return

    cursor.execute(
        "INSERT INTO USUARIO_SISTEMA (NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, CORREO, CONTRASENA_HASH, ROL, ESTATUS) "
        "VALUES (:1, :2, :3, :4, :5, :6, :7)",
        ["Almacén", "Sistema", None, "almacen@espinabifida.org", get_password_hash("almacen123"), "ALMACEN", "ACTIVO"],
    )
    conn.commit()
    print("  +1 usuario (almacen@espinabifida.org / almacen123)")


def seed_servicios(conn):
    """Insertar servicios medicos."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM SERVICIO")
    if cursor.fetchone()[0] > 0:
        print("  Servicios ya existen, saltando...")
        return

    servicios = [
        ("Consulta Neurocirugía", "Consulta especializada en neurocirugía pediátrica", 350, 350, 500),
        ("Consulta Urología", "Consulta de urología pediátrica", 300, 300, 450),
        ("Consulta Ortopedia", "Valoración ortopédica y seguimiento", 300, 300, 450),
        ("Consulta Pediatría", "Consulta pediátrica general", 250, 250, 400),
        ("Fisioterapia", "Sesión de fisioterapia y rehabilitación", 200, 200, 350),
        ("Terapia Psicológica", "Sesión de psicología individual", 250, 250, 400),
        ("Valoración Nutricional", "Consulta y plan de nutrición", 200, 200, 300),
        ("Rehabilitación Física", "Sesión de rehabilitación física integral", 250, 250, 400),
        ("Estudio de Urodinamia", "Estudio urodinámico completo", 800, 800, 1200),
        ("Terapia Ocupacional", "Sesión de terapia ocupacional", 200, 200, 350),
        ("Consulta Neurología", "Consulta neurológica pediátrica", 350, 350, 500),
        ("Trabajo Social", "Evaluación y seguimiento social", 0, 0, 0),
    ]

    for nombre, desc, cuota, precio_a, precio_b in servicios:
        cursor.execute(
            "INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO, PRECIO_CUOTA_A, PRECIO_CUOTA_B) "
            "VALUES (:1, :2, :3, 'S', 2, SYSDATE, :4, :5)",
            [nombre, desc, cuota, precio_a, precio_b],
        )
    conn.commit()
    print(f"  +{len(servicios)} servicios")


def seed_doctores(conn):
    """Insertar doctores con servicios asociados."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM DOCTOR")
    if cursor.fetchone()[0] > 0:
        print("  Doctores ya existen, saltando...")
        return

    # Get servicio IDs
    cursor.execute("SELECT ID_SERVICIO, NOMBRE FROM SERVICIO ORDER BY ID_SERVICIO")
    servicios = {r[1].strip(): r[0] for r in cursor.fetchall()}

    doctores = [
        ("Roberto", "Garza", "Villarreal", "Neurocirugía", ["Consulta Neurocirugía"]),
        ("María Elena", "Cantú", "Treviño", "Urología", ["Consulta Urología", "Estudio de Urodinamia"]),
        ("Alejandro", "Salinas", "Leal", "Ortopedia", ["Consulta Ortopedia"]),
        ("Laura Patricia", "De León", "Garza", "Pediatría", ["Consulta Pediatría"]),
        ("Carlos Enrique", "Tamez", "Rodríguez", "Rehabilitación Física", ["Rehabilitación Física", "Fisioterapia"]),
        ("Ana Sofía", "Quintanilla", "Martínez", "Psicología", ["Terapia Psicológica"]),
        ("Francisco", "Elizondo", "Cavazos", "Nutrición", ["Valoración Nutricional"]),
        ("Patricia", "Lozano", "Díaz", "Neurología", ["Consulta Neurología"]),
        ("Miguel Ángel", "Cavazos", "Garza", "Fisioterapia", ["Fisioterapia", "Terapia Ocupacional"]),
        ("Guadalupe", "Saldívar", "Cerda", "Trabajo Social", ["Trabajo Social"]),
    ]

    for nombre, ap, am, esp, servs in doctores:
        id_var = cursor.var(int)
        cursor.execute(
            "INSERT INTO DOCTOR (NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, ID_USUARIO_REGISTRO) "
            "VALUES (:1, :2, :3, :4, :5, :6, 'S', 2) RETURNING ID_DOCTOR INTO :7",
            [nombre, ap, am, esp, encrypt(random_phone()), encrypt(random_email(nombre, ap)), id_var],
        )
        doc_id = id_var.getvalue()[0]
        for s_name in servs:
            sid = servicios.get(s_name)
            if sid:
                cursor.execute(
                    "INSERT INTO DOCTOR_SERVICIO (ID_DOCTOR, ID_SERVICIO) VALUES (:1, :2)",
                    [doc_id, sid],
                )

    conn.commit()
    print(f"  +{len(doctores)} doctores con servicios")


def seed_disponibilidad(conn):
    """Insertar slots de disponibilidad semanal para doctores (por dia de la semana)."""
    cursor = conn.cursor()

    # Migrate: add DIA_SEMANA column if not exists
    try:
        cursor.execute("ALTER TABLE DISPONIBILIDAD_DOCTOR ADD (DIA_SEMANA NUMBER(1))")
    except Exception:
        pass  # Column already exists

    # Clear old date-based data to avoid mixing schemas
    cursor.execute("DELETE FROM DISPONIBILIDAD_DOCTOR WHERE DIA_SEMANA IS NULL")
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM DISPONIBILIDAD_DOCTOR WHERE DIA_SEMANA IS NOT NULL")
    if cursor.fetchone()[0] > 0:
        print("  Disponibilidad semanal ya existe, saltando...")
        return

    cursor.execute("SELECT ID_DOCTOR FROM DOCTOR WHERE ACTIVO = 'S'")
    doc_ids = [r[0] for r in cursor.fetchall()]

    # Asignar un doctor por dia (Lun-Vie), sin conflictos
    # dia_semana: 1=Lunes .. 5=Viernes
    count = 0
    for i, doc_id in enumerate(doc_ids):
        # Each doctor gets 1-2 weekdays
        dias = [(i % 5) + 1]
        if len(doc_ids) <= 5:
            # Also assign a secondary day if few doctors
            dias.append(((i + 2) % 5) + 1)
        for dia in dias:
            cursor.execute(
                "INSERT INTO DISPONIBILIDAD_DOCTOR (ID_DOCTOR, DIA_SEMANA, HORA_INICIO, HORA_FIN, DISPONIBLE) "
                "VALUES (:1, :2, TO_TIMESTAMP(:3, 'HH24:MI'), TO_TIMESTAMP(:4, 'HH24:MI'), 'S')",
                [doc_id, dia, "09:00", "14:00"],
            )
            count += 1

    conn.commit()
    print(f"  +{count} slots de disponibilidad semanal")


def seed_productos(conn):
    """Insertar productos (medicamentos y equipos)."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM PRODUCTO")
    if cursor.fetchone()[0] > 0:
        print("  Productos ya existen, saltando...")
        return

    medicamentos = [
        ("MED-001", "Oxibutinina 5mg", "Tratamiento vejiga neurogénica", "Tabletas", "5mg", "S", 45, 80),
        ("MED-002", "Baclofeno 10mg", "Relajante muscular", "Tabletas", "10mg", "N", 65, 110),
        ("MED-003", "Gabapentina 300mg", "Anticonvulsivo/dolor neuropático", "Cápsulas", "300mg", "S", 55, 95),
        ("MED-004", "Sondas Nelaton 10Fr", "Cateterismo intermitente", "Pieza", "10Fr", "N", 25, 45),
        ("MED-005", "Sondas Nelaton 12Fr", "Cateterismo intermitente", "Pieza", "12Fr", "N", 25, 45),
        ("MED-006", "Sondas Nelaton 14Fr", "Cateterismo intermitente", "Pieza", "14Fr", "N", 28, 50),
        ("MED-007", "Pañales Adulto M", "Pañal desechable talla M", "Paquete 10pz", "N/A", "N", 85, 140),
        ("MED-008", "Pañales Adulto G", "Pañal desechable talla G", "Paquete 10pz", "N/A", "N", 95, 155),
        ("MED-009", "Gel Lubricante Médico", "Lubricante para cateterismo", "Tubo 100ml", "N/A", "N", 35, 60),
        ("MED-010", "Látex Guantes M", "Guantes de examinación talla M", "Caja 100pz", "N/A", "N", 120, 200),
    ]

    equipos = [
        ("EQP-001", "Silla de Ruedas Pediátrica", "Silla de ruedas manual pediátrica", "SR-001", "Sunrise Medical", "Zippie", "DISPONIBLE"),
        ("EQP-002", "Silla de Ruedas Pediátrica", "Silla de ruedas manual pediátrica", "SR-002", "Sunrise Medical", "Zippie", "DISPONIBLE"),
        ("EQP-003", "Andador Pediátrico", "Andador con soporte anterior", "AND-001", "Drive Medical", "Nimbo 2G", "DISPONIBLE"),
        ("EQP-004", "Andador Pediátrico", "Andador con soporte anterior", "AND-002", "Drive Medical", "Nimbo 2G", "MANTENIMIENTO"),
        ("EQP-005", "Férula AFO Derecha", "Órtesis tobillo-pie derecho", "FER-001", "Ottobock", "WalkOn", "DISPONIBLE"),
        ("EQP-006", "Férula AFO Izquierda", "Órtesis tobillo-pie izquierdo", "FER-002", "Ottobock", "WalkOn", "DISPONIBLE"),
        ("EQP-007", "Bipedestador Infantil", "Marco de bipedestación pediátrico", "BIP-001", "Rifton", "Supine", "DISPONIBLE"),
        ("EQP-008", "Muletas Canadienses", "Par de muletas tipo canadiense", "MUL-001", "Ortopedia Nacional", "Estándar", "DISPONIBLE"),
    ]

    # RF-I-06: Ensure FECHA_CADUCIDAD column exists on EXISTENCIA_PRODUCTO
    try:
        cursor.execute("ALTER TABLE EXISTENCIA_PRODUCTO ADD (FECHA_CADUCIDAD DATE)")
    except Exception:
        pass  # Column already exists

    # Caducidad dates: some near-expiry, some future, some None
    today = date.today()
    caducidad_offsets = [10, -5, 90, 20, None, None, 180, 365, 15, None]

    for idx, (clave, nombre, desc, present, dosis, req_cad, pa, pb) in enumerate(medicamentos):
        id_var = cursor.var(int)
        cursor.execute(
            "INSERT INTO PRODUCTO (CLAVE_INTERNA, NOMBRE, DESCRIPCION, TIPO_PRODUCTO, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO, PRECIO_CUOTA_A, PRECIO_CUOTA_B) "
            "VALUES (:1, :2, :3, 'MEDICAMENTO', 'S', 2, SYSDATE, :4, :5) RETURNING ID_PRODUCTO INTO :6",
            [clave, nombre, desc, pa, pb, id_var],
        )
        pid = id_var.getvalue()[0]
        cursor.execute(
            "INSERT INTO MEDICAMENTO (ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD) VALUES (:1, :2, :3, :4)",
            [pid, present, dosis, req_cad],
        )
        offset = caducidad_offsets[idx % len(caducidad_offsets)]
        fecha_cad = (today + timedelta(days=offset)) if (req_cad == "S" and offset is not None) else None
        cursor.execute(
            "INSERT INTO EXISTENCIA_PRODUCTO (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO, FECHA_CADUCIDAD) "
            "VALUES (:1, :2, :3, :4, 'S', :5)",
            [pid, random.randint(20, 200), random.randint(5, 20), present, fecha_cad],
        )

    for clave, nombre, desc, serie, marca, modelo, estatus in equipos:
        id_var = cursor.var(int)
        cursor.execute(
            "INSERT INTO PRODUCTO (CLAVE_INTERNA, NOMBRE, DESCRIPCION, TIPO_PRODUCTO, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO, PRECIO_CUOTA_A, PRECIO_CUOTA_B) "
            "VALUES (:1, :2, :3, 'EQUIPO_MEDICO', 'S', 2, SYSDATE, 0, 0) RETURNING ID_PRODUCTO INTO :4",
            [clave, nombre, desc, id_var],
        )
        pid = id_var.getvalue()[0]
        cursor.execute(
            "INSERT INTO EQUIPO_MEDICO (ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO, ESTATUS_EQUIPO, OBSERVACIONES) "
            "VALUES (:1, :2, :3, :4, :5, NULL)",
            [pid, serie, marca, modelo, estatus],
        )
        cursor.execute(
            "INSERT INTO EXISTENCIA_PRODUCTO (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO) "
            "VALUES (:1, 1, 1, 'Pieza', 'S')",
            [pid],
        )

    conn.commit()
    print(f"  +{len(medicamentos)} medicamentos, +{len(equipos)} equipos")


def seed_pacientes(conn):
    """Insertar 30 pacientes aprobados + 5 pre-registros pendientes."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM PACIENTE")
    if cursor.fetchone()[0] > 0:
        print("  Pacientes ya existen, saltando...")
        return

    pacientes_aprobados = []

    # 30 pacientes aprobados (beneficiarios activos)
    for i in range(1, 31):
        genero = random.choice(["Masculino", "Femenino"])
        nombre = random.choice(NOMBRES_M if genero == "Masculino" else NOMBRES_F)
        ap = random.choice(APELLIDOS)
        am = random.choice(APELLIDOS)
        fecha_nac = random_date(2000, 2022)
        ciudad = random.choice(CIUDADES_NL)
        estado = "Nuevo León" if random.random() < 0.75 else random.choice(ESTADOS_MX[1:])
        usa_valvula = random.choice(["S", "N"])
        tipo_cuota = random.choice(["CUOTA A", "CUOTA B"])
        membresia = "ACTIVO" if random.random() < 0.8 else "INACTIVO"
        padre = f"{random.choice(NOMBRES_F if random.random() < 0.6 else NOMBRES_M)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"

        notas_opciones = [
            f"Paciente con espina bífida diagnosticada al nacimiento. {'Usa válvula VP.' if usa_valvula == 'S' else 'No usa válvula.'}",
            f"Seguimiento regular. Última consulta hace {random.randint(1,6)} meses.",
            f"Requiere cateterismo intermitente. Control cada {random.randint(2,6)} meses.",
            None,
        ]

        folio = f"BEN-{i:06d}"
        id_var = cursor.var(int)

        cursor.execute(
            """INSERT INTO PACIENTE (
                FOLIO, ACTIVO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
                GENERO, FECHA_NACIMIENTO, CURP, NOMBRE_PADRE_MADRE,
                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,
                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,
                MUNICIPIO_NACIMIENTO, ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO,
                TIPO_SANGRE, USA_VALVULA, NOTAS_ADICIONALES,
                FECHA_ALTA, MEMBRESIA_ESTATUS, ID_USUARIO_REGISTRO, FECHA_REGISTRO,
                TIPO_CUOTA, ESTATUS_REGISTRO
            ) VALUES (
                :folio, 'S', :nombre, :ap, :am,
                :genero, TO_DATE(:fecha_nac, 'YYYY-MM-DD'), :curp, :padre,
                :direccion, :colonia, :ciudad, :estado, :cp,
                :tel_casa, :tel_cel, :correo,
                :emergencia, :tel_emergencia,
                :mun_nac, :edo_nac, :hospital,
                :tipo_sangre, :usa_valvula, :notas,
                SYSDATE, :membresia, 2, SYSDATE,
                :tipo_cuota, 'APROBADO'
            ) RETURNING ID_PACIENTE INTO :id_out""",
            {
                "folio": folio,
                "nombre": nombre,
                "ap": ap,
                "am": am,
                "genero": genero,
                "fecha_nac": fecha_nac.isoformat(),
                "curp": encrypt(random_curp()),
                "padre": encrypt(padre),
                "direccion": encrypt(f"{random.choice(CALLES_MTY)} #{random.randint(100,9999)}"),
                "colonia": random.choice(COLONIAS_MTY),
                "ciudad": ciudad,
                "estado": estado,
                "cp": random_cp(),
                "tel_casa": encrypt(random_phone()),
                "tel_cel": encrypt(random_phone()),
                "correo": encrypt(random_email(nombre, ap)),
                "emergencia": encrypt(padre),
                "tel_emergencia": encrypt(random_phone()),
                "mun_nac": random.choice(CIUDADES_NL),
                "edo_nac": "Nuevo León",
                "hospital": encrypt(random.choice(HOSPITALES)),
                "tipo_sangre": encrypt(random.choice(TIPOS_SANGRE)),
                "usa_valvula": usa_valvula,
                "notas": encrypt(random.choice(notas_opciones)),
                "membresia": membresia,
                "tipo_cuota": tipo_cuota,
                "id_out": id_var,
            },
        )
        pac_id = id_var.getvalue()[0]
        pacientes_aprobados.append(pac_id)

        # Assign 1-2 tipos de espina bifida
        tipos = random.sample([1, 2, 3, 4], k=random.randint(1, 2))
        for tid in tipos:
            cursor.execute(
                "INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO) VALUES (:1, :2, SYSDATE)",
                [pac_id, tid],
            )

    # 5 pre-registros pendientes
    for i in range(31, 36):
        genero = random.choice(["Masculino", "Femenino"])
        nombre = random.choice(NOMBRES_M if genero == "Masculino" else NOMBRES_F)
        ap = random.choice(APELLIDOS)
        am = random.choice(APELLIDOS)
        fecha_nac = random_date(2015, 2024)
        padre = f"{random.choice(NOMBRES_F)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"
        folio = f"PRE-{i:06d}"

        cursor.execute(
            """INSERT INTO PACIENTE (
                FOLIO, ACTIVO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
                GENERO, FECHA_NACIMIENTO, CURP, NOMBRE_PADRE_MADRE,
                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,
                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,
                ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO,
                TIPO_SANGRE, USA_VALVULA, NOTAS_ADICIONALES,
                ESTATUS_REGISTRO, FECHA_REGISTRO, PASO_ACTUAL
            ) VALUES (
                :folio, 'S', :nombre, :ap, :am,
                :genero, TO_DATE(:fecha_nac, 'YYYY-MM-DD'), :curp, :padre,
                :direccion, :colonia, :ciudad, :estado, :cp,
                :tel_casa, :tel_cel, :correo,
                :emergencia, :tel_emergencia,
                :edo_nac, :hospital,
                :tipo_sangre, :usa_valvula, :notas,
                :estatus, SYSDATE, :paso
            )""",
            {
                "folio": folio,
                "nombre": nombre,
                "ap": ap,
                "am": am,
                "genero": genero,
                "fecha_nac": fecha_nac.isoformat(),
                "curp": encrypt(random_curp()),
                "padre": encrypt(padre),
                "direccion": encrypt(f"{random.choice(CALLES_MTY)} #{random.randint(100, 9999)}"),
                "colonia": random.choice(COLONIAS_MTY),
                "ciudad": random.choice(CIUDADES_NL),
                "estado": "Nuevo León",
                "cp": random_cp(),
                "tel_casa": encrypt(random_phone()),
                "tel_cel": encrypt(random_phone()),
                "correo": encrypt(random_email(nombre, ap)),
                "emergencia": encrypt(padre),
                "tel_emergencia": encrypt(random_phone()),
                "edo_nac": "Nuevo León",
                "hospital": encrypt(random.choice(HOSPITALES)),
                "tipo_sangre": encrypt(random.choice(TIPOS_SANGRE)),
                "usa_valvula": random.choice(["S", "N"]),
                "notas": encrypt(f"Tipo de espina bífida: {random.choice(['Oculta', 'Meningocele', 'Mielomeningocele'])}"),
                "estatus": random.choice(["PENDIENTE", "PENDIENTE", "PENDIENTE", "RECHAZADO"]),
                "paso": random.randint(1, 4),
            },
        )

    conn.commit()
    print(f"  +30 pacientes aprobados, +5 pre-registros")
    return pacientes_aprobados


def seed_citas(conn, paciente_ids):
    """Insertar citas con servicios asociados."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM CITA")
    if cursor.fetchone()[0] > 0:
        print("  Citas ya existen, saltando...")
        return

    cursor.execute("SELECT ID_SERVICIO FROM SERVICIO ORDER BY ID_SERVICIO")
    servicio_ids = [r[0] for r in cursor.fetchall()]

    cursor.execute("SELECT ID_SERVICIO, PRECIO_CUOTA_A FROM SERVICIO ORDER BY ID_SERVICIO")
    servicio_precios = {r[0]: float(r[1] or 0) for r in cursor.fetchall()}

    # Valid: PROGRAMADA, COMPLETADA, CANCELADA
    estatus_opciones = ["COMPLETADA", "COMPLETADA", "COMPLETADA", "PROGRAMADA", "PROGRAMADA", "CANCELADA"]
    today = date.today()
    count = 0

    for pac_id in paciente_ids:
        # 1-4 citas por paciente
        num_citas = random.randint(1, 4)
        for _ in range(num_citas):
            # Mix of past and future dates
            if random.random() < 0.6:
                fecha = today - timedelta(days=random.randint(1, 180))
                estatus = random.choice(["COMPLETADA", "COMPLETADA", "CANCELADA"])
            else:
                fecha = today + timedelta(days=random.randint(1, 30))
                estatus = "PROGRAMADA"

            hora = random.choice(["09:00", "10:00", "11:00", "12:00", "16:00", "17:00"])
            fecha_hora = f"{fecha.isoformat()}T{hora}:00"

            notas_cita = random.choice([
                "Control rutinario",
                "Seguimiento post-cirugía",
                "Revisión de válvula",
                "Evaluación de movilidad",
                "Primera consulta",
                None,
            ])

            id_var = cursor.var(int)
            cursor.execute(
                "INSERT INTO CITA (ID_PACIENTE, ID_USUARIO_REGISTRO, FECHA_HORA, ESTATUS, NOTAS) "
                "VALUES (:1, 2, TO_TIMESTAMP(:2, 'YYYY-MM-DD\"T\"HH24:MI:SS'), :3, :4) "
                "RETURNING ID_CITA INTO :5",
                [pac_id, fecha_hora, estatus, notas_cita, id_var],
            )
            cita_id = id_var.getvalue()[0]

            # 1-3 servicios por cita
            num_servicios = random.randint(1, 3)
            for sid in random.sample(servicio_ids, k=min(num_servicios, len(servicio_ids))):
                monto = servicio_precios.get(sid, 0) if estatus == "COMPLETADA" else 0
                cursor.execute(
                    "INSERT INTO DETALLE_CITA_SERVICIO (ID_CITA, ID_SERVICIO, CANTIDAD, MONTO_PAGADO, CANCELADO) "
                    "VALUES (:1, :2, 1, :3, 'N')",
                    [cita_id, sid, monto],
                )
            count += 1

    conn.commit()
    print(f"  +{count} citas con servicios")


def seed_ventas(conn, paciente_ids):
    """Insertar ventas/recibos con metodos de pago."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM VENTA")
    if cursor.fetchone()[0] > 0:
        print("  Ventas ya existen, saltando...")
        return

    today = date.today()
    count = 0

    # ~20 ventas distribuidas entre pacientes
    pacientes_con_venta = random.sample(paciente_ids, k=min(20, len(paciente_ids)))

    for idx, pac_id in enumerate(pacientes_con_venta, 1):
        fecha = today - timedelta(days=random.randint(1, 120))
        folio = f"VTA-{fecha.year}-{idx:03d}"
        monto_total = round(random.uniform(100, 2000), 2)

        # Some fully paid, some partially, some exempt
        tipo = random.choice(["full", "full", "full", "partial", "exempt"])
        if tipo == "exempt":
            monto_pagado = 0.0
            saldo = 0.0
            exento = "S"
        elif tipo == "partial":
            monto_pagado = round(monto_total * random.uniform(0.3, 0.8), 2)
            saldo = round(monto_total - monto_pagado, 2)
            exento = "N"
        else:
            monto_pagado = monto_total
            saldo = 0.0
            exento = "N"

        id_var = cursor.var(int)
        cursor.execute(
            "INSERT INTO VENTA (ID_PACIENTE, ID_USUARIO_REGISTRO, FOLIO_VENTA, FECHA_VENTA, "
            "MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE, EXENTO_PAGO, CANCELADA) "
            "VALUES (:1, 2, :2, TO_TIMESTAMP(:3, 'YYYY-MM-DD'), :4, :5, :6, :7, 'N') "
            "RETURNING ID_VENTA INTO :8",
            [pac_id, folio, fecha.isoformat(), monto_total, monto_pagado, saldo, exento, id_var],
        )
        venta_id = id_var.getvalue()[0]

        # Payment methods
        if exento == "N" and monto_pagado > 0:
            metodo_id = random.choice([1, 2, 3])  # Efectivo, Transferencia, Tarjeta
            cursor.execute(
                "INSERT INTO VENTA_METODO_PAGO (ID_VENTA, ID_METODO_PAGO, MONTO, FECHA_REGISTRO) "
                "VALUES (:1, :2, :3, SYSTIMESTAMP)",
                [venta_id, metodo_id, monto_pagado],
            )
        elif exento == "S":
            cursor.execute(
                "INSERT INTO VENTA_METODO_PAGO (ID_VENTA, ID_METODO_PAGO, MONTO, FECHA_REGISTRO) "
                "VALUES (:1, 4, 0, SYSTIMESTAMP)",
                [venta_id],
            )

        count += 1

    conn.commit()
    print(f"  +{count} ventas/recibos")


def seed_comodatos(conn, paciente_ids):
    """Insertar comodatos (préstamos de equipo)."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM COMODATO")
    if cursor.fetchone()[0] > 0:
        print("  Comodatos ya existen, saltando...")
        return

    cursor.execute("SELECT ID_PRODUCTO FROM PRODUCTO WHERE TIPO_PRODUCTO = 'EQUIPO_MEDICO'")
    equipo_ids = [r[0] for r in cursor.fetchall()]

    if not equipo_ids:
        print("  No hay equipos para comodatos, saltando...")
        return

    today = date.today()
    count = 0
    # 6 comodatos
    pacientes_com = random.sample(paciente_ids, k=min(6, len(paciente_ids)))

    for idx, pac_id in enumerate(pacientes_com, 1):
        equipo_id = random.choice(equipo_ids)
        folio = f"COM-{idx:06d}"
        fecha_prest = (today - timedelta(days=random.randint(10, 90))).isoformat()

        estatus = random.choice(["PRESTADO", "PRESTADO", "PRESTADO", "DEVUELTO"])
        fecha_dev = None
        if estatus == "DEVUELTO":
            fecha_dev = (today - timedelta(days=random.randint(1, 9))).isoformat()

        monto = round(random.uniform(0, 500), 2)
        pagado = monto if random.random() < 0.6 else round(monto * 0.5, 2)
        saldo = round(monto - pagado, 2)
        exento = "S" if random.random() < 0.3 else "N"
        if exento == "S":
            monto = 0
            pagado = 0
            saldo = 0

        notas_com = random.choice(["Préstamo temporal", "Uso durante rehabilitación", None])
        if fecha_dev:
            cursor.execute(
                "INSERT INTO COMODATO (FOLIO_COMODATO, ID_EQUIPO, ID_PACIENTE, ID_USUARIO_REGISTRO, "
                "FECHA_PRESTAMO, FECHA_DEVOLUCION, ESTATUS, MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE, "
                "EXENTO_PAGO, NOTAS) "
                "VALUES (:1, :2, :3, 2, TO_DATE(:4, 'YYYY-MM-DD'), TO_DATE(:5, 'YYYY-MM-DD'), "
                ":6, :7, :8, :9, :10, :11)",
                [folio, equipo_id, pac_id, fecha_prest, fecha_dev, estatus,
                 monto, pagado, saldo, exento, notas_com],
            )
        else:
            cursor.execute(
                "INSERT INTO COMODATO (FOLIO_COMODATO, ID_EQUIPO, ID_PACIENTE, ID_USUARIO_REGISTRO, "
                "FECHA_PRESTAMO, ESTATUS, MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE, "
                "EXENTO_PAGO, NOTAS) "
                "VALUES (:1, :2, :3, 2, TO_DATE(:4, 'YYYY-MM-DD'), "
                ":5, :6, :7, :8, :9, :10)",
                [folio, equipo_id, pac_id, fecha_prest, estatus,
                 monto, pagado, saldo, exento, notas_com],
            )
        count += 1

    conn.commit()
    print(f"  +{count} comodatos")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════


def main():
    print("=" * 50)
    print("SEED: Generando datos dummy para todos los modulos")
    print("=" * 50)

    with get_db() as conn:
        print("\n[1/8] Usuarios...")
        seed_usuarios(conn)

        print("[2/8] Servicios...")
        seed_servicios(conn)

        print("[3/8] Doctores...")
        seed_doctores(conn)

        print("[4/8] Disponibilidad doctores...")
        seed_disponibilidad(conn)

        print("[5/8] Productos (medicamentos + equipos)...")
        seed_productos(conn)

    # Pacientes need their own connection for the RETURNING clause
    with get_db() as conn:
        print("[6/8] Pacientes (30 aprobados + 5 pre-registros)...")
        paciente_ids = seed_pacientes(conn)

    # If pacientes already existed, fetch their IDs
    if not paciente_ids:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT ID_PACIENTE FROM PACIENTE WHERE ESTATUS_REGISTRO = 'APROBADO' AND ACTIVO = 'S' ORDER BY ID_PACIENTE")
            paciente_ids = [r[0] for r in cursor.fetchall()]

    if paciente_ids:
        with get_db() as conn:
            print("[7/8] Citas...")
            seed_citas(conn, paciente_ids)

        with get_db() as conn:
            print("[8/8] Ventas y Comodatos...")
            seed_ventas(conn, paciente_ids)
            seed_comodatos(conn, paciente_ids)

    print("\n" + "=" * 50)
    print("SEED COMPLETADO")
    print("=" * 50)

    # Summary
    with get_db() as conn:
        cursor = conn.cursor()
        tables = [
            "USUARIO_SISTEMA", "PACIENTE", "DOCTOR", "SERVICIO",
            "PRODUCTO", "CITA", "VENTA", "COMODATO",
            "DISPONIBILIDAD_DOCTOR", "DETALLE_CITA_SERVICIO",
            "VENTA_METODO_PAGO", "EXISTENCIA_PRODUCTO",
        ]
        print("\nResumen final:")
        for t in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {t}")
            print(f"  {t}: {cursor.fetchone()[0]} registros")


if __name__ == "__main__":
    main()
