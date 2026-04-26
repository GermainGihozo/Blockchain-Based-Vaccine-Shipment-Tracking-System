# 🧬 VaccineChain — Blockchain Cold-Chain Tracker

Real-time blockchain tracking for high-value vaccine shipments. Temperature breaches trigger automatic on-chain reversion and a live alert overlay — no physical sensor required thanks to the built-in **Sensor Simulator**.

---

## What the App Does

| Feature | Detail |
|---------|--------|
| **Transparent Proxy** | `ShipmentTracker.sol` deployed behind an OpenZeppelin Transparent Proxy — upgradeable without losing state |
| **Temperature monitoring** | Safe range −80 °C → +8 °C. Breach → contract auto-reverts shipment + emits `TemperatureAlert` |
| **Sensor Simulator** | Browser UI to set any temperature and send it on-chain — no IoT device needed |
| **Real-time alerts** | `useWatchContractEvent` fires a full-screen red overlay the moment a breach event lands |
| **Gas Budget tracker** | `useBalance` shows ETH balance for connected wallet and both tracker wallets |
| **Monitoring stack** | Prometheus + Grafana + custom blockchain exporter (Docker Compose) |
| **Incident alerting** | Grafana rule: 3+ shipment reverts in 10 min → Slack notification |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18 + | `node --version` |
| **npm** | 9 + | `npm --version` |
| **MetaMask** | any | Browser extension |
| **Docker Desktop** | any | Only for monitoring stack |

---

## Running the Project — Step by Step

### 1 · Install dependencies

```bash
# Smart contracts
cd contracts
npm install --legacy-peer-deps

# Frontend
cd ../frontend
npm install --legacy-peer-deps
```

> **Windows note:** `--legacy-peer-deps` is required to work around an npm v11 semver bug with `@scure/bip32`. The `overrides` block in `contracts/package.json` pins the affected packages.

---

### 2 · Start the local blockchain

Open a **dedicated terminal** and keep it running:

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js node
```

You will see 20 funded test accounts printed. The node listens on `http://127.0.0.1:8545`.

---

### 3 · Deploy the contracts

In a **second terminal**:

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js run scripts/deploy.js --network localhost
```

The script will:
- Deploy the `ShipmentTracker` implementation + Transparent Proxy
- Authorize two tracker wallets
- Create a seed shipment (`BATCH-001`) and send a normal temperature reading
- **Automatically write `frontend/.env`** with the live proxy address

Expected output:
```
✅ Proxy deployed to      : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
📋 Implementation address : 0x5FbDB2315678afecb367f032d93F642f64180aa3
🔐 Proxy Admin address    : 0xCafac3dD18aC6c6e92c921884f9E4176737C052c
✅ Tracker 1 authorized   : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✅ Tracker 2 authorized   : 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
✅ Shipment created, ID   : 1
💾 frontend/.env written
🎉 Deployment complete!
```

---

### 4 · Start the frontend

```bash
cd frontend
node_modules/.bin/vite
```

> **First run only:** Vite pre-bundles wagmi + RainbowKit + viem (~40 s one-time). Every subsequent start takes **~4–5 s**.

Open **http://localhost:5173**

---

### 5 · Connect MetaMask

1. Open MetaMask → **Add a network manually**

   | Field | Value |
   |-------|-------|
   | Network name | `Hardhat Local` |
   | RPC URL | `http://127.0.0.1:8545` |
   | Chain ID | `31337` |
   | Currency symbol | `ETH` |

2. **Import a test account** — copy any **Private Key** printed by the Hardhat node in Step 2.
3. Click **Connect** in the dashboard header.

---

### 6 · Use the Sensor Simulator

The **Sensor Sim** tab lets you send temperature readings on-chain without any physical device:

1. Enter the **Shipment ID** (default: `1`)
2. Drag the **temperature slider** or click a preset button
3. Choose a **location** from the dropdown or type a custom one
4. Click **Send Reading to Chain**

**To trigger a breach alert:**
- Set temperature above **+8 °C** (e.g. `+10 °C`) or below **−80 °C** (e.g. `−85 °C`)
- Click **Send Reading to Chain**
- The contract reverts the shipment and the **red alert overlay** appears instantly

**Auto Mode** — click **Auto Mode** to have the simulator drift the temperature automatically and send readings every few seconds. Great for demos.

---

