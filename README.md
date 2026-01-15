# k6 Performance Testing Framework

Professional-grade performance testing framework for SOAP web services using k6.

## Features

- **Modular Architecture**: Reusable components for builders, metrics, checks, and utilities
- **Multi-Environment Support**: Easy configuration for local, dev, staging, and production
- **Comprehensive Test Types**: Smoke, Load, Stress, Spike, Soak, and Size tests
- **Advanced Metrics**: Custom metrics with detailed error categorization
- **Structured Logging**: JSON-formatted logs for integration with monitoring tools
- **Type-Safe Configuration**: Validation and type checking for all parameters

## Project Structure

```
k6/
├── src/                      # Framework source code
│   ├── config/              # Configuration management
│   ├── utils/               # Utility functions
│   ├── builders/            # Payload builders
│   ├── metrics/             # Custom metrics
│   └── checks/              # Response validators
├── tests/                   # Test scripts
│   ├── smoke/              # Smoke tests
│   ├── load/               # Load tests
│   ├── stress/             # Stress tests
│   ├── spike/              # Spike tests
│   ├── soak/               # Soak tests
│   └── size/               # Size tests
├── config/                  # Environment configurations
├── data/                    # Test data and templates
└── reports/                 # Test reports output
```

## Quick Start

### Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed
- Node.js (optional, for npm scripts)

### Installation

```bash
git clone <repository>
cd k6
```

### Running Tests

#### Smoke Test (Basic Functionality)
```bash
k6 run tests/smoke/soap-smoke.test.js
```

#### Load Test (Sustained Load)
```bash
k6 run tests/load/soap-load.test.js
```

#### Stress Test (Find Breaking Point)
```bash
k6 run tests/stress/soap-stress.test.js
```

#### Spike Test (Sudden Traffic Burst)
```bash
k6 run tests/spike/soap-spike.test.js
```

#### Soak Test (Long Duration Stability)
```bash
k6 run tests/soak/soap-soak.test.js
```

#### Size Test (Maximum Payload Size)
```bash
k6 run tests/size/soap-size.test.js
```

## Configuration

### Environment Selection

Use the `ENVIRONMENT` variable to select configuration:

```bash
k6 run -e ENVIRONMENT=dev tests/load/soap-load.test.js
k6 run -e ENVIRONMENT=staging tests/load/soap-load.test.js
k6 run -e ENVIRONMENT=prod tests/load/soap-load.test.js
```

### Environment Files

Edit configuration files in `config/` directory:
- `config/local.json` - Local development
- `config/dev.json` - Development environment
- `config/staging.json` - Staging environment
- `config/prod.json` - Production environment

### Test Parameters

Each test accepts various environment variables for customization:

#### Common Parameters

```bash
# Activities count
k6 run -e ACTIVITIES=5 tests/load/soap-load.test.js

# Target payload size
k6 run -e SIZE_MB=10 tests/load/soap-load.test.js

# Virtual Users
k6 run -e PRE_VUS=50 -e MAX_VUS=300 tests/load/soap-load.test.js

# Logging frequency
k6 run -e LOG_EVERY_BAD=100 tests/load/soap-load.test.js
```

#### Load Test Parameters

```bash
k6 run -e PRE_VUS=30 -e MAX_VUS=200 tests/load/soap-load.test.js
```

#### Stress Test Parameters

```bash
k6 run -e START_RPS=5 -e MAX_VUS=500 tests/stress/soap-stress.test.js
```

#### Size Test Parameters

```bash
# Test from 0.5MB to 128MB (doubling)
k6 run -e START_MB=0.5 -e MAX_MB=128 tests/size/soap-size.test.js

# Test with incremental steps
k6 run -e STEP_MODE=add -e ADD_MB=5 -e START_MB=1 -e MAX_MB=50 tests/size/soap-size.test.js
```

#### Soak Test Parameters

```bash
# 1-hour soak test
k6 run -e SOAK_DURATION=60m -e SOAK_VUS=20 tests/soak/soap-soak.test.js
```

## Test Types Explained

