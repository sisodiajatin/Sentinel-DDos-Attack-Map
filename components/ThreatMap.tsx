import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { AttackEvent, AttackType, MapViewMode, CountryLabel, LocationCount } from '../types';
import { ATTACK_COLORS } from '../constants';
import { Globe, Sliders, Activity, Zap, Layers, Filter, Bot, Database, Wifi, Loader2, AlertCircle, RefreshCw, Navigation, MapPin } from 'lucide-react';
import CountryFlag from './CountryFlag';

interface ThreatMapProps {
  attacks: AttackEvent[];
  selectedType: AttackType | 'ALL';
  onTypeChange: (type: AttackType | 'ALL') => void;
  onAnalyze: (attack: AttackEvent) => void;
  isDark: boolean;
  viewMode: MapViewMode;
  mode?: 'live' | 'replay';
  replayTimestamp?: number;
}

interface TooltipData {
  x: number;
  y: number;
  content: React.ReactNode;
}

// Minimal interface for TopoJSON objects to replace 'any'
interface WorldTopology {
  type: "Topology";
  objects: {
    countries: {
      type: "GeometryCollection";
      geometries: Array<{
        type: "Polygon" | "MultiPolygon";
        id: string;
        properties?: Record<string, unknown>;
      }>;
    };
  };
}

// ISO 3166-1 numeric codes for major countries
const COUNTRY_NAMES: Record<string, string> = {
  "840": "USA", "156": "China", "643": "Russia", "076": "Brazil", "356": "India",
  "036": "Australia", "124": "Canada", "250": "France", "276": "Germany", "392": "Japan",
  "826": "UK", "380": "Italy", "724": "Spain", "484": "Mexico", "360": "Indonesia",
  "792": "Turkey", "710": "South Africa", "682": "Saudi Arabia", "410": "South Korea",
  "032": "Argentina", "818": "Egypt", "566": "Nigeria", "702": "Singapore"
};

// Quick region presets for navigation
const REGION_PRESETS: Record<string, { rotation: [number, number, number]; scale: number; name: string }> = {
  GLOBAL: { rotation: [0, -20, 0], scale: 1, name: 'Global' },
  NORTH_AMERICA: { rotation: [100, -40, 0], scale: 1.8, name: 'N. America' },
  SOUTH_AMERICA: { rotation: [60, 20, 0], scale: 1.6, name: 'S. America' },
  EUROPE: { rotation: [-10, -50, 0], scale: 2.2, name: 'Europe' },
  AFRICA: { rotation: [-20, 0, 0], scale: 1.5, name: 'Africa' },
  ASIA: { rotation: [-100, -35, 0], scale: 1.8, name: 'Asia' },
  OCEANIA: { rotation: [-135, 25, 0], scale: 2, name: 'Oceania' },
};

// Heatmap color scale (cold to hot)
const HEATMAP_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626'];

// Country name to code for stats
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'USA': 'US', 'China': 'CN', 'Russia': 'RU', 'Brazil': 'BR', 'India': 'IN',
  'Australia': 'AU', 'Canada': 'CA', 'France': 'FR', 'Germany': 'DE', 'Japan': 'JP',
  'UK': 'GB', 'Italy': 'IT', 'Spain': 'ES', 'Mexico': 'MX', 'Indonesia': 'ID',
  'Turkey': 'TR', 'South Africa': 'ZA', 'Saudi Arabia': 'SA', 'South Korea': 'KR',
  'Argentina': 'AR', 'Egypt': 'EG', 'Nigeria': 'NG', 'Singapore': 'SG',
  'Netherlands': 'NL', 'Sweden': 'SE', 'Poland': 'PL', 'Ukraine': 'UA', 'Vietnam': 'VN',
};

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;
type CountryCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

// Shared across mounts so remounting the map (e.g. view switches) doesn't refetch.
let worldAtlasPromise: Promise<CountryCollection> | null = null;

