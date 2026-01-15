# Guía de Parametrización - Framework k6

## Descripción

Este framework utiliza variables de entorno para parametrizar todas las configuraciones, permitiendo fácil adaptación a diferentes ambientes y casos de uso sin modificar el código.

---

## Archivo de Configuración

### Ubicación

El archivo principal de configuración es `.env` en la raíz del proyecto.

### Primeros Pasos

1. **Copiar el archivo de ejemplo**:
   ```bash
   cp .env.example .env
   ```

2. **Editar el archivo `.env`** con tus valores:
   ```bash
   # En Windows
   notepad .env

   # O con tu editor favorito
   code .env
   ```

3. **No subir el `.env` al repositorio**:
   - El archivo `.env` está en `.gitignore`
   - Solo se sube `.env.example` como plantilla
   - Cada desarrollador tiene su propio `.env`

---

## Variables Disponibles

### 1. Configuración de Ambientes

Cada ambiente (local, dev, staging, prod) tiene 3 variables:

```bash
# Ejemplo para LOCAL
LOCAL_BASE_URL=https://efca-m3.altia-dev.es
LOCAL_PATH=/DET-WS
LOCAL_TIMEOUT=60s
```

#### Variables por Ambiente:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{ENV}_BASE_URL` | URL base del servidor | `https://api.example.com` |
| `{ENV}_PATH` | Path del endpoint | `/api/v1/service` |
| `{ENV}_TIMEOUT` | Timeout de peticiones | `60s`, `120s` |

Donde `{ENV}` puede ser: `LOCAL`, `DEV`, `STAGING`, `PROD`

### 2. Configuración de Pruebas

#### Smoke Test
```bash
SMOKE_DURATION=15s      # Duración total
SMOKE_VUS=1             # Usuarios virtuales
```

#### Load Test
```bash
LOAD_DURATION=9m        # Duración total
LOAD_MAX_VUS=200        # Máximo de usuarios virtuales
LOAD_TARGET_RPS=10      # Peticiones por segundo objetivo
```

#### Stress Test
```bash
STRESS_DURATION=7m      # Duración total
STRESS_MAX_VUS=300      # Máximo de usuarios virtuales
STRESS_START_RPS=5      # Peticiones por segundo iniciales
```

#### Capacity Test
```bash
CAPACITY_DURATION=7m    # Duración total
CAPACITY_MAX_VUS=200    # Máximo de usuarios virtuales
CAPACITY_START_RPS=8    # Peticiones por segundo iniciales
```

#### Spike Test
```bash
SPIKE_DURATION=5m       # Duración total
SPIKE_MAX_VUS=500       # Máximo de usuarios virtuales en el pico
```

#### Soak Test
```bash
SOAK_DURATION=30m       # Duración total (prueba de resistencia)
SOAK_VUS=20             # Usuarios virtuales constantes
```

#### Size Test
```bash
SIZE_START_MB=0.01      # Tamaño inicial del payload (MB)
SIZE_MAX_MB=100         # Tamaño máximo del payload (MB)
SIZE_STEP_MB=5          # Incremento del tamaño (MB)
```

### 3. Thresholds (Límites de Aceptación)

```bash
# Duración de peticiones HTTP (milisegundos)
THRESHOLD_P95_DURATION=2000   # Percentil 95 < 2s
THRESHOLD_P99_DURATION=3000   # Percentil 99 < 3s

# Tasa de fallos (0.01 = 1%)
THRESHOLD_FAILED_RATE=0.01    # < 1% de peticiones fallidas
```

### 4. Configuración de Reportes

```bash
REPORTS_DIR=reports
JSON_DIR=reports/json
ALLURE_RESULTS_DIR=reports/allure-results
ALLURE_REPORT_DIR=reports/allure-report
```

---

## Ejemplos de Uso

### Ejemplo 1: Cambiar URL del servidor local

Edita tu archivo `.env`:

```bash
# Cambiar de:
LOCAL_BASE_URL=https://efca-m3.altia-dev.es

# A:
LOCAL_BASE_URL=https://mi-servidor-local.com
LOCAL_PATH=/mi-api/v2
```

Ejecuta el test:
```bash
npm run test:smoke
```

### Ejemplo 2: Probar contra diferentes ambientes

Ya están preconfigurados los comandos:

```bash
# Test en DEV
npm run test:smoke:dev

# Test en STAGING
npm run test:smoke:staging

# Test en PROD
npm run test:smoke:prod
```

### Ejemplo 3: Ajustar intensidad de Load Test

Edita tu archivo `.env`:

```bash
# Para una prueba más ligera
LOAD_MAX_VUS=50
LOAD_TARGET_RPS=5

# Para una prueba más intensa
LOAD_MAX_VUS=500
LOAD_TARGET_RPS=50
```

Ejecuta:
```bash
npm run test:load
```

### Ejemplo 4: Ajustar thresholds más estrictos

Edita tu archivo `.env`:

```bash
# Más estricto
THRESHOLD_P95_DURATION=1000   # 1 segundo
THRESHOLD_P99_DURATION=2000   # 2 segundos
THRESHOLD_FAILED_RATE=0.001   # 0.1% de fallos
```

### Ejemplo 5: Configurar múltiples ambientes

Puedes crear archivos `.env` adicionales:

```bash
# .env.local - Para desarrollo local
# .env.qa - Para QA
# .env.production - Para producción
```

Y usar el que necesites:
```bash
# Copiar el ambiente que necesitas
cp .env.qa .env
npm run test:smoke
```

---

## Estructura de Archivos

```
k6/
├── .env                          # TU configuración (no subir a git)
├── .env.example                  # Plantilla de configuración
├── .gitignore                    # Incluye *.env para no subirlo
├── src/
│   └── config/
│       ├── env-loader.js         # Carga variables del .env
│       ├── environments.js       # Usa las variables cargadas
│       └── thresholds.js         # Puede usar variables también
└── tests/
    └── ...                       # Tests que usan la configuración
```

---

## Buenas Prácticas

### ✅ DO (Hacer)

1. **Usar `.env` para configuración local**
   ```bash
   cp .env.example .env
   # Editar con tus valores
   ```

2. **Documentar nuevas variables en `.env.example`**
   - Si añades una variable, actualiza el ejemplo
   - Incluye comentarios explicativos

3. **Valores por defecto razonables**
   - El código debe funcionar sin `.env`
   - Los valores por defecto deben ser seguros

4. **Nombres descriptivos y consistentes**
   ```bash
   # Bueno
   DEV_BASE_URL=https://api-dev.example.com
   DEV_TIMEOUT=60s

   # Malo
   URL1=https://api-dev.example.com
   T=60s
   ```

### ❌ DON'T (No Hacer)

1. **No subir `.env` al repositorio**
   - Contiene información sensible
   - Cada desarrollador tiene su config

2. **No hardcodear valores en el código**
   ```javascript
   // ❌ Malo
   const url = "https://api.example.com";

   // ✅ Bueno
   const url = getEnv('API_URL', 'https://api.example.com');
   ```

3. **No usar valores hardcoded en tests**
   ```javascript
   // ❌ Malo
   export const options = {
     duration: '10m',
     vus: 100,
   };

   // ✅ Bueno
   export const options = {
     duration: getEnv('LOAD_DURATION', '10m'),
     vus: getEnvNumber('LOAD_MAX_VUS', 100),
   };
   ```

---

## Solución de Problemas

### El test no toma mis variables

**Problema**: Cambié el `.env` pero el test usa los valores anteriores.

**Solución**: k6 carga el archivo al inicio. Si modificas el `.env`, debes volver a ejecutar el test.

### Variables no definidas

**Problema**: Error "undefined" al acceder a una variable.

**Solución**:
1. Verifica que el nombre de la variable sea correcto
2. Asegúrate de usar `getEnv()` con valor por defecto:
   ```javascript
   getEnv('MI_VARIABLE', 'valor-por-defecto')
   ```

### El `.env` no se lee

**Problema**: Las variables siempre usan los valores por defecto.

**Solución**:
1. Verifica que el archivo se llame exactamente `.env` (con el punto)
2. Verifica que esté en la raíz del proyecto
3. Verifica el formato: `VARIABLE=valor` (sin espacios alrededor del `=`)

---

## Migrar Configuración Hardcoded

Si tienes valores hardcoded y quieres parametrizarlos:

### Paso 1: Identificar valores a parametrizar

Busca valores hardcoded:
```javascript
const timeout = "60s";
const maxVus = 200;
```

### Paso 2: Agregar variables al `.env.example`

```bash
# Agregar al .env.example
TEST_TIMEOUT=60s
TEST_MAX_VUS=200
```

### Paso 3: Usar `getEnv()` en el código

```javascript
import { getEnv, getEnvNumber } from './config/env-loader.js';

const timeout = getEnv('TEST_TIMEOUT', '60s');
const maxVus = getEnvNumber('TEST_MAX_VUS', 200);
```

---

## Referencia Rápida

### Funciones Disponibles

```javascript
import { getEnv, getEnvNumber, getEnvBoolean } from './config/env-loader.js';

// Obtener string
const url = getEnv('API_URL', 'https://default.com');

// Obtener número
const vus = getEnvNumber('MAX_VUS', 100);

// Obtener booleano
const debug = getEnvBoolean('DEBUG_MODE', false);
```

### Comandos Útiles

```bash
# Ver el contenido de .env
cat .env

# Editar .env
code .env
notepad .env

# Copiar ejemplo
cp .env.example .env

# Validar que no esté en git
git status .env  # No debe aparecer
```

---

## Soporte

Para más información sobre configuración:
- Ver [GUIA-COMANDOS.md](../GUIA-COMANDOS.md) para comandos disponibles
- Ver [README.md](../README.md) para documentación general
- Ejecutar `npm run help` para ayuda rápida
