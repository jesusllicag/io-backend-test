# IO Backend — Card Issuance System

Sistema distribuido basado en eventos para la emisión de tarjetas, construido con NestJS monorepo, Kafka y Redis.

## Arquitectura

```text
Client
  │
  ▼
POST /api/v1/cards/issue       (card-issuer)
  │  Valida → persiste PENDING → publica evento
  ▼
Kafka: io.card.requested.v1
  │
  ▼
card-processor
  │  Simula servicio externo (200–500 ms, éxito aleatorio)
  │  Retry: 1 s → 2 s → 4 s (máx 3 reintentos)
  ├─ éxito → actualiza Redis → publica io.cards.issued.v1
  └─ fallo → actualiza Redis → publica io.card.requested.v1.dlq
```

## Estructura del monorepo

```text
apps/
  card-issuer/          # REST API (arquitectura hexagonal)
  card-processor/       # Consumer Kafka (arquitectura hexagonal)

libs/
  contracts/            # Tipos, schemas Zod, eventos CloudEvents
  kafka/                # KafkaJS producer y consumer
  logger/               # Pino centralizado
  common/               # Utilidades: IDs (node:crypto), generación de tarjeta
```

## Requisitos previos

- Node.js ≥ 20
- Docker y Docker Compose

## Inicio rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar infraestructura (Kafka + Redis)

```bash
docker compose up -d
```

Espera ~20 s a que Kafka esté listo. Puedes verificar:

```bash
docker compose ps
```

### 3. Levantar servicios

En dos terminales separadas:

```bash
# Terminal 1 — card-issuer (API REST en :3000)
npm run start:issuer:dev

# Terminal 2 — card-processor (consumer Kafka)
npm run start:processor:dev
```

### 4. Probar el endpoint

```bash
curl -X POST http://localhost:3000/api/v1/cards/issue \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "documentType": "DNI",
      "documentNumber": "11654321",
      "fullName": "Jose Perez",
      "age": 25,
      "email": "joseperez@example.com"
    },
    "product": {
      "type": "VISA",
      "currency": "PEN"
    },
    "forceError": false
  }'
```

Respuesta exitosa (202 Accepted):

```json
{
  "requestId": "uuid-generado",
  "status": "PENDING"
}
```

### 5. Forzar error (prueba DLQ)

Cambia `"forceError": true` para que el processor falle siempre y publique en el DLQ tras 3 reintentos.

## Build para producción

```bash
npm run build:issuer
npm run build:processor

# Ejecutar bundles
node dist/apps/card-issuer/main.js
node dist/apps/card-processor/main.js
```

## Tests

```bash
npm test
npm run test:cov
```

## Variables de entorno

| Variable       | Default                  | Descripción                    |
|----------------|--------------------------|--------------------------------|
| `PORT`         | `3000`                   | Puerto del card-issuer         |
| `KAFKA_BROKER` | `localhost:9092`         | Broker Kafka                   |
| `REDIS_URL`    | `redis://localhost:6379` | URL de Redis                   |
| `LOG_LEVEL`    | `info`                   | Nivel de log Pino              |
| `NODE_ENV`     | `development`            | Entorno (activa pino-pretty)   |

## Tópicos Kafka

| Tópico                        | Descripción                        |
|-------------------------------|------------------------------------|
| `io.card.requested.v1`        | Solicitud de emisión (PENDING)     |
| `io.cards.issued.v1`          | Tarjeta emitida exitosamente       |
| `io.card.requested.v1.dlq`    | Solicitud fallida (Dead Letter Queue) |

## Decisiones técnicas

- **NestJS monorepo** — permite compartir contratos, logger y kafka config entre servicios sin duplicación.
- **Arquitectura hexagonal** — dominio agnóstico de infraestructura; puertos (interfaces) y adaptadores (Redis, Kafka).
- **Redis Repository Pattern** — persistencia con índice por DNI para evitar duplicados de tarjetas por cliente.
- **Retry exponencial manual** — 1 s, 2 s, 4 s dentro del handler del consumer; evita dependencias externas de retry.
- **CloudEvents** — estructura de eventos estandarizada con `id` autoincremental por ejecución y `source` = `requestId`.
- **Zod** — validación manual en `ZodValidationPipe`; no usa los pipes de NestJS.
- **node:crypto** — `randomUUID()` sin dependencias externas para IDs.
- **Pino** — logging estructurado JSON con redacción de campos sensibles (`cardNumber`, `cvv`, etc.).
