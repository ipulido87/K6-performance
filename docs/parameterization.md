# Parameterization Guide - k6 Framework

## Description

This framework uses environment variables to parameterize all configuration, enabling easy adaptation to different environments and use cases without changing code.

---

## Configuration File

### Location

The main configuration file is `.env` at the project root.

### Getting Started

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your values:
   ```bash
   # On Windows
   notepad .env

   # Or with your favorite editor
   code .env
   ```

3. **Do not commit `.env` to the repository**:
   - The `.env` file is in `.gitignore`
   - Only `.env.example` is committed as a template
   - Each developer has their own `.env`

---

## Available Variables

### 1. Environment Configuration

Each environment (local, dev, staging, prod) has 3 variables:

```bash
# Example for LOCAL
LOCAL_BASE_URL=https://efca-m3.altia-dev.es
LOCAL_PATH=/DET-WS
LOCAL_TIMEOUT=60s
```

#### Variables per Environment

| Variable | Description | Example |
|----------|-------------|---------|
| `{ENV}_BASE_URL` | Server base URL | `https://api.example.com` |
| `{ENV}_PATH` | Endpoint path | `/api/v1/service` |
| `{ENV}_TIMEOUT` | Request timeout | `60s`, `120s` |

Where `{ENV}` can be: `LOCAL`, `DEV`, `STAGING`, `PROD`

### 2. Test Configuration

#### Smoke Test
```bash
SMOKE_DURATION=15s      # Total duration
SMOKE_VUS=1             # Virtual users
```

#### Load Test
```bash
LOAD_DURATION=9m        # Total duration
LOAD_MAX_VUS=200        # Maximum virtual users
LOAD_TARGET_RPS=10      # Target requests per second
```

#### Stress Test
```bash
STRESS_DURATION=7m      # Total duration
STRESS_MAX_VUS=300      # Maximum virtual users
STRESS_START_RPS=5      # Initial requests per second
```

#### Capacity Test
```bash
CAPACITY_DURATION=7m    # Total duration
CAPACITY_MAX_VUS=200    # Maximum virtual users
CAPACITY_START_RPS=8    # Initial requests per second
```

#### Spike Test
```bash
SPIKE_DURATION=5m       # Total duration
SPIKE_MAX_VUS=500       # Maximum virtual users at the spike
```

#### Soak Test
```bash
SOAK_DURATION=30m       # Total duration (endurance test)
SOAK_VUS=20             # Steady virtual users
```

#### Size Test
```bash
SIZE_START_MB=0.01      # Initial payload size (MB)
SIZE_MAX_MB=100         # Maximum payload size (MB)
SIZE_STEP_MB=5          # Size increment (MB)
```

### 3. Thresholds (Acceptance Limits)

```bash
# HTTP request duration (milliseconds)
THRESHOLD_P95_DURATION=2000   # 95th percentile < 2s
THRESHOLD_P99_DURATION=3000   # 99th percentile < 3s

# Failure rate (0.01 = 1%)
THRESHOLD_FAILED_RATE=0.01    # < 1% failed requests
```

### 4. Report Configuration

```bash
REPORTS_DIR=reports
JSON_DIR=reports/json
ALLURE_RESULTS_DIR=reports/allure-results
ALLURE_REPORT_DIR=reports/allure-report
```

---

## Usage Examples

### Example 1: Change local server URL

Edit your `.env` file:

```bash
# Change from:
LOCAL_BASE_URL=https://efca-m3.altia-dev.es

# To:
LOCAL_BASE_URL=https://my-local-server.com
LOCAL_PATH=/my-api/v2
```

Run the test:
```bash
npm run test:smoke
```

### Example 2: Test against different environments

These commands are preconfigured:

```bash
# Test on DEV
npm run test:smoke:dev

# Test on STAGING
npm run test:smoke:staging

# Test on PROD
npm run test:smoke:prod
```

### Example 3: Adjust Load Test intensity

Edit your `.env` file:

```bash
# For a lighter test
LOAD_MAX_VUS=50
LOAD_TARGET_RPS=5

# For a more intense test
LOAD_MAX_VUS=500
LOAD_TARGET_RPS=50
```

Run:
```bash
npm run test:load
```

### Example 4: Use stricter thresholds

Edit your `.env` file:

