FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as an unprivileged user
RUN useradd --system --uid 10001 --no-create-home app \
    && mkdir -p /data \
    && chown app:app /data

# Runtime data lives on a volume; the committed backend/data is only seed data.
# A fresh named volume inherits the ownership of /data set above.
ENV DATA_DIR=/data
VOLUME /data

USER app

EXPOSE 8000

# python:slim has no curl, so probe /api/health with the standard library
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"]

# Production server: no reload. Traefik is the only client on the internal
# network, so trust its X-Forwarded-* headers.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
