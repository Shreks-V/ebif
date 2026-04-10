# Backend Architecture

## Target

The backend is being migrated to a clean-architecture style split:

- `app/domain`: business entities, exceptions, and ports.
- `app/application`: use cases and orchestration.
- `app/infrastructure`: Oracle, security, encryption, audit, and startup adapters.
- `app/presentation`: FastAPI composition and HTTP routers.

Runtime flow:

- `presentation` wires concrete adapters in `app/presentation/api/bootstrap.py`
- `application` depends on repository ports from `domain`
- `infrastructure` implements those ports with Oracle-backed repositories

## Current Migration State

- App bootstrap now lives in `app/presentation/api/app_factory.py`.
- API composition now lives in `app/presentation/api/router.py`.
- Authentication is fully migrated to `domain` + `application` + `infrastructure`.
- `database`, `crypto` and `bitacora` already live in infrastructure.
- Feature routers now live in `app/presentation/api/routers` and delegate into `app/application/*/use_cases.py`.
- `app/core` is reduced to configuration only.
- Feature SQL now lives in `app/infrastructure/*/repository.py`.
- Feature repository contracts now live in `app/domain/*/ports.py`.
- `app/application/*/use_cases.py` is now orchestration/delegation only.

## Next Refactors

1. Introduce richer domain entities/value objects beyond auth where it adds clarity.
2. Replace broad repository interfaces with finer-grained ports if a module keeps growing.
3. Add tests around repository adapters and use-case wiring.
