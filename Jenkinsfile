// Jenkinsfile - k6 Performance Testing Framework
// Pipeline para ejecutar pruebas de rendimiento con k6

pipeline {
    agent any

    parameters {
        choice(
            name: 'TEST_TYPE',
            choices: ['smoke', 'load', 'stress', 'spike', 'soak', 'size'],
            description: 'Tipo de test a ejecutar'
        )
        choice(
            name: 'ENVIRONMENT',
            choices: ['local', 'dev', 'staging', 'prod'],
            description: 'Entorno donde ejecutar el test'
        )
        string(
            name: 'MAX_VUS',
            defaultValue: '200',
            description: 'Número máximo de usuarios virtuales (para load/stress)'
        )
        string(
            name: 'ACTIVITIES',
            defaultValue: '1',
            description: 'Número de actividades en el payload'
        )
        string(
            name: 'SIZE_MB',
            defaultValue: '0',
            description: 'Tamaño del payload en MB (0 = dinámico)'
        )
    }

    environment {
        // Configurar k6 si no está en PATH
        K6_BIN = 'k6'
        // Directorio de reportes
        REPORTS_DIR = 'reports'
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Checking out code..."
                checkout scm
            }
        }

        stage('Verify Installation') {
            steps {
                script {
                    echo "Verificando instalación de k6..."
                    sh """
                        ${K6_BIN} version || {
                            echo "ERROR: k6 no está instalado"
                            exit 1
                        }
                    """
                }
            }
        }

        stage('Prepare') {
            steps {
                echo "Preparando entorno de test..."
                sh """
                    # Limpiar reportes antiguos
                    rm -rf ${REPORTS_DIR}/json/* ${REPORTS_DIR}/allure-results/* || true

                    # Verificar estructura del proyecto
                    test -d src/ || { echo "ERROR: Directorio src/ no encontrado"; exit 1; }
                    test -d tests/ || { echo "ERROR: Directorio tests/ no encontrado"; exit 1; }
                    test -f .env || { echo "ERROR: Archivo .env no encontrado"; exit 1; }

                    echo "✓ Estructura del proyecto verificada"
                """
            }
        }

        stage('Run Test') {
            steps {
                script {
                    echo "Ejecutando test ${params.TEST_TYPE} en entorno ${params.ENVIRONMENT}..."

                    def testFile = "tests/${params.TEST_TYPE}/soap-${params.TEST_TYPE}.test.js"
                    def reportFile = "${REPORTS_DIR}/json/${params.TEST_TYPE}-${params.ENVIRONMENT}-${env.BUILD_NUMBER}.json"

                    sh """
                        ${K6_BIN} run \
                            -e ENVIRONMENT=${params.ENVIRONMENT} \
                            -e MAX_VUS=${params.MAX_VUS} \
                            -e ACTIVITIES=${params.ACTIVITIES} \
                            -e SIZE_MB=${params.SIZE_MB} \
                            --out json=${reportFile} \
                            --out experimental-json-report=${REPORTS_DIR}/allure-results \
                            ${testFile} || {
                                EXIT_CODE=\$?
                                echo "Test completado con código de salida: \$EXIT_CODE"
                                if [ \$EXIT_CODE -eq 99 ]; then
                                    echo "⚠️  Test ejecutado pero thresholds no cumplidos"
                                elif [ \$EXIT_CODE -eq 0 ]; then
                                    echo "✓ Test completado exitosamente"
                                else
                                    echo "✗ Error en la ejecución del test"
                                    exit \$EXIT_CODE
                                fi
                            }
                    """
                }
            }
        }

        stage('Generate Reports') {
            steps {
                echo "Generando reportes Allure..."
                sh """
                    npx allure generate ${REPORTS_DIR}/allure-results --clean -o ${REPORTS_DIR}/allure-report || true
                """
            }
        }

        stage('Archive Results') {
            steps {
                echo "Archivando resultados..."

                // Archivar reportes JSON
                archiveArtifacts artifacts: "${REPORTS_DIR}/json/*.json",
                                 allowEmptyArchive: true,
                                 fingerprint: true

                // Publicar reporte Allure
                allure([
                    includeProperties: false,
                    jdk: '',
                    properties: [],
                    reportBuildPolicy: 'ALWAYS',
                    results: [[path: "${REPORTS_DIR}/allure-results"]]
                ])
            }
        }
    }

    post {
        always {
            echo "Limpiando workspace..."
            // Mantener reportes pero limpiar temporales
            sh "find . -name '*.tmp' -delete || true"
        }

        success {
            echo "✓ Pipeline completado exitosamente"
        }

        failure {
            echo "✗ Pipeline falló"
        }

        unstable {
            echo "⚠️ Pipeline inestable - Thresholds no cumplidos"
        }
    }
}
