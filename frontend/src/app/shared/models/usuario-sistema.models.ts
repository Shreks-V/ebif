export type RolUsuario = 'ADMIN' | 'OPERADOR' | 'RECEPCIONISTA' | string;

export interface UsuarioSistema {
  id_usuario: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  correo: string;
  rol: RolUsuario;
  estatus: string;
  fecha_alta?: string;
  ultimo_acceso?: string;
}

export interface CrearUsuarioPayload {
  nombre: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  correo: string;
  contrasena: string;
  rol: RolUsuario;
  estatus?: string;
}

export interface ActualizarUsuarioPayload {
  nombre?: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  correo?: string;
  rol?: RolUsuario;
  estatus?: string;
}

export interface CambiarContrasenaPayload {
  contrasena_actual: string;
  contrasena_nueva: string;
}

export interface ResetContrasenaPayload {
  contrasena_nueva: string;
}
