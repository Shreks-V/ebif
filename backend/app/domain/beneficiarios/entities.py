from typing_extensions import TypedDict


class Beneficiario(TypedDict, total=False):
    id_paciente: int
    folio: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str | None
    genero: str | None
    fecha_nacimiento: str | None
    curp: str
    nombre_padre_madre: str | None
    direccion: str | None
    colonia: str | None
    ciudad: str | None
    estado: str | None
    codigo_postal: str | None
    telefono_casa: str | None
    telefono_celular: str | None
    correo_electronico: str | None
    en_emergencia_avisar_a: str | None
    telefono_emergencia: str | None
    municipio_nacimiento: str | None
    estado_nacimiento: str | None
    hospital_nacimiento: str | None
    tipo_sangre: str | None
    usa_valvula: str
    notas_adicionales: str | None
    membresia_estatus: str
    tipo_cuota: str | None
    activo: str
    fecha_alta: str | None
    fecha_registro: str | None
    tutor: int | None
    relacion_parentezco: str | None
    tipos_espina: list[dict] | None
    fecha_inicio_membresia: str | None
    fecha_vencimiento_membresia: str | None
    estatus_registro: str | None


class TipoEspina(TypedDict, total=False):
    id_tipo_espina: int
    nombre: str
    descripcion: str | None
    activo: str