function loadWorldAtlas(): Promise<CountryCollection> {
  if (!worldAtlasPromise) {
    worldAtlasPromise = fetch(WORLD_ATLAS_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load map data: ${response.status}`);
        }
        return response.json() as Promise<WorldTopology>;
      })
      .then((data) => {
        // @ts-expect-error - topojson types are tricky with the client library
        return feature(data, data.objects.countries) as CountryCollection;
      })
      .catch((error) => {
        worldAtlasPromise = null; // allow retry after a failure
        throw error;
      });
  }
  return worldAtlasPromise;
}

function buildCountryLabels(features: CountryCollection): CountryLabel[] {
  return features.features.flatMap((f: CountryFeature) => {
    const id = String(f.id);
    const name = COUNTRY_NAMES[id];
    return name ? [{ id, name, centroid: d3.geoCentroid(f) }] : [];
  });
}

const ThreatMap: React.FC<ThreatMapProps> = ({ attacks, selectedType, onTypeChange, onAnalyze, isDark, viewMode, mode = 'live', replayTimestamp }) => {
  const isReplayMode = mode === 'replay';
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null); // Keeping any for d3.GeoGeometry objects which are complex
  const [countryLabels, setCountryLabels] = useState<CountryLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // State for interaction
  const [rotation, setRotation] = useState<[number, number, number]>([0, -20, 0]);
  const [scale, setScale] = useState<number | null>(null); // Initialized on mount
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  
  // Controls State
  const [minMagnitude, setMinMagnitude] = useState<number>(1);
  const [speed, setSpeed] = useState<number>(1);
  const [density, setDensity] = useState<number>(20);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string>('GLOBAL');

  const isDragging = useRef(false);
  const isHovering = useRef(false); // Track if user is hovering over an interactive element
  const lastRotation = useRef<[number, number, number]>([0, -20, 0]);
  
  // Track impact effects (explosions at target)
  const [impactEffects, setImpactEffects] = useState<Array<{
    id: string;
    x: number;
    y: number;
    color: string;
    startTime: number;
  }>>([]);

  // Calculate country attack stats
  const countryStats = useMemo(() => {
    const stats: Record<string, { attacks: number; asSource: number; asTarget: number; totalMagnitude: number }> = {};
    
    attacks.forEach(attack => {
      const sourceCountry = attack.source.country;
      const targetCountry = attack.target.country;
      
      if (!stats[sourceCountry]) {
        stats[sourceCountry] = { attacks: 0, asSource: 0, asTarget: 0, totalMagnitude: 0 };
      }
      if (!stats[targetCountry]) {
        stats[targetCountry] = { attacks: 0, asSource: 0, asTarget: 0, totalMagnitude: 0 };
      }
      
      stats[sourceCountry].asSource++;
      stats[sourceCountry].attacks++;
      stats[sourceCountry].totalMagnitude += attack.magnitude;
      
      stats[targetCountry].asTarget++;
      stats[targetCountry].attacks++;
    });
    
    return stats;
  }, [attacks]);
  
  // Generate static stars once
  const stars = useMemo(() => {
     return Array.from({ length: 200 }).map(() => ({
         x: Math.random() * 100,
         y: Math.random() * 100,
         size: Math.random() * 1.5,
         opacity: Math.random() * 0.8 + 0.2
     }));
  }, []);

  // Load TopoJSON data and prepare labels
  const loadMap = useCallback((isCancelled: () => boolean = () => false) => {
    setIsLoading(true);
    setLoadError(null);
    loadWorldAtlas()
      .then((features) => {
        if (isCancelled()) return;
        setWorldData(features);
        setCountryLabels(buildCountryLabels(features));
        setIsLoading(false);
      })
      .catch((error: Error) => {
        if (isCancelled()) return;
        console.error('Failed to load world map data:', error);
        setLoadError(error.message || 'Failed to load map data');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadMap(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadMap]);

  // Initialize scale based on container size
  useEffect(() => {
    if (wrapperRef.current && scale === null) {
        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;
        // Default scale: smaller for globe to fit circle, slightly larger for map to fill width
        setScale(Math.min(width, height) / 2.5);
    }
  }, [scale]);

  // Reset pitch when switching to Planar
  useEffect(() => {
    if (viewMode === 'PLANAR') {
      setRotation(prev => [prev[0], 0, 0]);
      lastRotation.current = [lastRotation.current[0], 0, 0];
    } else {
        setRotation(prev => [prev[0], -20, 0]);
        lastRotation.current = [lastRotation.current[0], -20, 0];
    }
  }, [viewMode]);

  // Animation Loop (Auto Rotation & Re-render)
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      // Stop rotation if dragging OR hovering over an element
      if (!isDragging.current && !isHovering.current) {
        setRotation((prev) => {
          // Smooth auto-rotation
          const next: [number, number, number] = [(prev[0] + 0.2) % 360, prev[1], prev[2]];
          lastRotation.current = next;
          return next;
        });
      } else {
        // Just trigger re-render for packet animation if paused
        setRotation(prev => [...prev]); 
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Navigate to region preset
  const navigateToRegion = (regionKey: string) => {
    const preset = REGION_PRESETS[regionKey];
    if (preset) {
      setActiveRegion(regionKey);
      setRotation(preset.rotation);
      lastRotation.current = preset.rotation;
      
      if (wrapperRef.current) {
        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;
        const baseScale = Math.min(width, height) / 2.5;
        setScale(baseScale * preset.scale);
      }
      setShowRegionMenu(false);
    }
  };

  // Add impact effect when attack reaches target
  const addImpactEffect = (x: number, y: number, color: string, attackId: string) => {
    const effectId = `impact-${attackId}-${Date.now()}`;
    setImpactEffects(prev => {
      // Limit to 10 effects to avoid performance issues
      const newEffects = [...prev, { id: effectId, x, y, color, startTime: Date.now() }];
      return newEffects.slice(-10);
    });
    
    // Remove effect after animation
    setTimeout(() => {
      setImpactEffects(prev => prev.filter(e => e.id !== effectId));
    }, 1000);
  };

  // Helper to get icon for attack type
  const getAttackIcon = (type: AttackType) => {
    const color = ATTACK_COLORS[type];
    const className = "w-4 h-4";
    switch (type) {
      case AttackType.SQL_INJECTION: return <Database className={className} style={{ color }} />;
      case AttackType.HTTP_FLOOD: return <Globe className={className} style={{ color }} />;
      case AttackType.SYN_FLOOD: return <Zap className={className} style={{ color }} />;
      case AttackType.UDP_FLOOD: return <Activity className={className} style={{ color }} />;
      case AttackType.DNS_AMP: return <Wifi className={className} style={{ color }} />;
      default: return <Activity className={className} style={{ color }} />;
    }
  };

  // Track if we completed a drag operation to prevent onClick firing after drag
  const dragStarted = useRef(false);

  // Setup D3 Drag and Zoom - using native mouse events for reliability
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = svgRef.current;
    const currentViewMode = viewMode; // Capture for closure
    let startX = 0;
    let startY = 0;
    let isMouseDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      // Only left mouse button (button 0)
      if (e.button !== 0) return;

      isMouseDown = true;
      dragStarted.current = false;
      startX = e.clientX;
      startY = e.clientY;
      isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Only start drag if moved more than 3 pixels (prevents accidental drags)
      if (!isDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging.current = true;
        dragStarted.current = true;
        isHovering.current = false;
        setTooltip(null);
      }

      if (isDragging.current) {
        const sensitivity = 0.5;
        const [r0, r1, r2] = lastRotation.current;

        let next: [number, number, number];

        if (currentViewMode === 'GLOBE') {
          next = [
            r0 + (e.clientX - startX) * sensitivity,
            Math.max(-85, Math.min(85, r1 - (e.clientY - startY) * sensitivity)),
            r2
          ];
        } else {
          next = [
            r0 + (e.clientX - startX) * sensitivity,
            0,
            0
          ];
        }

        startX = e.clientX;
        startY = e.clientY;
        lastRotation.current = next;
        setRotation(next);
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      if (isDragging.current) {
        // Delay resetting isDragging to prevent auto-rotation from resuming immediately
        window.setTimeout(() => { isDragging.current = false; }, 1500);
      }
    };

    const handleMouseLeave = () => {
      isMouseDown = false;
    };

    // Scroll wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (wrapperRef.current) {
        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;
        const baseScale = Math.min(width, height) / 2.5;

        // Zoom factor based on wheel delta
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

        setScale(prev => {
          if (prev === null) return baseScale;
          const newScale = prev * zoomFactor;
          // Clamp between 0.5x and 8x of base scale
          return Math.max(baseScale * 0.5, Math.min(baseScale * 8, newScale));
        });
      }
    };

    // Add event listeners
    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('mouseleave', handleMouseLeave);
    svg.addEventListener('wheel', handleWheel, { passive: false });

    // Also listen on window for mouseup (in case mouse is released outside SVG)
    window.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('mouseup', handleMouseUp);
      svg.removeEventListener('mouseleave', handleMouseLeave);
      svg.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewMode, setRotation, setScale, setTooltip, worldData]);

  // Render D3 Visualization
  useEffect(() => {
    if (!worldData || !svgRef.current || !wrapperRef.current || scale === null) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Define Projection based on Mode
    let projection: d3.GeoProjection;

    if (viewMode === 'GLOBE') {
        projection = d3.geoOrthographic()
          .scale(scale)
          .translate([width / 2, height / 2])
          .rotate(rotation)
          .clipAngle(90);
    } else {
        projection = d3.geoEquirectangular()
          .scale(scale)
          .translate([width / 2, height / 2])
          .rotate(rotation) 
          .clipAngle(null); 
    }

    const path = d3.geoPath().projection(projection);

    // Definitions for filters and gradients
    const defs = svg.append('defs');
    
    // Glow Filter
    const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
    filter.append('feGaussianBlur')
        .attr('stdDeviation', '2.5')
        .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Atmosphere Gradient (Radial)
    const atmosphereGradient = defs.append('radialGradient')
        .attr('id', 'atmosphereGradient')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
    
    if (isDark) {
        atmosphereGradient.append('stop').attr('offset', '80%').attr('stop-color', '#0f172a').attr('stop-opacity', 1);
        atmosphereGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.4);
    } else {
        atmosphereGradient.append('stop').attr('offset', '80%').attr('stop-color', '#ffffff').attr('stop-opacity', 1);
        atmosphereGradient.append('stop').attr('offset', '100%').attr('stop-color', '#cbd5e1').attr('stop-opacity', 0.4);
    }

    // Draw Starfield Background
    const bgGroup = svg.append('g').attr('class', 'starfield');
    if (viewMode === 'GLOBE' && isDark) {
        // Only draw stars within viewport, but fixed positions
        stars.forEach(star => {
            bgGroup.append('circle')
                .attr('cx', (star.x / 100) * width)
                .attr('cy', (star.y / 100) * height)
                .attr('r', star.size)
                .attr('fill', '#fff')
                .attr('opacity', star.opacity);
        });
    }

    // Define colors based on theme
    const oceanFill = isDark ? '#020617' : '#f8fafc'; // slate-950 vs slate-50
    const oceanStroke = isDark ? '#1e293b' : '#e2e8f0'; // slate-800 vs slate-200
    const landFill = isDark ? '#0f172a' : '#cbd5e1'; // slate-900 vs slate-300
    const landStroke = isDark ? '#334155' : '#fff'; // slate-700 vs white
    const labelFill = isDark ? '#e2e8f0' : '#1e293b'; // slate-200 vs slate-800

    // Draw Atmosphere / Ocean Background
    if (viewMode === 'GLOBE') {
        // Outer glow (atmosphere)
        svg.append('circle')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', projection.scale() * 1.1) // Slightly larger
          .attr('fill', 'url(#atmosphereGradient)')
          .style('pointer-events', 'none');

        // The Ocean itself
        svg.append('circle')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', projection.scale())
          .attr('fill', oceanFill) 
          .attr('stroke', oceanStroke)
          .attr('stroke-width', 2)
          .attr('cursor', 'move');
    } else {
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent') 
            .attr('cursor', 'move');
    }

    // Draw Countries with hover stats
    svg.append('g')
      .selectAll('path')
      .data(worldData.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('fill', landFill)
      .attr('stroke', landStroke)
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        const countryName = COUNTRY_NAMES[d.id];
        if (!countryName) return;
        
        // Highlight country
        d3.select(this)
          .attr('fill', isDark ? '#1e3a5f' : '#bfdbfe')
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1.5);
        
        isHovering.current = true;
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        
        const stats = countryStats[countryName];
        const countryCode = COUNTRY_NAME_TO_CODE[countryName];
        
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-xl min-w-[180px]">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                {countryCode && <CountryFlag country={countryName} size="md" />}
                <span className="font-bold text-slate-900 dark:text-white">{countryName}</span>
              </div>
              {stats ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Attacks:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{stats.attacks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-500">As Source:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{stats.asSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500">As Target:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{stats.asTarget}</span>
                  </div>
                  {stats.asSource > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Magnitude:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {(stats.totalMagnitude / stats.asSource).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">No attack data</div>
              )}
            </div>
          )
        });
      })
      .on('mouseout', function() {
        // Reset country style
        d3.select(this)
          .attr('fill', landFill)
          .attr('stroke', landStroke)
          .attr('stroke-width', 0.5);
        
        isHovering.current = false;
        tooltipTimeoutRef.current = window.setTimeout(() => setTooltip(null), 300);
      });

    // Draw Country Labels
    // Dynamic calculation for zoom-based visibility
    const baseScale = Math.min(width, height) / 2.5;
    const zoomLevel = scale / baseScale;
    
    // Opacity fades in from 0.4 at 1x zoom to 1.0 at high zoom
    const labelOpacity = Math.min(1, Math.max(0, (zoomLevel - 0.5)));
    // Font size scales slightly with zoom to remain legible but not overwhelming
    const fontSize = Math.min(12, Math.max(9, 8 * Math.sqrt(zoomLevel)));

    if (labelOpacity > 0.1) {
        svg.append('g')
        .attr('class', 'country-labels')
        .selectAll('text')
        .data(countryLabels)
        .enter()
        .append('text')
        .text((d: any) => d.name)
        .attr('font-size', `${fontSize}px`)
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .attr('fill', labelFill)
        .attr('text-anchor', 'middle')
        .attr('opacity', labelOpacity)
        .style('pointer-events', 'none')
        .style('text-shadow', isDark ? '0 2px 3px rgba(0,0,0,0.9)' : '0 1px 2px rgba(255,255,255,0.8)') 
        .each(function(d: any) {
             const proj = projection(d.centroid);
             
             // Check visibility
             let isVisible = true;
             if (viewMode === 'GLOBE') {
                 // projection.invert returns the coordinate of the center point of the projection
                 const center = projection.invert?.([width / 2, height / 2]);
                 if (center) {
                     const distance = d3.geoDistance(d.centroid, center);
                     // 1.57 radians is approx 90 degrees.
                     if (distance > 1.57) isVisible = false;
                 }
             }

             if (proj && isVisible) {
                 d3.select(this)
                   .attr('x', proj[0])
                   .attr('y', proj[1])
                   .attr('visibility', 'visible');
             } else {
                 d3.select(this).attr('visibility', 'hidden');
             }
        });
    }

    // --- Heatmap / Density Logic ---
    // Calculate weighted frequency of attacks at each target coordinate
    const locationCounts: Record<string, LocationCount> = {};
    
    // Filter attacks based on user controls
    const filteredAttacks = attacks.filter(a => 
      a.magnitude >= minMagnitude && 
      (selectedType === 'ALL' || a.type === selectedType)
    );
    
    // Aggregate attacks for heatmap
    filteredAttacks.forEach(attack => {
        const key = `${attack.target.lat.toFixed(2)},${attack.target.lng.toFixed(2)}`;
        if (!locationCounts[key]) {
            locationCounts[key] = { lat: attack.target.lat, lng: attack.target.lng, count: 0 };
        }
        // Weigh by magnitude so stronger attacks create hotter zones
        locationCounts[key].count += attack.magnitude;
    });

    // --- Better Multi-Color Heatmap ---
    // Calculate max count for color scaling
    const maxCount = Math.max(...Object.values(locationCounts).map(l => l.count), 1);
    
    // Create color scale for heatmap
    const heatmapColorScale = d3.scaleLinear<string>()
      .domain([0, maxCount * 0.2, maxCount * 0.4, maxCount * 0.6, maxCount * 0.8, maxCount])
      .range(HEATMAP_COLORS);

    // Render Heatmap Glows with gradient colors
    Object.values(locationCounts).forEach(loc => {
        const coords: [number, number] = [loc.lng, loc.lat];
        const proj = projection(coords);
        if (proj) {
            let isVisible = true;
            if (viewMode === 'GLOBE') {
                isVisible = d3.geoDistance(coords, projection.invert!([width/2, height/2])!) < 1.57;
            }
            if (isVisible) {
                // Size depends on weighted count (log scale for containment)
                const radius = 5 + Math.log(loc.count + 1) * 8;
                const color = heatmapColorScale(loc.count);
                const intensity = Math.min(0.7, 0.25 + (loc.count / maxCount) * 0.45);
                
                // Outer glow ring
                svg.append('circle')
                    .attr('cx', proj[0])
                    .attr('cy', proj[1])
                    .attr('r', radius * 1.5)
                    .attr('fill', color)
                    .attr('opacity', intensity * 0.3)
                    .attr('filter', 'url(#glow)')
                    .style('pointer-events', 'none');
                
                // Inner hot core
                svg.append('circle')
                    .attr('cx', proj[0])
                    .attr('cy', proj[1])
                    .attr('r', radius)
                    .attr('fill', color)
                    .attr('opacity', intensity)
                    .attr('filter', 'url(#glow)')
                    .style('pointer-events', 'none');
                
                // Center bright spot
                svg.append('circle')
                    .attr('cx', proj[0])
                    .attr('cy', proj[1])
                    .attr('r', radius * 0.3)
                    .attr('fill', '#fff')
                    .attr('opacity', intensity * 0.8)
                    .style('pointer-events', 'none');
            }
        }
    });

    // --- Active Attacks Layer ---
    // Slice based on density setting
    const activeAttacks = filteredAttacks.slice(-density);

    activeAttacks.forEach((attack) => {
      const sourceCoords: [number, number] = [attack.source.lng, attack.source.lat];
      const targetCoords: [number, number] = [attack.target.lng, attack.target.lat];

      const link = { type: 'LineString', coordinates: [sourceCoords, targetCoords] };
      
      // Calculate visibility
      let isVisible = true;
      if (viewMode === 'GLOBE') {
          // Check if center is visible for globe (clip angle)
          const center = d3.geoInterpolate(sourceCoords, targetCoords)(0.5);
          isVisible = d3.geoDistance(center as any, projection.invert!([width/2, height/2])!) < 1.57;
      }

      if (isVisible) {
          // 1. Static Arc Path (Dynamic Thickness & Opacity)
          const arcWidth = 0.5 + (attack.magnitude / 4);
          const arcOpacity = 0.15 + (attack.magnitude / 20);

          svg.append('path')
            .datum(link)
            .attr('d', path as any)
            .attr('fill', 'none')
            .attr('stroke', ATTACK_COLORS[attack.type])
            .attr('stroke-width', arcWidth)
            .attr('stroke-opacity', arcOpacity); 

          // 2. Animated Packet with Particle Trail
          // Calculate position based on time and speed
          const duration = 2000 / speed; 
          const interpolator = d3.geoInterpolate(sourceCoords, targetCoords);
          const progress = (Date.now() - attack.timestamp) % duration / duration;
          const currentPos = interpolator(progress);
          const currentProj = projection(currentPos);

          if (currentProj) {
             // Check visibility of the specific packet point
             const isPacketVisible = viewMode === 'PLANAR' || d3.geoDistance(currentPos, projection.invert!([width/2, height/2])!) < 1.57;
             
             if (isPacketVisible) {
                 const baseRadius = 1.5 + (attack.magnitude / 3);
                 // Pulse Effect: Frequency increases with magnitude
                 const pulseFrequency = 400 - (attack.magnitude * 25);
                 const pulse = (Math.sin(Date.now() / pulseFrequency) + 1) / 2;
                 
                 // ✨ PARTICLE TRAIL - Draw trailing particles behind the main packet
                 const trailCount = Math.min(8, 3 + Math.floor(attack.magnitude / 2));
                 for (let i = 1; i <= trailCount; i++) {
                   const trailProgress = Math.max(0, progress - (i * 0.03));
                   const trailPos = interpolator(trailProgress);
                   const trailProj = projection(trailPos);
                   
                   if (trailProj) {
                     const trailVisible = viewMode === 'PLANAR' || d3.geoDistance(trailPos, projection.invert!([width/2, height/2])!) < 1.57;
                     if (trailVisible) {
                       const trailRadius = baseRadius * (1 - (i / (trailCount + 1)) * 0.7);
                       const trailOpacity = (0.5 - (i / trailCount) * 0.4) * (attack.magnitude / 10);
                       
                       svg.append('circle')
                         .attr('cx', trailProj[0])
                         .attr('cy', trailProj[1])
                         .attr('r', trailRadius)
                         .attr('fill', ATTACK_COLORS[attack.type])
                         .attr('opacity', trailOpacity)
                         .style('filter', 'url(#glow)');
                     }
                   }
                 }
                 
                 // Pulsing Outer Glow
                 svg.append('circle')
                    .attr('cx', currentProj[0])
                    .attr('cy', currentProj[1])
                    .attr('r', baseRadius * (1 + (pulse * 0.8)))
                    .attr('fill', ATTACK_COLORS[attack.type])
                    .attr('opacity', (0.6 - (pulse * 0.4)) * (attack.magnitude / 10))
                    .style('filter', 'url(#glow)');

                 // Inner Solid Core
                 svg.append('circle')
                    .attr('cx', currentProj[0])
                    .attr('cy', currentProj[1])
                    .attr('r', baseRadius)
                    .attr('fill', '#fff')
                    .attr('stroke', ATTACK_COLORS[attack.type])
                    .attr('stroke-width', 1 + (attack.magnitude / 5))
                    .style('filter', 'url(#glow)');
                 
                 // 🎆 IMPACT EFFECT - Trigger when packet reaches near target (progress > 0.95)
                 if (progress > 0.95 && progress < 0.98) {
                   const targetProj = projection(targetCoords);
                   if (targetProj) {
                     // Add impact effect (handled by React state)
                     addImpactEffect(targetProj[0], targetProj[1], ATTACK_COLORS[attack.type], attack.id);
                   }
                 }
             }
          }
            
          // 3. Invisible Interaction Path (Fat)
          svg.append('path')
            .datum(link)
            .attr('d', path as any)
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', Math.max(15, 10 + attack.magnitude)) // Wider click area for big attacks
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
                 isHovering.current = true; // Pause rotation
                 if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                 setTooltip({
                    x: event.clientX,
                    y: event.clientY,
                    content: (
                        <div className="w-72 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-2xl pointer-events-auto transition-colors duration-300">
                            <div className="h-1 w-full" style={{ background: ATTACK_COLORS[attack.type] }}></div>
                            <div className="p-3">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm flex items-center gap-2">
                                        {getAttackIcon(attack.type)}
                                        {attack.type}
                                    </span>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono">{attack.id.split('-').pop()}</span>
                                </div>
                                <div className="space-y-3 text-xs font-mono">
                                    
                                    {/* Enhanced Source Intelligence */}
                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded p-2 border border-slate-200 dark:border-slate-700/50">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> Source Intelligence
                                        </div>
                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                                            <span className="text-slate-500 dark:text-slate-500 text-right font-bold">IP:</span>
                                            <span className="text-cyan-700 dark:text-cyan-300 font-bold tracking-wide">{attack.ip}</span>
                                            
                                            <span className="text-slate-500 dark:text-slate-500 text-right font-bold">LOC:</span>
                                            <span className="text-slate-700 dark:text-slate-200">{attack.source.city}, {attack.source.country}</span>
                                            
                                            <span className="text-slate-500 dark:text-slate-500 text-right font-bold">GEO:</span>
                                            <span className="text-slate-400 dark:text-slate-400 text-[10px] font-mono tracking-tight">
                                                {attack.source.lat.toFixed(4)}°, {attack.source.lng.toFixed(4)}°
                                            </span>
                                        </div>
                                    </div>

                                    {/* Target Info */}
                                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 px-1">
                                        <span className="text-slate-500 font-bold">TARGET</span>
                                        <span className="text-red-500 dark:text-red-300 font-bold">{attack.target.city}, {attack.target.country}</span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded">
                                            <div className="text-[9px] text-slate-500 uppercase mb-1">Magnitude</div>
                                            <div className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                                {attack.magnitude}/10
                                                <div className="flex gap-0.5 h-2">
                                                    {Array.from({length: 5}).map((_, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={`w-1 rounded-sm ${i < attack.magnitude/2 ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded">
                                            <div className="text-[9px] text-slate-500 uppercase mb-1">Timestamp</div>
                                            <div className="text-slate-900 dark:text-white font-bold text-[10px]">{new Date(attack.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAnalyze(attack);
                                            setTooltip(null);
                                        }}
                                        className="mt-2 w-full bg-cyan-100 dark:bg-cyan-900/40 hover:bg-cyan-200 dark:hover:bg-cyan-800 border border-cyan-200 dark:border-cyan-700/50 text-cyan-700 dark:text-cyan-300 text-[10px] py-1.5 px-2 rounded transition-colors flex items-center justify-center gap-1.5 group font-bold"
                                    >
                                        <Bot className="w-3 h-3 group-hover:animate-pulse" />
                                        ANALYZE THREAT
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                 });
            })
            .on('mouseout', () => {
                isHovering.current = false; // Resume rotation
                tooltipTimeoutRef.current = window.setTimeout(() => setTooltip(null), 300);
            });
      }

      // Helper to draw source/target dots
      const drawDot = (coords: [number, number], color: string, radius: number, isTarget: boolean) => {
        const proj = projection(coords);
        if (proj) {
            let isDotVisible = true;
            if (viewMode === 'GLOBE') {
                isDotVisible = d3.geoDistance(coords, projection.invert!([width/2, height/2])!) < 1.57;
            }

            if (!isDotVisible) return;

            const circle = svg.append('circle')
                .attr('cx', proj[0])
                .attr('cy', proj[1])
                .attr('r', radius)
                .attr('fill', color)
                .attr('opacity', 0.8)
                .attr('stroke', isTarget ? '#ef4444' : 'none')
                .attr('stroke-width', isTarget ? 1 : 0)
                .style('cursor', 'pointer');

            // Simplified tooltip for dots
            circle.on('mouseover', (event) => {
                 isHovering.current = true; // Pause rotation
                 if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                 const city = isTarget ? attack.target : attack.source;
                 setTooltip({
                    x: event.clientX,
                    y: event.clientY,
                    content: (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded shadow-lg backdrop-blur-sm text-xs pointer-events-none">
                             <div className="font-bold text-slate-900 dark:text-white mb-1">{city.city}</div>
                             <div className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{city.country}</div>
                        </div>
                    )
                 });
            })
            .on('mouseout', () => {
                isHovering.current = false; // Resume rotation
                tooltipTimeoutRef.current = window.setTimeout(() => setTooltip(null), 300);
            });
        }
      };

      drawDot(sourceCoords, ATTACK_COLORS[attack.type], 3, false);
      drawDot(targetCoords, isDark ? '#fff' : '#000', 3, true);

    });

  }, [worldData, countryLabels, rotation, scale, attacks, viewMode, minMagnitude, speed, density, selectedType, onAnalyze, isDark, countryStats, stars]);

  // Retry loading map data
  const retryLoad = () => loadMap();

  // Loading State
  if (isLoading) {
    return (
      <div ref={wrapperRef} className="w-full h-full min-h-[300px] relative overflow-hidden bg-white/50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <h3 className="text-slate-700 dark:text-slate-300 font-medium mb-1">Loading Threat Map</h3>
          <p className="text-slate-500 text-sm">Fetching global topology data...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (loadError) {
    return (
      <div ref={wrapperRef} className="w-full h-full min-h-[300px] relative overflow-hidden bg-white/50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl transition-colors duration-300 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-slate-700 dark:text-slate-300 font-medium mb-1">Failed to Load Map</h3>
          <p className="text-slate-500 text-sm mb-4">{loadError}</p>
          <button
            onClick={retryLoad}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`w-full h-full min-h-[300px] relative overflow-hidden bg-white/50 dark:bg-slate-950/50 rounded-xl shadow-lg dark:shadow-2xl transition-colors duration-300 ${isReplayMode ? 'border-2 border-orange-500' : 'border border-slate-200 dark:border-slate-800'}`}>
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className={`font-bold tracking-widest uppercase text-sm ${isReplayMode ? 'text-orange-500' : 'text-cyan-600 dark:text-cyan-400'}`}>
          {isReplayMode ? 'Replay Mode' : 'Live Threat'} {viewMode === 'GLOBE' ? 'Globe' : 'Map'}
        </h2>
        <div className="text-[10px] text-slate-500 hidden sm:block">
            {isReplayMode ? (
              <span className="text-orange-500 font-mono">
                {replayTimestamp ? new Date(replayTimestamp).toLocaleTimeString() : 'Paused'}
              </span>
            ) : (
              <>
                Interactive • Left-click Drag to Rotate • Scroll Wheel to Zoom
                {isDragging.current && <span className="text-cyan-600 dark:text-cyan-500 ml-2 animate-pulse">LIVE CONTROL</span>}
              </>
            )}
        </div>
      </div>

      {/* 📍 Quick Region Navigation */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowRegionMenu(!showRegionMenu)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg ${
            showRegionMenu 
              ? 'bg-cyan-500 text-white' 
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'
          }`}
          title="Quick navigation to regions"
        >
          <Navigation className="w-3 h-3" />
          {REGION_PRESETS[activeRegion]?.name || 'Region'}
        </button>
        
        {showRegionMenu && (
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[120px] animate-fade-in">
            {Object.entries(REGION_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => navigateToRegion(key)}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors ${
                  activeRegion === key 
                    ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-3 h-3" />
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🎆 Impact Effects Overlay */}
      {impactEffects.map((effect) => {
        const elapsed = Date.now() - effect.startTime;
        const progress = Math.min(elapsed / 1000, 1);
        const scale = 1 + progress * 3;
        const opacity = 1 - progress;
        
        return (
          <div
            key={effect.id}
            className="absolute pointer-events-none"
            style={{
              left: effect.x,
              top: effect.y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity: opacity,
            }}
          >
            {/* Outer ring */}
            <div 
              className="w-8 h-8 rounded-full border-2 animate-ping"
              style={{ borderColor: effect.color }}
            />
            {/* Inner burst */}
            <div 
              className="absolute inset-0 w-8 h-8 rounded-full"
              style={{ 
                background: `radial-gradient(circle, ${effect.color}80 0%, transparent 70%)`,
              }}
            />
          </div>
        );
      })}

      {/* Controls Panel - Responsive: collapsible or smaller on small screens */}
      <div className="absolute bottom-4 left-4 z-30 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 w-48 md:w-56 shadow-xl backdrop-blur-md space-y-3 max-h-[50%] overflow-y-auto scrollbar-thin transition-colors duration-300">
         
         {/* Magnitude Slider */}
         <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Sliders className="w-3 h-3" /> Min Mag
                </span>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{minMagnitude}</span>
            </div>
            <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={minMagnitude}
                onChange={(e) => setMinMagnitude(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
         </div>

         {/* Animation Speed Slider */}
         <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Speed
                </span>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{speed}x</span>
            </div>
            <input 
                type="range" 
                min="0.1" 
                max="5" 
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
         </div>

         {/* Density Dropdown */}
         <div>
             <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Density
                </span>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{density}</span>
            </div>
            <select 
                value={density}
                onChange={(e) => setDensity(parseInt(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[10px] text-slate-700 dark:text-slate-300 p-1.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
                <option value={10}>Low (10)</option>
                <option value={20}>Medium (20)</option>
                <option value={50}>High (50)</option>
                <option value={100}>Extreme (100)</option>
            </select>
         </div>

         {/* Attack Type Dropdown */}
         <div>
             <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Type
                </span>
            </div>
            <select 
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value as AttackType | 'ALL')}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[10px] text-slate-700 dark:text-slate-300 p-1.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
                <option value="ALL">All Threat Vectors</option>
                {Object.values(AttackType).map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
         </div>

      </div>
      
      <svg
        ref={svgRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onClick={() => {
          // Don't fire onClick if we just finished dragging
          if (dragStarted.current) {
            dragStarted.current = false;
            return;
          }
          // Reset hovering state when clicking on background
          isHovering.current = false;
          setTooltip(null);
        }}
      />

      {/* Tooltip */}
      {tooltip && (
          <div 
            className="fixed z-50 transform -translate-x-1/2 -translate-y-full mt-[-10px] pointer-events-auto"
            style={{ left: tooltip.x, top: tooltip.y }}
            onMouseEnter={() => {
                isHovering.current = true; // Pause rotation while on tooltip
                if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
            }}
            onMouseLeave={() => {
                isHovering.current = false; // Resume rotation
                tooltipTimeoutRef.current = window.setTimeout(() => setTooltip(null), 300);
            }}
          >
              {tooltip.content}
          </div>
      )}
    </div>
  );
};

export default React.memo(ThreatMap);