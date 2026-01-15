import { AttackEvent, AttackType, GeoCoord, SimulationScenario } from '../types';
import { MAJOR_CITIES } from '../constants';

// --- Simulation Engine Configuration ---
let lastId = 0;

// Simulation State (The "Director")
let currentScenario: SimulationScenario = 'NORMAL';
let scenarioTicksLeft = 0;
let scenarioTarget: GeoCoord | null = null;
let scenarioSource: GeoCoord | null = null;
let scenarioAttackType: AttackType | null = null;

// Helper: Pick a random item based on 'weight' property
const pickWeighted = (items: GeoCoord[]): GeoCoord => {
  const totalWeight = items.reduce((acc, item) => acc + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= (item.weight || 1);
    if (random <= 0) return item;
  }
  return items[0]; // Fallback
};

// Helper: Generate a realistic-looking IP address
const generateIP = () => {
  const octet1 = Math.floor(Math.random() * 223) + 1; // Class A/B/C
  const octet2 = Math.floor(Math.random() * 255);
  const octet3 = Math.floor(Math.random() * 255);
  const octet4 = Math.floor(Math.random() * 254) + 1;
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
};

// Update the "Director" state. Called periodically.
const updateDirector = () => {
  if (scenarioTicksLeft > 0) {
    scenarioTicksLeft--;
    return;
  }

  // 30% Chance to enter a special scenario, otherwise Normal traffic
  if (Math.random() > 0.7) {
    const scenarios: SimulationScenario[] = ['BOTNET_WAVE', 'HEAVY_HIT', 'CAMPAIGN'];
    currentScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    // Setup Scenario Params
    scenarioTicksLeft = Math.floor(Math.random() * 10) + 5; // Lasts 5-15 ticks
    
    // Pick targets based on scenario
    if (currentScenario === 'BOTNET_WAVE') {
       // Many weak attacks -> Single Target
       scenarioTarget = pickWeighted(MAJOR_CITIES); 
       scenarioAttackType = AttackType.HTTP_FLOOD;
    } else if (currentScenario === 'HEAVY_HIT') {
       // Single Source -> Single Target (High Mag)
       scenarioSource = pickWeighted(MAJOR_CITIES);
       scenarioTarget = pickWeighted(MAJOR_CITIES);
       while(scenarioTarget === scenarioSource) scenarioTarget = pickWeighted(MAJOR_CITIES);
       scenarioAttackType = AttackType.UDP_FLOOD;
    } else if (currentScenario === 'CAMPAIGN') {
       // Specific type across multiple targets
       scenarioAttackType = AttackType.SQL_INJECTION;
    }
    
    // console.log(`[Director] Starting Scenario: ${currentScenario}`);
  } else {
    currentScenario = 'NORMAL';
    scenarioTicksLeft = Math.floor(Math.random() * 5) + 2;
  }
};

export const generateRandomAttack = (): AttackEvent => {
  // Update state machine
  updateDirector();

  let source: GeoCoord;
  let target: GeoCoord;
  let type: AttackType;
  let magnitude: number;

  switch (currentScenario) {
    case 'BOTNET_WAVE':
      // Random low-weight source -> Fixed high-value target
      source = MAJOR_CITIES[Math.floor(Math.random() * MAJOR_CITIES.length)]; // Pure random source (IoT devices everywhere)
      target = scenarioTarget!;
      type = scenarioAttackType || AttackType.SYN_FLOOD;
      magnitude = Math.floor(Math.random() * 3) + 1; // Low magnitude per bot
      break;

    case 'HEAVY_HIT':
      // Fixed Source -> Fixed Target (DDoS)
      source = scenarioSource!;
      target = scenarioTarget!;
      type = scenarioAttackType || AttackType.UDP_FLOOD;
      magnitude = Math.floor(Math.random() * 3) + 8; // High magnitude (8-10)
      break;

    case 'CAMPAIGN':
      // Weighted Source -> Weighted Target, Specific Type
      source = pickWeighted(MAJOR_CITIES);
      target = pickWeighted(MAJOR_CITIES);
      type = scenarioAttackType || AttackType.SQL_INJECTION;
      magnitude = Math.floor(Math.random() * 5) + 3;
      break;

    case 'NORMAL':
    default: {
      // Business as usual: Weighted random traffic
      source = pickWeighted(MAJOR_CITIES);
      target = pickWeighted(MAJOR_CITIES);
      const types = Object.values(AttackType);
      type = types[Math.floor(Math.random() * types.length)];
      magnitude = Math.floor(Math.random() * 6) + 1; // 1-6 range
      break;
    }
  }

  // Ensure source != target
  if (source.city === target.city) {
    target = MAJOR_CITIES.find(c => c.city !== source.city) || MAJOR_CITIES[0];
  }

  lastId++;

  return {
    id: `evt-${Date.now()}-${lastId}`,
    source,
    target,
    type,
    timestamp: Date.now(),
    magnitude,
    ip: generateIP()
  };
};

export const generateHistory = (count: number): AttackEvent[] => {
  // Generate a history without triggering scenarios (keep history "cleaner" or purely random)
  return Array.from({ length: count }, () => {
      lastId++;
      const source = pickWeighted(MAJOR_CITIES);
      let target = pickWeighted(MAJOR_CITIES);
      while (target.city === source.city) target = pickWeighted(MAJOR_CITIES);
      
      const types = Object.values(AttackType);
      
      return {
        id: `hist-${Date.now()}-${lastId}`,
        source,
        target,
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: Date.now() - Math.floor(Math.random() * 100000),
        magnitude: Math.floor(Math.random() * 8) + 1,
        ip: generateIP()
      };
  });
};