```bash
# Stricter
THRESHOLD_P95_DURATION=1000   # 1 second
THRESHOLD_P99_DURATION=2000   # 2 seconds
THRESHOLD_FAILED_RATE=0.001   # 0.1% failures
```

### Example 5: Configure multiple environments

You can create additional `.env` files:

```bash
# .env.local - For local development
# .env.qa - For QA
# .env.production - For production
```

And use the one you need:
```bash
# Copy the environment you need
cp .env.qa .env
npm run test:smoke
```

---

## File Structure

```
k6/
|-- .env                          # Your configuration (do not commit)
|-- .env.example                  # Configuration template
|-- .gitignore                    # Includes *.env to keep it out of git
|-- src/
|   `-- config/
|       |-- env-loader.js         # Loads variables from .env
|       |-- environments.js       # Uses loaded variables
|       `-- thresholds.js         # Can use variables as well
`-- tests/
    `-- ...                       # Tests that use the configuration
```

---

## Best Practices

### DO (Recommended)

1. **Use `.env` for local configuration**
   ```bash
   cp .env.example .env
   # Edit with your values
   ```

2. **Document new variables in `.env.example`**
   - If you add a variable, update the example
   - Include explanatory comments

3. **Reasonable defaults**
   - The code should work without `.env`
   - Default values should be safe

4. **Descriptive and consistent names**
   ```bash
   # Good
   DEV_BASE_URL=https://api-dev.example.com
   DEV_TIMEOUT=60s

   # Bad
   URL1=https://api-dev.example.com
   T=60s
   ```

### DON'T (Avoid)

1. **Do not commit `.env` to the repository**
   - It contains sensitive information
   - Each developer has their own config

2. **Do not hardcode values in code**
   ```javascript
   // Bad
   const url = "https://api.example.com";

   // Good
   const url = getEnv('API_URL', 'https://api.example.com');
   ```

3. **Do not hardcode values in tests**
   ```javascript
   // Bad
   export const options = {
     duration: '10m',
     vus: 100,
   };

   // Good
   export const options = {
     duration: getEnv('LOAD_DURATION', '10m'),
     vus: getEnvNumber('LOAD_MAX_VUS', 100),
   };
   ```

---

## Troubleshooting

### The test does not use my variables

**Problem**: I changed `.env` but the test is still using the old values.

**Solution**: k6 loads the file at startup. If you change `.env`, you must rerun the test.

### Variables are undefined

**Problem**: "undefined" error when accessing a variable.

**Solution**:
1. Verify the variable name is correct
2. Make sure you use `getEnv()` with a default value:
   ```javascript
   getEnv('MY_VARIABLE', 'default-value')
   ```

### The `.env` file is not read

**Problem**: Variables always use default values.

**Solution**:
1. Verify the file is named exactly `.env` (including the dot)
2. Verify it is in the project root
3. Verify the format: `VARIABLE=value` (no spaces around `=`)

---

## Migrate Hardcoded Configuration

If you have hardcoded values and want to parameterize them:

### Step 1: Identify values to parameterize

Search for hardcoded values:
```javascript
const timeout = "60s";
const maxVus = 200;
```

### Step 2: Add variables to `.env.example`

```bash
# Add to .env.example
TEST_TIMEOUT=60s
TEST_MAX_VUS=200
```

### Step 3: Use `getEnv()` in code

```javascript
import { getEnv, getEnvNumber } from './config/env-loader.js';

const timeout = getEnv('TEST_TIMEOUT', '60s');
const maxVus = getEnvNumber('TEST_MAX_VUS', 200);
```

---

## Quick Reference

### Available Functions

```javascript
import { getEnv, getEnvNumber, getEnvBoolean } from './config/env-loader.js';

// Get string
const url = getEnv('API_URL', 'https://default.com');

// Get number
const vus = getEnvNumber('MAX_VUS', 100);

// Get boolean
const debug = getEnvBoolean('DEBUG_MODE', false);
```

### Useful Commands

```bash
# View .env contents
cat .env

# Edit .env
code .env
notepad .env

# Copy example
cp .env.example .env

# Validate it is not in git
git status .env  # Should not appear
```

---

## Support

For more information about configuration:
- See [README.md](../README.md) for general documentation
- Run `npm run help` for quick help
