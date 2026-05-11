# Compatibility shim — canonical location: app.presentation.api.schemas
# All application code now imports from there directly.
from app.presentation.api.schemas import (  # noqa: F401
    __all__,
    UserLogin, CambiarContrasenaRequest, AdminResetContrasenaRequest,
    Token, UserResponse, UsuarioBase, UsuarioCreate, UsuarioResponse,
    BeneficiarioResponse, TipoEspinaBifida, MetodoPago,
    DoctorResponse, DisponibilidadResponse,
    ServicioResponse, ProductoResponse, ExistenciaProducto,
    CitaResponse, DetalleCitaServicio,
    ComodatoResponse, VentaResponse, MovimientoInventario,
    DocumentoPacienteBase, DocumentoPacienteResponse, TipoDocumento,
    ReporteResponse, BitacoraCambios,
    BeneficiarioBase, BeneficiarioCreate, RenovarMembresiaCreate,
    CitaBase, CitaCreate,
    ServicioBase, ServicioCreate,
    ProductoBase, ProductoCreate,
    ComodatoBase, ComodatoCreate,
    AjusteExistenciaRequest,
    DoctorBase, DoctorCreate, DisponibilidadCreate,
    PreRegistroCreate, AprobarPreRegistroData,
    VentaBase, VentaCreate, PagoParcialCreate,
    ReporteFilter,
)
