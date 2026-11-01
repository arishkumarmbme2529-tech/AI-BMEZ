@echo off
title AICTE Smart Regulatory Platform - Localhost Server (SIH 2026 PS 26261)
echo ============================================================================
echo  AICTE SMART DOCUMENT MANAGEMENT ^& REGULATORY COMPLIANCE PLATFORM
echo  Smart India Hackathon 2026 ^| Problem Statement ID: 26261
echo ============================================================================
echo.
echo Starting Localhost Server on:
echo   - Frontend Web Portal : http://localhost:3000
echo   - Backend API ^& Docs  : http://localhost:8000
echo.
start "" "http://localhost:3000"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0localhost_server.ps1"
pause
