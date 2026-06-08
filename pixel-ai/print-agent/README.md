# Pixel AI — Print Agent

Runs on the Windows mini-PC at the event. Polls the Pixel AI backend for approved print jobs and sends them to the DNP dye-sub printer automatically.

## Requirements

- Windows 10/11
- Node.js 18 or newer
- DNP DS-RX1HS or DS620A printer installed and set as default (or named in `.env`)

## Setup

1. Copy this folder to `C:\PixelAI\print-agent\`
2. Open PowerShell in that folder and run:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your values:
   ```
   copy .env.example .env
   notepad .env
   ```
4. Find your exact printer name:
   ```
   wmic printer list brief
   ```
   Copy the name exactly into `PRINTER_NAME` in `.env`

5. Test run:
   ```
   node agent.js
   ```
   You should see the startup banner and "polling for print jobs..." in the console.

## Running at startup (recommended for events)

1. Press `Win + R` → type `taskschd.msc` → OK
2. Click **Create Basic Task**
3. Name: `Pixel AI Print Agent`
4. Trigger: **When I log on**
5. Action: **Start a program**
   - Program: `node`
   - Arguments: `C:\PixelAI\print-agent\agent.js`
   - Start in: `C:\PixelAI\print-agent`
6. Finish

## .env reference

| Variable | Description | Default |
|---|---|---|
| `PIXEL_AI_BACKEND_URL` | Your Railway backend URL | `http://localhost:3000` |
| `ADMIN_SECRET` | Must match `ADMIN_SECRET` on backend | — |
| `POLL_INTERVAL_SECONDS` | How often to check for jobs | `5` |
| `PRINTER_NAME` | Windows printer name (exact) | `DNP DS-RX1HS` |
| `TEMP_DIR` | Where to store downloads | `C:\PixelAI\temp` |
| `LOG_DIR` | Where to write log files | `C:\PixelAI\logs` |

## Logs

Log files are written to `LOG_DIR` (default `C:\PixelAI\logs\print-agent.log`).
Rotates at 5 MB, keeps last 5 files.
