@echo off
REM Script para ejecutar test k6 y generar reporte Allure
REM Uso: run-with-allure.bat <test-name>
REM Ejemplo: run-with-allure.bat smoke

set TEST_NAME=%1

if "%TEST_NAME%"=="" (
    echo Error: Se requiere el nombre del test
    echo Uso: run-with-allure.bat ^<test-name^>
    echo Ejemplo: run-with-allure.bat smoke
    exit /b 1
)

echo.
echo ===============================================
echo Ejecutando test: %TEST_NAME%
echo ===============================================
echo.

REM Ejecutar el test (ignorar código de salida)
call npm run test:%TEST_NAME%

echo.
echo ===============================================
echo Generando reporte Allure...
echo ===============================================
echo.

REM Convertir JSON a formato Allure
call npm run allure:convert
if errorlevel 1 (
    echo Error al convertir a formato Allure
    exit /b 1
)

REM Generar reporte Allure
call npm run allure:generate
if errorlevel 1 (
    echo Error al generar reporte Allure
    exit /b 1
)

REM Abrir reporte Allure
call npm run allure:open

echo.
echo ===============================================
echo Reporte Allure generado exitosamente
echo ===============================================
echo.
