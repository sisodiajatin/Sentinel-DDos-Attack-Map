# SentinelVis - Real-Time DDoS Threat Visualization

<div align="center">

A sophisticated real-time cybersecurity threat visualization platform that maps DDoS attacks across the globe with interactive 3D globe and planar map views.

[Live Demo](https://sentinel-d-dos-attack-map.vercel.app) • [Report Bug](https://github.com/sisodiajatin/Sentinel-DDos-Attack-Map/issues) • [Request Feature](https://github.com/sisodiajatin/Sentinel-DDos-Attack-Map/issues)

</div>

---

## Features

### Real-Time Threat Intelligence
- **Live Mode**: Integrates with AbuseIPDB and AlienVault OTX APIs for real-time threat data
- **Mix Mode**: Combines live threat feeds with simulated attack patterns
- **Simulation Mode**: High-fidelity synthetic attack generation for testing and demos

### Interactive Visualization
- **3D Globe View**: Rotating Earth visualization with attack trajectories
- **Planar Map View**: Traditional 2D world map for detailed regional analysis
- **Animated Attack Paths**: Real-time attack flow visualization with particle effects
- **Region Navigation**: Quick zoom to continents (North America, Europe, Asia, Africa, South America, Oceania)

### Advanced Analytics
- **Attack Classification**: SYN Flood, UDP Flood, HTTP Flood, DNS Amplification, SQL Injection
- **Traffic Statistics**: Real-time charts showing attack distribution and trends
- **Threat Level Monitoring**: Dynamic threat assessment (Low/Medium/High/Critical)
- **Attack History**: Persistent storage using IndexedDB for historical analysis

### AI-Powered Insights
- **Gemini AI Integration**: Automated threat analysis and recommendations
- **Attack Analysis Modal**: Detailed breakdown of attack vectors and mitigation strategies
- **Smart Threat Assessment**: Context-aware security recommendations

### User Experience
- **Dark/Light Mode**: Fully themed interface with smooth transitions
- **Replay Mode**: Time-travel through historical attack data
- **Responsive Design**: Optimized for desktop and mobile devices
- **Performance Optimized**: Efficient rendering with WebGL and React optimization

---

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (Build tool)
- Tailwind CSS (Styling)
- D3.js (Map projections)
- Recharts (Data visualization)
- Lucide React (Icons)

**Backend:**
- Vercel Serverless Functions
- Node.js
- TypeScript

**APIs & Services:**
- Google Gemini AI (Threat analysis)
- AbuseIPDB (IP reputation)
- AlienVault OTX (Threat intelligence)

**Storage:**
- IndexedDB (Client-side persistence)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys (optional for live data):
  - [Google Gemini API Key](https://makersuite.google.com/app/apikey)
  - [AbuseIPDB API Key](https://www.abuseipdb.com/api)
  - [AlienVault OTX API Key](https://otx.alienvault.com/api)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sisodiajatin/Sentinel-DDos-Attack-Map.git
   cd Sentinel-DDos-Attack-Map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Required for AI-powered threat analysis
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional - for live threat data
   ABUSEIPDB_API_KEY=your_abuseipdb_key_here
   OTX_API_KEY=your_otx_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:5173`

---

## Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository
   - Configure environment variables in Vercel dashboard:
     - `GEMINI_API_KEY`
     - `ABUSEIPDB_API_KEY`
     - `OTX_API_KEY`

3. **Deploy**

   Vercel will automatically build and deploy. Your app will be live in ~2 minutes.

### Manual Deployment

Build the project:
```bash
npm run build
```

The `dist` folder contains the production-ready static files.

---

## Usage

### Switching Data Sources

Click the settings icon in the top-right corner to choose:
- **Simulation**: Synthetic attacks (no API keys required)
- **Live**: Real threat intelligence from AbuseIPDB and OTX
- **Mix**: Combined real + simulated data

### View Modes

Toggle between Globe and Map views using the buttons in the center of the navbar.

### Analyzing Threats

Click on any attack card to open the AI-powered analysis modal with:
- Attack vector details
- Severity assessment
- Recommended mitigation steps

### Replay Mode

Access historical attack data and replay past events at different speeds.

---

## Project Structure

```
sentinel-ddos-attack-map/
├── api/                    # Vercel serverless functions
│   ├── ai/
│   │   └── analyze.ts     # Gemini AI proxy
│   └── threat/
│       ├── abuseipdb.ts   # AbuseIPDB proxy
│       ├── otx.ts         # OTX proxy
│       └── stream.ts      # Aggregated threat stream
├── src/
│   ├── components/        # React components
│   │   ├── ThreatMap.tsx  # Main visualization
│   │   ├── StatsPanel.tsx # Analytics dashboard
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API clients and data services
│   ├── types/             # TypeScript definitions
│   └── App.tsx            # Root component
├── public/                # Static assets
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the MIT License.

---

## Acknowledgments

- [AbuseIPDB](https://www.abuseipdb.com/) for IP reputation data
- [AlienVault OTX](https://otx.alienvault.com/) for threat intelligence
- [Google Gemini](https://deepmind.google/technologies/gemini/) for AI-powered analysis
- [Natural Earth](https://www.naturalearthdata.com/) for map data

---

<div align="center">

Made with ❤️ by [Jatin Sisodia](https://github.com/sisodiajatin)

**[⬆ back to top](#sentinelvis---real-time-ddos-threat-visualization)**

</div>