### 1. Smoke Test
- **Purpose**: Verify basic functionality
- **Duration**: 15 seconds
- **Load**: Minimal (1 VU)
- **Use When**: Before running larger tests, CI/CD pipeline

### 2. Load Test
- **Purpose**: Test sustained load
- **Duration**: ~9 minutes
- **Pattern**: Gradual ramp-up
- **Use When**: Understanding normal capacity

### 3. Stress Test
- **Purpose**: Find breaking point
- **Duration**: ~7 minutes
- **Pattern**: Aggressive ramp-up
- **Use When**: Capacity planning, finding limits

### 4. Spike Test
- **Purpose**: Test sudden traffic spikes
- **Duration**: ~5 minutes
- **Pattern**: Rapid increase/decrease
- **Use When**: Testing auto-scaling, burst capacity

### 5. Soak Test
- **Purpose**: Long-term stability
- **Duration**: 30+ minutes
- **Pattern**: Constant load
- **Use When**: Finding memory leaks, resource exhaustion

### 6. Size Test
- **Purpose**: Find max payload size
- **Duration**: Variable
- **Pattern**: Sequential size increases
- **Use When**: Understanding payload limits

## Output and Reporting

### Console Output

All tests provide structured JSON logs:

```json
{
  "timestamp": "2026-01-14T10:00:00.000Z",
  "level": "INFO",
  "message": "Starting load test",
  "test": "load-test",
  "environment": "dev"
}
```

### Metrics

Custom metrics tracked:
- `bad_responses` - Failed request count
- `http_500`, `http_503`, `http_504` - HTTP error counts
- `rejected_semaphore` - Semaphore rejection count
- `shortcircuit` - Circuit breaker count
- `payload_bytes` - Request payload sizes
- `success_rate` - Success rate percentage

### Reports

Generate HTML reports (requires k6-reporter):

```bash
k6 run --out json=reports/json/results.json tests/load/soap-load.test.js
```

## Advanced Usage

### Custom Thresholds

Thresholds are centralized in [src/config/thresholds.js](src/config/thresholds.js). Modify as needed:

```javascript
export const loadThresholds = {
  http_req_failed: ["rate<0.10"],
  http_req_duration: ["p(95)<10000"],
};
```

### Custom Metrics

Add new metrics in [src/metrics/custom-metrics.js](src/metrics/custom-metrics.js):

```javascript
export function createSoapMetrics() {
  return {
    // Add your custom metrics
    myCustomMetric: new Counter("my_custom_metric"),
  };
}
```

### Extending Tests

Create new test types by copying existing templates and modifying:

1. Copy a test file from `tests/` directory
2. Adjust test parameters and stages
3. Update thresholds if needed
4. Run and validate

## CI/CD Integration

### Jenkins

El framework incluye un `Jenkinsfile` completo para integración con Jenkins.

**Configuración rápida:**
1. Crear Pipeline Job en Jenkins
2. Apuntar al `Jenkinsfile` en el repositorio
3. Ejecutar con parámetros

**Documentación completa:** Ver [jenkins/README.md](jenkins/README.md)

**Ejemplo de ejecución:**
```groovy
// Build with parameters
TEST_TYPE=smoke
ENVIRONMENT=dev
MAX_VUS=200
```

## Best Practices

1. **Always run smoke tests first** before larger test suites
2. **Start with low VU counts** and gradually increase
3. **Monitor server resources** during tests
4. **Use appropriate test types** for specific scenarios
5. **Run soak tests off-peak** to avoid production impact
6. **Document test results** and trends over time
7. **Set realistic thresholds** based on SLAs

## Troubleshooting

### Common Issues

**Test fails immediately**
- Check environment configuration in `config/` files
- Verify service URL is accessible
- Run smoke test first

**High error rates**
- Reduce VU count or arrival rate
- Check service logs for errors
- Verify payload sizes are within limits

**Timeouts**
- Increase timeout in config
- Check network connectivity
- Reduce payload size

## Contributing

To extend this framework:

1. Add new utilities in `src/utils/`
2. Create new builders in `src/builders/`
3. Define new metrics in `src/metrics/`
4. Add new test types in `tests/`

## License

Internal use only.

## Support

For issues or questions, contact the performance engineering team.
