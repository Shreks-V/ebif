FROM python:3.12-slim

# Keep Python quiet and predictable
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install build-time packages, install Python deps, then remove build deps.
# Also create non-root user and wallet directory here to minimise layers.
# This keeps the final image smaller while still allowing packages that need compilation.
COPY requirements.txt .
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		build-essential \
		gcc \
		libssl-dev \
		libffi-dev \
		ca-certificates \
	&& python -m pip install --upgrade pip setuptools wheel \
	&& pip install --no-cache-dir --prefer-binary -r requirements.txt \
	&& apt-get purge -y --auto-remove build-essential gcc \
	&& rm -rf /var/lib/apt/lists/* /root/.cache/pip \
	&& useradd -r -u 1001 appuser \
	&& mkdir -p /wallet \
	&& chown -R appuser /app /wallet

# nosonar
COPY --chown=appuser:appuser . .

# Default env vars (override in docker-compose or at runtime)
ENV ORACLE_CLIENT_DIR=""
ENV ORACLE_CONFIG_DIR="/wallet"
ENV ORACLE_WALLET_DIR="/wallet"
ENV CORS_ORIGINS="http://localhost:4200,http://localhost"

USER appuser
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
