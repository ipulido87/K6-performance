# K6 Performance Testing Framework

Professional performance testing framework for SOAP web services using k6, with Grafana integration and automatic PDF report generation.

## Requirements

- [K6](https://k6.io/docs/getting-started/installation/)
- [Docker](https://www.docker.com/) (for Grafana + InfluxDB)
- [Node.js](https://nodejs.org/) >= 14.0.0

## Installation

```bash
git clone <repository>
cd k6
npm install
```

## Quick Start

Each command automatically:
1. Starts Grafana + InfluxDB
2. Cleans previous data
3. Opens the dashboard in a browser
4. Runs the k6 test
5. Generates a PDF report
6. Opens the reports folder

```bash
npm run smoke      # Smoke test (15s)
npm run load       # Load test (~9min)
npm run stress     # Stress test (~7min)
npm run capacity   # Capacity test (~7min)
npm run spike      # Spike test (~5min)
npm run soak       # Soak test (30min+)
npm run size       # Payload size test
npm run combined   # SOAP + Traffic in parallel
```

### By Environment (dev, staging, prod)

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

### Utilities

```bash
npm start          # Start Grafana and open dashboard
npm stop           # Stop Grafana
npm run clean      # Clean Grafana data
npm run help       # Show help
```

## Test Types

### Smoke Test
- **Goal**: Verify basic functionality
- **Duration**: 15 seconds
- **Load**: 1 VU
- **When to use**: Before other tests, post-deployment, CI/CD

### Load Test
- **Goal**: Evaluate performance under normal load
- **Duration**: ~9 minutes
- **Pattern**: Gradual ramp to target load
- **When to use**: Establish baseline, verify SLAs

### Stress Test
- **Goal**: Find breaking point
- **Duration**: ~7 minutes
- **Pattern**: Aggressive ramp to failure
- **When to use**: Capacity planning, identify limits

### Capacity Test
- **Goal**: Maximum sustainable load within SLA
- **Duration**: ~7 minutes
- **Pattern**: Gradual increase with threshold validation
- **When to use**: Define operating limits

### Spike Test
- **Goal**: Behavior under sudden traffic spikes
- **Duration**: ~5 minutes
- **Pattern**: Rapid rise, spike, rapid fall
- **When to use**: Test auto-scaling, resiliency

### Soak Test
- **Goal**: Long-term stability
- **Duration**: 30+ minutes
- **Pattern**: Prolonged steady load
- **When to use**: Detect memory leaks, gradual degradation

### Size Test
- **Goal**: Find payload size limit
- **Pattern**: Progressive size increase
- **When to use**: Define API limits

## PDF Reports

Reports are generated automatically in `reports/pdf/` and include:

- **Executive Summary**: Overall status, key metrics, health score
- **Metrics Glossary**: Explanation of P95, P99, RPS, Error Rate, etc.
- **Test Description**: What the test does and how to interpret results
- **Detailed Results**: Tables with response times and errors
- **Interpretation**: Automated analysis and recommendations
- **Technical Details**: Configuration and metadata

## Grafana Dashboard

Access the dashboard in real time:
- **URL**: http://localhost:3000
- **Dashboard**: K6 Performance Dashboard

### Available Metrics

| Metric | Description |
|---------|-------------|
| `http_req_duration` | Response time |
| `http_req_failed` | Error rate |
| `http_reqs` | Total requests |
| `vus` | Active virtual users |
| `bad_responses` | Invalid responses |
| `http_500/503/504` | HTTP errors by status code |
| `timeouts` | Timeouts |
| `success_rate` | Success rate |

## Project Structure

```
k6/
|-- src/
|   |-- config/           # Configuration and thresholds
|   |-- builders/         # Payload builders
|   |-- metrics/          # Custom metrics
|   |-- checks/           # Response validators
|   |-- clients/          # HTTP clients
|   |-- utils/            # Utilities
|   `-- reports/          # PDF generator
|       |-- pdf-generator.js
|       |-- k6-json-parser.js
|       |-- metrics-calculator.js
|       `-- templates/
|           |-- glossary.js        # Metric explanations
|           |-- test-descriptions.js
|           `-- styles.js
|-- tests/
|   |-- smoke/
|   |-- load/
|   |-- stress/
|   |-- capacity/
|   |-- spike/
|   |-- soak/
|   |-- size/
|   |-- combined/
|   `-- traffic-monitoring/
|-- scripts/
|   `-- run-full-test.js   # Main runner
|-- reports/
|   |-- pdf/               # Generated PDF reports
|   `-- json/              # k6 JSON output
|-- grafana/
|   |-- dashboards/        # Grafana dashboards
|   `-- provisioning/      # Auto provisioning
|-- config/                # Environment configs
|-- data/                  # Templates and fixtures
|-- docker-compose.yml     # Grafana + InfluxDB
`-- package.json
```

## Configuration

### Environment Variables (.env)

```bash
# Default environment
ENVIRONMENT=local

# URLs per environment
LOCAL_BASE_URL=https://api.local.example.com
DEV_BASE_URL=https://api.dev.example.com
STAGING_BASE_URL=https://api.staging.example.com

# Custom thresholds
SMOKE_THRESHOLD_P95_DURATION=2000
LOAD_THRESHOLD_FAILED_RATE=0.05
```

### Test Parameters

Modify in `.env` or pass via command line:

```bash
# Example: increase VUs
k6 run -e MAX_VUS=500 tests/load/soap-load.test.js

# Example: change soak duration
k6 run -e SOAK_DURATION=60m tests/soak/soap-soak.test.js
```

## Metrics Glossary

### Percentiles (P50, P90, P95, P99)
Indicate what percentage of requests completed under a given time:
- **P95 < 2s**: 95% of users receive a response in under 2 seconds

### RPS (Requests Per Second)
Number of requests processed per second.

### Error Rate
Percentage of failed requests:
- < 1%: Excellent
- 1-5%: Acceptable
- > 5%: Needs investigation

### Thresholds
Predefined limits that determine whether the test PASSES or FAILS.

## Troubleshooting

### Docker will not start
```bash
docker-compose down
docker-compose up -d
```

### Grafana shows no data
```bash
npm run clean    # Clean and recreate the database
```

### Test fails but I need the PDF
The system generates the PDF even if thresholds fail.

## CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run Performance Tests
  run: |
    npm install
    npm run smoke -- --skip-grafana --skip-open
```

## License

Internal use.

## Support

Contact the Performance Engineering team.