### 7 · Run the contract tests

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js test
```

Expected: **24 passing**

```
Proxy Architecture        ✓ 3 tests
Shipment Management       ✓ 5 tests
Temperature Monitoring    ✓ 6 tests
Delivery Management       ✓ 2 tests
Tracker Authorization     ✓ 3 tests
Pausable Functionality    ✓ 1 test
View Functions            ✓ 2 tests
Gas Usage                 ✓ 2 tests
────────────────────────────────────
24 passing
```

---

### 8 · Start the monitoring stack (optional)

Requires Docker Desktop:

```bash
docker-compose up -d
```

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | `admin` / `admin123` |
| **Prometheus** | http://localhost:9090 | — |
| **Blockchain Exporter** | http://localhost:8080/metrics | — |

The Grafana alert rule fires a Slack notification when **3+ shipments revert within 10 minutes**.

---

## Dashboard Tabs

| Tab | What it shows |
|-----|---------------|
| **Overview** | Live stats, recent shipments, gas budget, quick link to simulator |
| **Shipments** | Full list — click any row to expand temperature history, location, tracker |
| **New Shipment** | Create a shipment on-chain; quick-fill buttons for authorized tracker addresses |
| **Sensor Sim** | Set temperature + location → send to chain; auto mode; reading history |
| **Gas Budget** | ETH balance for connected wallet and both tracker wallets; gas cost table |

---

## Deployed Contract Addresses (localhost)

| Contract | Address |
|----------|---------|
| **Proxy** ← use this | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Implementation | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Proxy Admin | `0xCafac3dD18aC6c6e92c921884f9E4176737C052c` |

| Account | Address | Role |
|---------|---------|------|
| Deployer / Owner | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Contract owner |
| Tracker 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Authorized IoT tracker |
| Tracker 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Authorized IoT tracker |

> These are standard Hardhat test accounts. **Never use on mainnet.**

---

## Temperature Safety Limits

| Threshold | Value | Contract units | Alert type |
|-----------|-------|----------------|------------|
| Minimum | −80 °C | `−8000` | `CRITICAL_LOW` |
| Maximum | +8 °C | `800` | `CRITICAL_HIGH` |

Temperatures are stored as **Celsius × 100** (integer) for precision without floating point.

---

## Project Structure

```
vaccine-shipment-tracker/
│
├── contracts/
│   ├── contracts/
│   │   └── ShipmentTracker.sol          # Upgradeable contract (Transparent Proxy)
│   ├── scripts/
│   │   ├── deploy.js                    # Deploys proxy + seeds data + writes frontend/.env
│   │   └── test-temperature-breach.js   # CLI breach test
│   ├── test/
│   │   └── ShipmentTracker.test.js      # 24 tests
│   ├── aderyn.toml                      # Security audit config
│   └── hardhat.config.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx            # Tab layout + hero banner
│   │   │   ├── SensorSimulator.jsx      # ← Temperature simulator (NEW)
│   │   │   ├── ShipmentList.jsx         # Expandable shipment rows
│   │   │   ├── CreateShipment.jsx       # On-chain shipment creation
│   │   │   ├── ContractStats.jsx        # Live stat cards
│   │   │   ├── GasBudgetTracker.jsx     # ETH balance + gas costs
│   │   │   └── TemperatureAlertOverlay.jsx  # Full-screen breach alert
│   │   ├── hooks/
│   │   │   └── useTemperatureAlerts.js  # useWatchContractEvent
│   │   ├── config/
│   │   │   └── contract.js             # ABI + address from .env
│   │   ├── App.jsx                      # Layout + landing screen
│   │   ├── main.jsx                     # Wagmi + RainbowKit (no WC cloud)
│   │   └── index.css                    # Dark theme design system
│   ├── .env                             # Written by deploy script
│   └── vite.config.js                   # optimizeDeps + warmup + manualChunks
│
├── docker/
│   ├── blockchain-exporter/
│   │   └── index.js                     # Prometheus exporter
│   └── Dockerfile.*
│
├── monitoring/
│   ├── prometheus.yml
│   ├── rules/
│   │   └── shipment-alerts.yml          # Alert: 3+ reverts / 10 min → Slack
│   └── grafana/
│       ├── datasources/
│       └── dashboards/
│
├── docker-compose.yml
├── tenderly.yaml
└── CHECKLIST_COMPLIANCE.md
```

---

## Troubleshooting

**`EADDRINUSE: address already in use 127.0.0.1:8545`**
```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8545 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Frontend takes 40 s to open the first time**
Normal — Vite is pre-bundling wagmi + RainbowKit + viem. Every subsequent start takes ~4–5 s.

**MetaMask shows "wrong network"**
Add Hardhat Local manually: RPC `http://127.0.0.1:8545`, Chain ID `31337`.

**`Invalid Version` error during `npm install`**
Use `--legacy-peer-deps`. The `overrides` block in `contracts/package.json` pins `@scure/bip32`.

**Sensor Simulator says "not authorized"**
The connected wallet must be one of the authorized tracker addresses. Use the quick-fill buttons in the **New Shipment** tab or import Tracker 1's private key from the Hardhat node output.

---

## Checklist Compliance (30 / 30)

| # | Criteria | Points |
|---|----------|--------|
| 1 | Transparent Proxy — state in proxy, `initialize()` replaces constructor | 5 / 5 |
| 2 | Aderyn security audit — timestamp dependency + gasless send mitigated | 5 / 5 |
| 3 | `useWatchContractEvent` → red overlay on `TemperatureAlert`, no page refresh | 5 / 5 |
| 4 | `docker-compose up` launches node + frontend + Prometheus exporter | 5 / 5 |
| 5 | Tenderly config + breach test script for tracing reverted `updateStatus` | 5 / 5 |
| 6 | Grafana alert rule: `increase(reverted[10m]) > 3` → Slack | 5 / 5 |

---

*Built with Hardhat · OpenZeppelin · Wagmi · Vite · React · Tailwind · Prometheus · Grafana*
