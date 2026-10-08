FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Runtime data lives on a volume; the committed backend/data is only seed data
ENV DATA_DIR=/data
VOLUME /data

CMD ["python", "app.py"]
