@echo off
echo ========================================
echo  Fresh Database Setup
echo ========================================
echo.
echo This will:
echo 1. Create default admin user
echo 2. Add all 7 user roles
echo 3. Create sample entry tables
echo.
pause

echo.
echo Step 1: Creating default admin user...
echo ========================================
node create-default-admin.js
echo.

echo Step 2: Adding sample entry roles and tables...
echo ========================================
node run-sample-entry-migrations.js
echo.

echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo You can now:
echo 1. Start the server: npm run dev
echo 2. Login with:
echo    Username: admin
echo    Password: admin123
echo.
echo IMPORTANT: Change the password after first login!
echo.
pause
