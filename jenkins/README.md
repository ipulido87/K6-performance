# Jenkins Integration

## Configuración de Jenkins para k6 Performance Testing

### Requisitos Previos

1. **Jenkins** instalado y corriendo
2. **k6** instalado en el agente de Jenkins
3. **Plugins necesarios:**
   - Pipeline Plugin
   - Git Plugin
   - HTML Publisher Plugin (para reportes)
   - Parameterized Trigger Plugin (opcional)

### Instalación de k6 en Jenkins Agent

#### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
    sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Windows
```powershell
choco install k6
```

#### Docker Agent
```dockerfile
FROM jenkins/inbound-agent:latest
USER root
RUN apt-get update && \
    apt-get install -y gnupg2 && \
    gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && \
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
    tee /etc/apt/sources.list.d/k6.list && \
    apt-get update && \
    apt-get install -y k6
USER jenkins
```

## Crear Job en Jenkins

### Opción 1: Pipeline Job (Recomendado)

1. **New Item** → **Pipeline**
2. Nombre: `k6-performance-tests`
3. En **Pipeline** section:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `<tu-repo-url>`
   - Script Path: `Jenkinsfile`

### Opción 2: Multibranch Pipeline

1. **New Item** → **Multibranch Pipeline**
2. Nombre: `k6-performance-tests`
3. Configurar **Branch Sources** con tu repositorio

## Parámetros del Job

El Jenkinsfile acepta los siguientes parámetros:

| Parámetro | Valores | Default | Descripción |
|-----------|---------|---------|-------------|
| `TEST_TYPE` | smoke, load, stress, spike, soak, size | smoke | Tipo de test |
| `ENVIRONMENT` | local, dev, staging, prod | local | Entorno |
| `MAX_VUS` | número | 200 | Usuarios virtuales máximos |
| `ACTIVITIES` | número | 1 | Actividades en payload |
| `SIZE_MB` | número | 0 | Tamaño payload (0=dinámico) |

## Ejecución Manual

### Desde Jenkins UI

1. Ir al job `k6-performance-tests`
2. Click en **Build with Parameters**
3. Seleccionar parámetros deseados
4. Click en **Build**

### Desde Jenkins CLI

```bash
# Smoke test en dev
java -jar jenkins-cli.jar -s http://jenkins-url/ build k6-performance-tests \
    -p TEST_TYPE=smoke \
    -p ENVIRONMENT=dev

# Load test en staging con 300 VUs
java -jar jenkins-cli.jar -s http://jenkins-url/ build k6-performance-tests \
    -p TEST_TYPE=load \
    -p ENVIRONMENT=staging \
    -p MAX_VUS=300
```

## Ejecución Programada

### Tests Diarios (Smoke)

En la configuración del job, añadir en **Build Triggers**:

```
# Smoke test todos los días a las 6 AM
H 6 * * *
```

### Tests Semanales (Load + Stress)

Crear un Pipeline programado:

```groovy
pipeline {
    agent any
    triggers {
        // Lunes a las 2 AM
        cron('0 2 * * 1')
    }
    stages {
        stage('Smoke Test') {
            steps {
                build job: 'k6-performance-tests',
                      parameters: [
                          string(name: 'TEST_TYPE', value: 'smoke'),
                          string(name: 'ENVIRONMENT', value: 'staging')
                      ]
            }
        }
        stage('Load Test') {
            steps {
                build job: 'k6-performance-tests',
                      parameters: [
                          string(name: 'TEST_TYPE', value: 'load'),
                          string(name: 'ENVIRONMENT', value: 'staging')
                      ]
            }
        }
        stage('Stress Test') {
            steps {
                build job: 'k6-performance-tests',
                      parameters: [
                          string(name: 'TEST_TYPE', value: 'stress'),
                          string(name: 'ENVIRONMENT', value: 'staging')
                      ]
            }
        }
    }
}
```

## Integración con Pipeline de Despliegue

### Post-Deploy Performance Test

```groovy
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                // Tu código de despliegue aquí
                echo "Deploying application..."
            }
        }
        stage('Performance Test') {
            steps {
                // Ejecutar smoke test después del deploy
                build job: 'k6-performance-tests',
                      wait: true,
                      parameters: [
                          string(name: 'TEST_TYPE', value: 'smoke'),
                          string(name: 'ENVIRONMENT', value: 'staging')
                      ]
            }
        }
    }
}
```

## Reportes

### Visualizar Reportes en Jenkins

Los reportes se publican automáticamente en:
- **Artifacts**: JSON raw results
- **HTML Publisher**: Reportes HTML visuales
- **Allure Reports**: Reportes interactivos (recomendado)

Para acceder:
1. Ir al build específico
2. Click en **k6 Performance Report** en el menú lateral

### Allure Reports (Recomendado)

#### Instalación de Allure en Jenkins

