# SCRUM-36: Configuracion de Ambiente de Pruebas

## Stack Tecnologico

| Componente | Tecnologia | Version |
|------------|-----------|---------|
| Frontend | Angular | 19.x |
| Backend | FastAPI (Python) | 0.115.x |
| Base de Datos | Oracle Database (Cloud) | ATP |
| Contenedores | Docker + Docker Compose | latest |

## Estructura del Proyecto

```
ebif/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, DB, seguridad, criptografia
│   │   ├── routers/       # Endpoints REST
│   │   ├── schemas/       # Modelos Pydantic
│   │   └── main.py        # App FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── seed_data.py       # Datos de prueba
│   └── run.py
├── frontend/
│   └── src/app/
│       ├── pages/         # Componentes de pagina
│       ├── services/      # Servicios HTTP
│       ├── shared/        # Componentes compartidos
│       └── core/          # Guards, interceptors
├── docker-compose.yml
└── wallet/                # Credenciales Oracle ATP
```

## Requisitos Previos

1. **Node.js** >= 18.x
2. **Python** >= 3.11
3. **Docker** (opcional, para contenedores)
4. **Oracle Wallet** configurado en `/wallet/`

## Levantar Ambiente Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
# Disponible en http://localhost:8000
# Docs: http://localhost:8000/api/docs
```

### Frontend
```bash
cd frontend
npm install
ng serve
# Disponible en http://localhost:4200
```

### Docker (Full Stack)
```bash
docker-compose up --build
```

## Datos de Prueba (Seed)

```bash
cd backend
python seed_data.py
```

Crea registros de prueba para: usuarios, beneficiarios, doctores, servicios, productos, citas, ventas, comodatos, etc.

## Credenciales de Prueba

| Usuario | Correo | Contrasena | Rol |
|---------|--------|------------|-----|
| Admin | admin@espinabifida.org | admin123 | ADMINISTRADOR |
| Operativo | operativo@espinabifida.org | op123 | RECEPCIONISTA |

## Variables de Entorno

Configuradas en `backend/app/core/config.py`:
- `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_DSN` - Conexion BD
- `SECRET_KEY` - Clave para JWT
- `CORS_ORIGINS` - Origenes permitidos
- `DEBUG` - Modo desarrollo (habilita /api/docs)
