# AI-Powered Railway Traffic Control System
### Pune Division | Central Railway

---

## Project Structure

```
AI-Rail-Control/
├── backend/
│   ├── server.js              Express server (port 3000)
│   ├── package.json
│   ├── data/
│   │   ├── trains.js          Train metadata & timeline
│   │   ├── signals.js         Signal definitions (Dapodi + Khadki)
│   │   └── simulation.js      Authoritative simulation state machine
│   ├── routes/
│   │   ├── trains.js          GET /api/trains
│   │   ├── signals.js         GET /api/signals
│   │   └── analytics.js       GET /api/analytics
│   └── utils/
│       └── helpers.js         Time formatting utilities
│
└── frontend/
    ├── index.html             Main page (3 tabs)
    ├── css/
    │   ├── main.css           Header, tabs, controls
    │   ├── station.css        Canvas & info panels
    │   └── analytics.css      Charts, tables, insights
    └── js/
        ├── api.js             All fetch() calls to backend
        ├── signals.js         Canvas signal drawing functions
        ├── dapodi.js          Dapodi station canvas renderer
        ├── khadki.js          Khadki station canvas renderer
        ├── analytics.js       Charts (Chart.js) + PDF export
        ├── simulation.js      RAF loop + backend polling + offline fallback
        └── app.js             Tab switching, speed/reset controls
```

---

## How to Run

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Start the backend
```bash
cd backend
npm start
# or for auto-reload during development:
npm run dev
```

### 3. Open the frontend
Visit **http://localhost:3000** in your browser.

The Express server serves `frontend/` as static files, so there is no separate
frontend server needed.

> **Offline mode:** If the backend is not running, the frontend falls back to a
> fully client-side simulation engine. All 4 trains will still animate correctly.

---

## Trains Simulated

| Train   | Name                        | Type          | Priority | Direction     |
|---------|-----------------------------|---------------|----------|---------------|
| 17613   | Panvel–Nanded Express       | Mail Express  | P3       | Mumbai → Pune |
| 14806   | Barmer–Yesvantpur AC Exp    | Mail Express  | P3       | Mumbai → Pune |
| 22225   | CSMT–Solapur Vande Bharat   | Vande Bharat  | P1       | Mumbai → Pune |
| 22106   | Pune–CSMT Indrayani Express | Superfast     | P2       | Pune → Mumbai |

### Key Events
- **17613** enters Dapodi (on time +20 min), crosses PF-1, then **halts at Khadki PF-1** (red signal)
- **14806** passes Dapodi and Khadki non-stop, **overtaking** 17613 (+5 min penalty)
- **22225** (Vande Bharat) passes both stations non-stop, **overtaking** 17613 (+5 min penalty)
- **22106** moves right→left (opposite direction), crosses Khadki PF-3 then Dapodi PF-2

### Signal Logic
- **Before train**: all signals GREEN
- **As train passes each signal**: turns RED immediately
- **After train clears section**: RED → YELLOW (6s) → GREEN (12s)
- **Khadki H1**: pre-set RED for 17613 (forces halt); released only after both overtakes complete

---

## API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/api/state`          | Full simulation snapshot           |
| GET    | `/api/trains`         | All train positions & phases       |
| GET    | `/api/signals`        | All signal states (both stations)  |
| GET    | `/api/analytics`      | Delay data, metrics, AI insights   |
| POST   | `/api/control/speed`  | Set simulation speed `{ speed: 2 }`|
| POST   | `/api/control/reset`  | Reset simulation to t=0            |
| GET    | `/api/health`         | Server health check                |
