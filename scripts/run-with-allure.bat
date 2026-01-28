@echo off
REM Script to run a k6 test and generate an Allure report
REM Usage: run-with-allure.bat <test-name>
REM Example: run-with-allure.bat smoke

set TEST_NAME=%1

if "%TEST_NAME%"=="" (
    echo Error: Test name is required
    echo Usage: run-with-allure.bat ^<test-name^>
    echo Example: run-with-allure.bat smoke
    exit /b 1
)

echo.
echo ===============================================
echo Running test: %TEST_NAME%
echo ===============================================
echo.

REM Run the test (ignore exit code)
call npm run test:%TEST_NAME%

echo.
echo ===============================================
echo Generating Allure report...
echo ===============================================
echo.

REM Convert JSON to Allure format
call npm run allure:convert
if errorlevel 1 (
    echo Error converting to Allure format
    exit /b 1
)

REM Generate Allure report
call npm run allure:generate
if errorlevel 1 (
    echo Error generating Allure report
    exit /b 1
)

REM Open Allure report
call npm run allure:open

echo.
echo ===============================================
echo Allure report generated successfully
echo ===============================================
echo.
