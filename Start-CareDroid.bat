@echo off
title CareDroid - Local Dev Server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-CareDroid.ps1"
