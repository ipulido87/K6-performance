// Jenkinsfile - k6 Performance Testing Framework
// Pipeline to run k6 performance tests

pipeline {
    agent any

    parameters {
        choice(
            name: 'TEST_TYPE',
            choices: ['smoke', 'load', 'stress', 'spike', 'soak', 'size'],
            description: 'Test type to run'
        )
        choice(
            name: 'ENVIRONMENT',
            choices: ['local', 'dev', 'staging', 'prod'],
            description: 'Environment where the test runs'
        )
        string(
            name: 'MAX_VUS',
            defaultValue: '200',
            description: 'Maximum number of virtual users (for load/stress)'
        )
        string(
            name: 'ACTIVITIES',
            defaultValue: '1',
            description: 'Number of activities in the payload'
        )
        string(
            name: 'SIZE_MB',
            defaultValue: '0',
            description: 'Payload size in MB (0 = dynamic)'
        )
    }

    environment {
        // Configure k6 if it is not in PATH
        K6_BIN = 'k6'
        // Reports directory
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
                    echo "Verifying k6 installation..."
                    sh """
                        ${K6_BIN} version || {
                            echo "ERROR: k6 is not installed"
                            exit 1
                        }
                    """
                }
            }
        }

        stage('Prepare') {
            steps {
                echo "Preparing test environment..."
                sh """
                    # Clean old reports
                    rm -rf ${REPORTS_DIR}/json/* ${REPORTS_DIR}/allure-results/* || true

                    # Verify project structure
                    test -d src/ || { echo "ERROR: src/ directory not found"; exit 1; }
                    test -d tests/ || { echo "ERROR: tests/ directory not found"; exit 1; }
                    test -f .env || { echo "ERROR: .env file not found"; exit 1; }

                    echo "OK: Project structure verified"
                """
            }
        }

        stage('Run Test') {
            steps {
                script {
                    echo "Running test ${params.TEST_TYPE} in ${params.ENVIRONMENT} environment..."

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
                                EXIT_CODE=$?
                                echo "Test completed with exit code: $EXIT_CODE"
                                if [ $EXIT_CODE -eq 99 ]; then
                                    echo "WARN: Test ran but thresholds were not met"
                                elif [ $EXIT_CODE -eq 0 ]; then
                                    echo "OK: Test completed successfully"
                                else
                                    echo "ERROR: Test execution failed"
                                    exit $EXIT_CODE
                                fi
                            }
                    """
                }
            }
        }

        stage('Generate Reports') {
            steps {
                echo "Generating Allure reports..."
                sh """
                    npx allure generate ${REPORTS_DIR}/allure-results --clean -o ${REPORTS_DIR}/allure-report || true
                """
            }
        }

        stage('Archive Results') {
            steps {
                echo "Archiving results..."

                // Archive JSON reports
                archiveArtifacts artifacts: "${REPORTS_DIR}/json/*.json",
                                 allowEmptyArchive: true,
                                 fingerprint: true

                // Publish Allure report
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
            echo "Cleaning workspace..."
            // Keep reports but clean temp files
            sh "find . -name '*.tmp' -delete || true"
        }

        success {
            echo "OK: Pipeline completed successfully"
        }

        failure {
            echo "ERROR: Pipeline failed"
        }

        unstable {
            echo "WARN: Pipeline unstable - thresholds not met"
        }
    }
}
