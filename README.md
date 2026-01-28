# K6 Performance Testing Framework

Framework profesional de testing de rendimiento para servicios web SOAP usando K6, con integración de Grafana y generación automática de reportes PDF.

## Requisitos

- [K6](https://k6.io/docs/getting-started/installation/)
- [Docker](https://www.docker.com/) (para Grafana + InfluxDB)
- [Node.js](https://nodejs.org/) >= 14.0.0

## Instalacion

```bash
git clone <repository>
cd k6
npm install
```

## Uso Rapido

Cada comando ejecuta automaticamente:
1. Inicia Grafana + InfluxDB
2. Limpia datos anteriores
3. Abre dashboard en navegador
4. Ejecuta el test de K6
5. Genera reporte PDF
6. Abre carpeta de reportes

```bash
npm run smoke      # Test de humo (15s)
npm run load       # Test de carga (~9min)
npm run stress     # Test de estres (~7min)
npm run capacity   # Test de capacidad (~7min)
npm run spike      # Test de picos (~5min)
npm run soak       # Test de estabilidad (30min+)
npm run size       # Test de payload
npm run combined   # SOAP + Traffic en paralelo
```

### Por Entorno (dev, staging, prod)

```bash
# Smoke
npm run smoke:dev
npm run smoke:staging
npm run smoke:prod

# Load
npm run load:dev
npm run load:staging
npm run load:prod

# Stress
npm run stress:dev
npm run stress:staging
npm run stress:prod

# Capacity, Spike, Soak...
npm run capacity:dev
npm run spike:staging
npm run soak:dev
```

### Utilidades

```bash
npm start          # Solo inicia Grafana y abre dashboard
npm stop           # Detiene Grafana
npm run clean      # Limpia datos de Grafana
npm run help       # Muestra ayuda
```

## Tipos de Test

### Smoke Test
- **Objetivo**: Verificar funcionalidad basica
- **Duracion**: 15 segundos
- **Carga**: 1 VU
- **Cuando usarlo**: Antes de otros tests, post-deployment, CI/CD

### Load Test
- **Objetivo**: Evaluar rendimiento bajo carga normal
- **Duracion**: ~9 minutos
- **Patron**: Rampa gradual hasta carga objetivo
- **Cuando usarlo**: Establecer baseline, verificar SLAs

### Stress Test
- **Objetivo**: Encontrar punto de ruptura
- **Duracion**: ~7 minutos
- **Patron**: Rampa agresiva hasta fallo
- **Cuando usarlo**: Planificacion de capacidad, encontrar limites

### Capacity Test
- **Objetivo**: Maxima carga sostenible dentro de SLA
- **Duracion**: ~7 minutos
- **Patron**: Incremento gradual con validacion de thresholds
- **Cuando usarlo**: Definir limites operativos

### Spike Test
- **Objetivo**: Comportamiento ante picos de trafico
- **Duracion**: ~5 minutos
- **Patron**: Subida rapida, pico, bajada rapida
- **Cuando usarlo**: Probar auto-scaling, resiliencia

### Soak Test
- **Objetivo**: Estabilidad a largo plazo
- **Duracion**: 30+ minutos
- **Patron**: Carga constante prolongada
- **Cuando usarlo**: Detectar memory leaks, degradacion

### Size Test
- **Objetivo**: Encontrar limite de payload
- **Patron**: Incremento progresivo de tamano
- **Cuando usarlo**: Definir limites de API

## Reportes PDF

Los reportes se generan automaticamente en `reports/pdf/` e incluyen:

- **Executive Summary**: Estado general, metricas clave, health score
- **Metrics Glossary**: Explicacion de P95, P99, RPS, Error Rate, etc.
- **Test Description**: Que hace el test y como interpretar resultados
- **Detailed Results**: Tablas con tiempos de respuesta, errores
- **Interpretation**: Analisis automatico y recomendaciones
- **Technical Details**: Configuracion y metadata

## Grafana Dashboard

Accede al dashboard en tiempo real:
- **URL**: http://localhost:3000
- **Dashboard**: K6 Performance Dashboard

### Metricas Disponibles

| Metrica | Descripcion |
|---------|-------------|
| `http_req_duration` | Tiempo de respuesta |
| `http_req_failed` | Tasa de errores |
| `http_reqs` | Total de requests |
| `vus` | Virtual Users activos |
| `bad_responses` | Respuestas invalidas |
| `http_500/503/504` | Errores HTTP por codigo |
| `timeouts` | Timeouts |
| `success_rate` | Tasa de exito |

## Estructura del Proyecto

```
k6/
├── src/
│   ├── config/           # Configuracion y thresholds
│   ├── builders/         # Constructores de payloads
│   ├── metrics/          # Metricas personalizadas
│   ├── checks/           # Validadores de respuestas
│   ├── clients/          # Clientes HTTP
│   ├── utils/            # Utilidades
│   └── reports/          # Generador de PDFs
│       ├── pdf-generator.js
│       ├── k6-json-parser.js
│       ├── metrics-calculator.js
│       └── templates/
│           ├── glossary.js        # Explicaciones de metricas
│           ├── test-descriptions.js
│           └── styles.js
├── tests/
│   ├── smoke/
│   ├── load/
│   ├── stress/
│   ├── capacity/
│   ├── spike/
│   ├── soak/
│   ├── size/
│   ├── combined/
│   └── traffic-monitoring/
├── scripts/
│   └── run-full-test.js   # Runner principal
├── reports/
│   ├── pdf/               # Reportes PDF generados
│   └── json/              # Salida JSON de K6
├── grafana/
│   ├── dashboards/        # Dashboard de Grafana
│   └── provisioning/      # Configuracion auto
├── config/                # Configs por ambiente
├── data/                  # Templates y fixtures
├── docker-compose.yml     # Grafana + InfluxDB
└── package.json
```

## Configuracion

### Variables de Entorno (.env)

```bash
# Ambiente por defecto
ENVIRONMENT=local

# URLs por ambiente
LOCAL_BASE_URL=https://api.local.example.com
DEV_BASE_URL=https://api.dev.example.com
STAGING_BASE_URL=https://api.staging.example.com

# Thresholds personalizados
SMOKE_THRESHOLD_P95_DURATION=2000
LOAD_THRESHOLD_FAILED_RATE=0.05
```

### Parametros de Test

Modificar en `.env` o pasar via linea de comandos:

```bash
# Ejemplo: aumentar VUs
k6 run -e MAX_VUS=500 tests/load/soap-load.test.js

# Ejemplo: cambiar duracion soak
k6 run -e SOAK_DURATION=60m tests/soak/soap-soak.test.js
```

## Glosario de Metricas

### Percentiles (P50, P90, P95, P99)
Indican que porcentaje de requests completaron en menos tiempo:
- **P95 < 2s**: 95% de usuarios reciben respuesta en menos de 2 segundos

### RPS (Requests Per Second)
Cantidad de solicitudes procesadas por segundo.

### Error Rate
Porcentaje de solicitudes fallidas:
- < 1%: Excelente
- 1-5%: Aceptable
- > 5%: Requiere investigacion

### Thresholds
Limites predefinidos que determinan si el test PASA o FALLA.

## Troubleshooting

### Docker no inicia
```bash
docker-compose down
docker-compose up -d
```

### Grafana no muestra datos
```bash
npm run clean    # Limpia y recrea la base de datos
```

### Test falla pero necesito el PDF
El sistema genera el PDF aunque los thresholds fallen.

## Integracion CI/CD

```yaml
# Ejemplo GitHub Actions
- name: Run Performance Tests
  run: |
    npm install
    npm run smoke -- --skip-grafana --skip-open
```

## Licencia

Uso interno.

## Soporte

Contactar al equipo de Performance Engineering.
