@echo off
REM ---------------------------------------------------------------------------
REM  Albion Flipper — private market capture launcher.
REM
REM  Runs the official AODP client with its ingest URL pointed at THIS app on
REM  localhost, so your market data is sent ONLY to your machine and is NEVER
REM  uploaded to the public Albion Online Data Project database.
REM
REM  Requirements (one-time):
REM    1. Install Npcap:            https://npcap.com
REM    2. Install the AODP client:  https://www.albion-online-data.com/  (Client)
REM       (default path: C:\Program Files\Albion Data Client\albiondata-client.exe)
REM
REM  Usage:
REM    1. Start the app first:  npm run dev   (must be running on port 3000)
REM    2. Double-click this file (it will request Administrator rights).
REM    3. Launch Albion, then OPEN the marketplace / Black Market in-game for the
REM       items & cities you care about — only what your client sees is captured.
REM ---------------------------------------------------------------------------

REM Self-elevate to Administrator (packet capture needs it).
net session >nul 2>&1
if %errorLevel% NEQ 0 (
  powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
  exit /b
)

set "CLIENT=C:\Program Files\Albion Data Client\albiondata-client.exe"
if not exist "%CLIENT%" (
  echo Could not find the AODP client at:
  echo   %CLIENT%
  echo Edit this file and set CLIENT to your albiondata-client.exe path.
  pause
  exit /b 1
)

echo Starting local capture. Data goes ONLY to http://127.0.0.1:3000 (not public).
echo Keep this window open while you play. Close it to stop capturing.
"%CLIENT%" -i http://127.0.0.1:3000/api/ingest
pause
