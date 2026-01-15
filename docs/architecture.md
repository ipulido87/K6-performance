# Architecture Documentation

## Overview

This k6 framework follows a modular, enterprise-grade architecture designed for scalability, maintainability, and reusability.

## Design Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **DRY (Don't Repeat Yourself)**: Common functionality extracted into reusable modules
3. **Configuration Over Code**: Behavior driven by configuration files
4. **Testability**: Small, focused modules that are easy to test
5. **Extensibility**: Easy to add new test types and functionality

## Module Architecture

### 1. Configuration Layer (`src/config/`)

**Purpose**: Centralized configuration management

**Components**:
- `environments.js` - Environment-specific settings (dev, staging, prod)
- `thresholds.js` - Performance SLOs and thresholds
- `index.js` - Configuration loader with validation

**Key Features**:
- Multi-environment support
- Configuration validation
- Defaults with overrides
- Type-safe configuration access

**Usage**:
```javascript
import { loadConfig, getThresholds } from "../../src/config/index.js";

const config = loadConfig();
const url = config.get("url");
const thresholds = getThresholds("load");
```

### 2. Utilities Layer (`src/utils/`)

**Purpose**: Common utility functions used across all tests

**Components**:
- `files.js` - File loading and JSON parsing
- `formatters.js` - Size conversions and string formatting
- `logger.js` - Structured logging
- `validators.js` - Configuration and parameter validation

**Key Features**:
- Cross-platform file handling
- Structured JSON logging
- Type validation
- Error handling

**Usage**:
```javascript
import { createLogger, toMB, validateEnvNumber } from "../../src/utils/index.js";

const logger = createLogger("my-test");
logger.info("Test started", { foo: "bar" });
```

### 3. Builders Layer (`src/builders/`)

**Purpose**: Construct test payloads dynamically

**Components**:
- `soap-builder.js` - SOAP message builder with size control

**Key Features**:
- Template-based construction
- Dynamic GUID generation
- Size-controlled payload building
- Activity repetition

**Usage**:
```javascript
import { createSoapBuilder } from "../../src/builders/index.js";

const builder = createSoapBuilder(config.getAll());
const message = builder.buildWithTargetSize(10); // 10 MB
```

### 4. Metrics Layer (`src/metrics/`)

**Purpose**: Custom metrics tracking and recording

**Components**:
- `custom-metrics.js` - Metric definitions and manager

**Key Features**:
- Predefined metric sets
- Metrics manager for easy recording
- Error categorization
- Success rate tracking

**Usage**:
```javascript
import { createMetricsManager } from "../../src/metrics/index.js";

const metrics = createMetricsManager();
metrics.recordSuccess(response);
metrics.recordBadResponse(response, { errorMessage: "timeout" });
```

### 5. Checks Layer (`src/checks/`)

**Purpose**: Response validation and checking

**Components**:
- `http-checks.js` - HTTP status validation
- `soap-checks.js` - SOAP-specific validation

**Key Features**:
- Reusable check functions
- Comprehensive validation
- Error detection and categorization
- k6 check integration

**Usage**:
```javascript
import { runSoapChecks, validateSoapResponse } from "../../src/checks/index.js";

const checkResult = runSoapChecks(response, { name: "Load Test" });
const validation = validateSoapResponse(response);
```

### 6. Tests Layer (`tests/`)

**Purpose**: Executable test scripts

**Structure**:
```
tests/
├── smoke/     # Basic functionality tests
├── load/      # Sustained load tests
├── stress/    # Breaking point tests
├── spike/     # Traffic burst tests
├── soak/      # Long-duration stability tests
└── size/      # Payload size limit tests
```

**Key Features**:
- Self-contained test scripts
- Environment-driven parameters
- Consistent structure
- Comprehensive logging

## Data Flow

```
1. Test Script Initialization
   ├─> Load Configuration (multi-env)
   ├─> Initialize Builder (templates)
   ├─> Initialize Metrics
   └─> Create Logger

2. Test Execution Loop
   ├─> Build Payload (dynamic)
   ├─> Make HTTP Request
   ├─> Validate Response (checks)
   ├─> Record Metrics
   └─> Log Results (structured)

3. Test Teardown
   └─> Summary Logging
```

## Configuration Hierarchy

```
1. Default Environment Config (src/config/environments.js)
   ↓
2. Environment JSON File (config/{env}.json)
   ↓
3. Environment Variables (__ENV)
   ↓
4. Test Script Parameters
```

Higher levels override lower levels.

## Extension Points

### Adding New Test Types

1. Create new test file in appropriate `tests/` directory
2. Import framework modules
3. Define test options and scenarios
4. Implement test logic using builders and checks
5. Add thresholds if needed

### Adding New Metrics

1. Define metric in `src/metrics/custom-metrics.js`
2. Add recording methods to `MetricsManager`
3. Use in test scripts

### Adding New Environments

1. Create new JSON file in `config/`
2. Add environment definition in `src/config/environments.js`
3. Run tests with `-e ENVIRONMENT=new-env`

### Adding New Payload Types

1. Create new builder in `src/builders/`
2. Implement builder class with template handling
3. Export from `src/builders/index.js`
4. Use in test scripts

## Performance Considerations

1. **Template Loading**: Templates loaded once during initialization
2. **Metric Recording**: Lightweight counters and trends
3. **Logging**: Conditional logging with configurable frequency
4. **Memory**: Efficient string building and reuse
5. **CPU**: Minimal processing in hot path

## Security Considerations

1. **Configuration Files**: Never commit sensitive data (use .gitignore)
2. **Logging**: Avoid logging sensitive payload data
3. **Environment Variables**: Use for secrets and credentials
4. **URL Validation**: All URLs validated before use

## Testing Strategy

### Test Progression

1. **Smoke** → Basic functionality
2. **Load** → Normal capacity
3. **Stress** → Breaking point
4. **Spike** → Burst handling
5. **Soak** → Stability over time
6. **Size** → Payload limits

### Threshold Philosophy

- **Smoke**: Very strict (< 1% error)
- **Load**: Moderate (< 10% error)
- **Stress**: Finding limits (< 5% error)
- **Spike**: Expect some failures (< 15% error)
- **Soak**: Stability focus (< 5% error)
- **Size**: Finding boundaries (< 20% error)

## Dependencies

### External Dependencies

- `k6` - Test execution engine
- `k6/http` - HTTP client
- `k6/metrics` - Metrics API
- `k6-utils` - UUID generation

### Internal Dependencies

All internal modules are self-contained with clear interfaces.

## Future Enhancements

1. **Scenarios Library**: Pre-built scenario configurations
2. **Data Generators**: Advanced test data generation
3. **Report Templates**: HTML report generation
4. **CI/CD Templates**: Ready-to-use pipeline configs
5. **Monitoring Integration**: Grafana/Datadog dashboards
6. **Distributed Testing**: Multi-node execution support