1. **Instalar Plugin de Allure:**
   - Ir a **Manage Jenkins** → **Plugin Manager**
   - Buscar "Allure Jenkins Plugin"
   - Instalar y reiniciar Jenkins

2. **Configurar Allure:**
   - Ir a **Manage Jenkins** → **Global Tool Configuration**
   - En sección **Allure Commandline**:
     - Click en **Add Allure Commandline**
     - Name: `allure-latest`
     - Install automatically: ✅ (seleccionar última versión)

#### Generar Reportes Allure

El Jenkinsfile ya está configurado para generar reportes Allure. Después de cada test:

```groovy
stage('Generate Allure Report') {
    steps {
        script {
            sh 'npm run allure:convert'
            sh 'npm run allure:generate'
        }
        allure([
            includeProperties: false,
            jdk: '',
            properties: [],
            reportBuildPolicy: 'ALWAYS',
            results: [[path: 'reports/allure-results']]
        ])
    }
}
```

Para ver el reporte:
1. Ir al build
2. Click en **Allure Report** en el menú lateral
3. Explorar gráficos interactivos, tendencias, y métricas

### Generar Reportes HTML Simples

Para generar reportes HTML desde JSON:

```bash
# Instalar k6-html-reporter (si aún no está)
npm install -g k6-html-reporter

# En el Jenkinsfile, añadir después del test:
sh """
    k6-html-reporter ${REPORTS_DIR}/json/*.json --output ${REPORTS_DIR}/html/report.html
"""
```

### Diferencias entre Reportes

| Tipo | Ventajas | Desventajas |
|------|----------|-------------|
| **JSON** | Raw data, completo, procesable | No visual, difícil de leer |
| **HTML Simple** | Fácil, rápido, sin instalación extra | Básico, sin tendencias |
| **Allure** | Interactivo, tendencias, gráficos, histórico | Requiere plugin y configuración |

## Notificaciones

### Email en Fallos

Añadir al `post` section del Jenkinsfile:

```groovy
post {
    failure {
        emailext (
            subject: "❌ k6 Test Failed: ${params.TEST_TYPE} on ${params.ENVIRONMENT}",
            body: """
                Test Type: ${params.TEST_TYPE}
                Environment: ${params.ENVIRONMENT}
                Build: ${env.BUILD_URL}

                Ver detalles en: ${env.BUILD_URL}console
            """,
            to: 'team@example.com'
        )
    }
    unstable {
        emailext (
            subject: "⚠️ k6 Thresholds Not Met: ${params.TEST_TYPE} on ${params.ENVIRONMENT}",
            body: """
                Test ejecutado pero thresholds no cumplidos.

                Test Type: ${params.TEST_TYPE}
                Environment: ${params.ENVIRONMENT}
                Build: ${env.BUILD_URL}

                Revisar métricas en: ${env.BUILD_URL}
            """,
            to: 'team@example.com'
        )
    }
}
```

### Slack Notifications

```groovy
post {
    failure {
        slackSend (
            color: 'danger',
            message: "❌ k6 Test Failed: ${params.TEST_TYPE} on ${params.ENVIRONMENT}\n${env.BUILD_URL}"
        )
    }
}
```

## Troubleshooting

### Error: k6 command not found

**Solución:**
```groovy
environment {
    K6_BIN = '/usr/local/bin/k6'  // Ruta completa a k6
}
```

### Timeouts en Tests Largos

Aumentar timeout en job configuration:
```groovy
options {
    timeout(time: 2, unit: 'HOURS')
}
```

### Permisos en Reportes

```bash
# En el agente Jenkins
sudo chown -R jenkins:jenkins reports/
sudo chmod -R 755 reports/
```

## Best Practices

1. **Tests en Staging Primero**: Siempre probar en staging antes de prod
2. **Smoke Tests Automáticos**: En cada deploy
3. **Load Tests Programados**: Semanalmente en off-peak
4. **Thresholds Apropiados**: Ajustar según SLAs reales
5. **Archivar Resultados**: Mantener historial para tendencias
6. **Notificaciones**: Solo en fallos críticos

## Ejemplos de Uso

### Smoke Test Rápido
```bash
TEST_TYPE=smoke ENVIRONMENT=dev
```

### Load Test Completo
```bash
TEST_TYPE=load ENVIRONMENT=staging MAX_VUS=500 ACTIVITIES=5
```

### Stress Test Agresivo
```bash
TEST_TYPE=stress ENVIRONMENT=staging MAX_VUS=1000
```

### Size Test Límites
```bash
TEST_TYPE=size ENVIRONMENT=dev SIZE_MB=128
```

## Soporte

Para problemas con la integración Jenkins:
1. Verificar logs del job
2. Verificar instalación de k6: `k6 version`
3. Verificar permisos del workspace
4. Revisar [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
