import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, animate, useMotionValue } from 'framer-motion';
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  useMapContext,
} from 'react-simple-maps';
import { merge as topoMerge } from 'topojson-client';
import type { Topology, GeometryObject } from 'topojson-specification';
import { useAppState } from '../../hooks/useAppState';
import { countryGeoConfigs } from '../../data/countryGeoConfig';
import type { CountryGeoConfig } from '../../types/country';
import { AttackVectors } from './AttackVectors';
import { USCard } from './USCard';
import { DashEffect } from './DashEffect';
import { TimelineModal } from '../TimelineModal/TimelineModal';
import type { CountryKey } from '../../types/country';
import styles from './InteractiveMap.module.css';

const GEO_URL = '/countries-50m.json';

const DEFAULT_CENTER: [number, number] = [35, 31];
const DEFAULT_SCALE = 900;

const ZOOM_FACTOR = 562;
const ZOOM_CAP = 6000;

function geoToSVG(lon: number, lat: number): [number, number] {
  const s = DEFAULT_SCALE;
  const [cLon, cLat] = DEFAULT_CENTER;
  const cLatRad = cLat * Math.PI / 180;
  const latRad  = lat  * Math.PI / 180;
  const x = 400 + s * (lon - cLon) * Math.PI / 180;
  const y = 225 - s * (
    Math.log(Math.tan(Math.PI / 4 + latRad  / 2)) -
    Math.log(Math.tan(Math.PI / 4 + cLatRad / 2))
  );
  return [x, y];
}

const COUNTRY_SVG_POS: Record<string, [number, number]> = {};
for (const cfg of countryGeoConfigs) {
  COUNTRY_SVG_POS[cfg.key] = geoToSVG(cfg.center[0], cfg.center[1]);
}

const NAME_TO_KEY: Record<string, CountryKey> = {
  'Iran': 'iran',
  'Israel': 'israel',
  'Lebanon': 'lebanon',
  'Syria': 'syria',
  'Turkey': 'turkey',
  'Cyprus': 'cyprus',
  'Egypt': 'egypt',
  'Jordan': 'jordan',
  'Saudi Arabia': 'saudi',
  'Iraq': 'iraq',
  'United Arab Emirates': 'uae',
  'Bahrain': 'bahrain',
  'Kuwait': 'kuwait',
  'Qatar': 'qatar',
  'Yemen': 'yemen',
  'Oman': 'oman',
};

// These TopoJSON feature names are dissolved into a single seamless shape.
// They must NOT be in NAME_TO_KEY — the merged feature replaces them.
const MERGE_GROUPS: { key: CountryKey; names: string[] }[] = [
  { key: 'israel', names: ['Israel', 'Palestine'] },
  { key: 'cyprus', names: ['Cyprus', 'N. Cyprus'] },
];
const ALL_MERGE_NAMES = new Set(MERGE_GROUPS.flatMap(g => g.names));

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 28, mass: 0.7 };

// ── Inner component: must live inside ComposableMap to access map context ──
// Calls useMapContext() to get the d3 geoPath function, computes svgPath,
// then renders a Geography with the seamlessly merged shape.
interface MergedGeoProps {
  geoFeature: object;
  countryKey: CountryKey;
  config: CountryGeoConfig | undefined;
  isSelected: boolean;
  isHovered: boolean;
  interactive: boolean;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function MergedGeography({
  geoFeature, config, isSelected, isHovered, interactive,
  onClick, onMouseEnter, onMouseLeave,
}: MergedGeoProps) {
  // useMapContext() only works inside ComposableMap — this component is always nested there
  const { path } = useMapContext() as { path: (geo: object) => string };

  const geoWithPath = useMemo(
    () => ({ ...(geoFeature as object), svgPath: path(geoFeature) }),
    // path is stable (fixed projection), geoFeature changes only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geoFeature],
  );

  const fill = isSelected || isHovered
    ? config?.highlightColor ?? '#333'
    : config?.fillColor ?? '#161616';

  const stroke = isSelected ? '#c9a84c' : isHovered ? '#FFFF00' : '#333';
  const strokeWidth = isSelected ? 1.5 : isHovered ? 2 : 0.6;

  const computedStyle = {
    fill, stroke, strokeWidth, outline: 'none',
    cursor: interactive ? 'pointer' : ('default' as const),
  };

  return (
    <Geography
      geography={geoWithPath}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        default: computedStyle,
        hover:   computedStyle,
        pressed: {
          fill:        config?.highlightColor ?? '#161616',
          stroke:      '#c9a84c',
          strokeWidth: 2,
          outline:     'none',
        },
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────

export function InteractiveMap() {
  const { selectCountry, selectedCountry } = useAppState();
  const [hoveredCountry, setHoveredCountry] = useState<CountryKey | null>(null);
  const [dashEffect, setDashEffect] = useState<{ active: boolean; x: number; y: number }>(
    { active: false, x: 0, y: 0 },
  );
  const isZoomingRef = useRef(false);
  const [isZooming, setIsZooming] = useState(false);

  // Merged GeoJSON features produced by topojson.merge() — no internal borders
  const [mergedFeatures, setMergedFeatures] = useState<{ key: CountryKey; geo: object }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const scaleM = useMotionValue(1);
  const xM     = useMotionValue(0);
  const yM     = useMotionValue(0);
  const animRefs = useRef<{ stop: () => void }[]>([]);
  const stopAll = () => { animRefs.current.forEach(a => a.stop()); animRefs.current = []; };

  const configMap = useMemo(() => {
    const map = new Map<string, CountryGeoConfig>();
    for (const c of countryGeoConfigs) map.set(c.key, c);
    return map;
  }, []);

  // ── Fetch topology once and dissolve shared arcs with topojson.merge() ───
  useEffect(() => {
    fetch(GEO_URL)
      .then(r => r.json())
      .then((topo: Topology) => {
        const objKey = Object.keys(topo.objects)[0];
        const allGeoms = (topo.objects[objKey] as { geometries: GeometryObject[] }).geometries;

        const features = MERGE_GROUPS.map(({ key, names }) => {
          const geoms = allGeoms.filter(
            g => names.includes((g as { properties?: { name?: string } }).properties?.name ?? ''),
          );
          if (geoms.length === 0) return null;
          // merge() dissolves the shared arc between Israel/Palestine and Cyprus/N.Cyprus
          const geometry = topoMerge(topo, geoms);
          return {
            key,
            geo: { type: 'Feature', properties: { name: names[0] }, geometry } as object,
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null);

        setMergedFeatures(features);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const zoomTo = (
    target: { svgX: number; svgY: number; cssScale: number } | null,
    onDone?: () => void,
  ) => {
    stopAll();
    isZoomingRef.current = true;
    setIsZooming(true);
    let settled = 0;
    const onOne = () => {
      if (++settled === 3) { isZoomingRef.current = false; setIsZooming(false); onDone?.(); }
    };
    if (target === null) {
      animRefs.current = [
        animate(scaleM, 1, { ...SPRING, onComplete: onOne }),
        animate(xM, 0,     { ...SPRING, onComplete: onOne }),
        animate(yM, 0,     { ...SPRING, onComplete: onOne }),
      ];
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { width: W, height: H } = rect;
    const vpX = target.svgX / 800 * W;
    const vpY = target.svgY / 450 * H;
    const S   = target.cssScale;
    let tx = -(vpX - W / 2) * S;
    let ty = -(vpY - H / 2) * S;
    const maxTx = W / 2 * (S - 1);
    const maxTy = H / 2 * (S - 1);
    tx = Math.max(-maxTx, Math.min(maxTx, tx));
    ty = Math.max(-maxTy, Math.min(maxTy, ty));
    animRefs.current = [
      animate(scaleM, S,  { ...SPRING, onComplete: onOne }),
      animate(xM,     tx, { ...SPRING, onComplete: onOne }),
      animate(yM,     ty, { ...SPRING, onComplete: onOne }),
    ];
  };

  const handleCountryClick = (config: CountryGeoConfig, key: CountryKey, e: React.MouseEvent) => {
    if (isZoomingRef.current || selectedCountry) return;
    const cRect = containerRef.current?.getBoundingClientRect();
    const relX = e.clientX - (cRect?.left ?? 0);
    const relY = e.clientY - (cRect?.top ?? 0);
    setDashEffect({ active: true, x: relX, y: relY });
    setTimeout(() => setDashEffect({ active: false, x: 0, y: 0 }), 500);
    const W = cRect?.width ?? 800;
    const H = cRect?.height ?? 450;
    const svgX = relX / W * 800;
    const svgY = relY / H * 450;
    const cssScale = Math.min(config.zoomLevel * ZOOM_FACTOR, ZOOM_CAP) / DEFAULT_SCALE;
    zoomTo({ svgX, svgY, cssScale }, () => { selectCountry(key); });
  };

  const handleUSClick = (e: React.MouseEvent) => {
    if (isZoomingRef.current || selectedCountry) return;
    const cRect = containerRef.current?.getBoundingClientRect();
    setDashEffect({ active: true, x: e.clientX - (cRect?.left ?? 0), y: e.clientY - (cRect?.top ?? 0) });
    setTimeout(() => setDashEffect({ active: false, x: 0, y: 0 }), 500);
    setTimeout(() => selectCountry('usa'), 450);
  };

  const handleCloseModal = () => { selectCountry(null); zoomTo(null); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCountry) handleCloseModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  return (
    <div className={styles.container} ref={containerRef}>
      <DashEffect active={dashEffect.active} x={dashEffect.x} y={dashEffect.y} />

      <motion.div className={styles.mapWrapper} style={{ scale: scaleM, x: xM, y: yM }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: DEFAULT_CENTER, scale: DEFAULT_SCALE }}
          className={styles.map}
        >
          <Sphere id="ocean-sphere" fill="#1a2b3c" stroke="none" strokeWidth={0} />

          {/* Regular countries — Palestine and N.Cyprus are skipped here */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter(geo => !ALL_MERGE_NAMES.has(geo.properties.name as string))
                .map((geo) => {
                  const geoName = geo.properties.name as string;
                  const key = NAME_TO_KEY[geoName];
                  const config = key ? configMap.get(key) : undefined;
                  const isTarget   = !!key;
                  const isSelected = key === selectedCountry;
                  const interactive = isTarget && !isZooming && !selectedCountry;
                  const isHovered  = interactive && key === hoveredCountry;

                  const fill = isSelected || isHovered
                    ? config?.highlightColor ?? '#333'
                    : config ? config.fillColor : '#161616';
                  const stroke = isSelected ? '#c9a84c' : isHovered ? '#FFFF00'
                    : isTarget ? '#333' : '#1a1a1a';
                  const strokeWidth = isSelected ? 1.5 : isHovered ? 2 : isTarget ? 0.6 : 0.3;
                  const computedStyle = {
                    fill, stroke, strokeWidth, outline: 'none',
                    cursor: interactive ? 'pointer' : ('default' as const),
                  };

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={(e) =>
                        interactive && config &&
                        handleCountryClick(config, key, e as unknown as React.MouseEvent)
                      }
                      onMouseEnter={() => interactive && setHoveredCountry(key)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      style={{
                        default: computedStyle,
                        hover:   computedStyle,
                        pressed: {
                          fill: isTarget ? config?.highlightColor ?? '#333' : '#161616',
                          stroke: isTarget ? '#c9a84c' : '#1a1a1a',
                          strokeWidth: isTarget ? 2 : 0.3,
                          outline: 'none',
                        },
                      }}
                    />
                  );
                })
            }
          </Geographies>

          {/* Seamlessly merged countries — rendered after topology.merge() resolves */}
          {mergedFeatures.map(({ key, geo }) => {
            const config     = configMap.get(key);
            const isSelected = key === selectedCountry;
            const interactive = !isZooming && !selectedCountry;
            const isHovered  = interactive && key === hoveredCountry;
            return (
              <MergedGeography
                key={`merged-${key}`}
                geoFeature={geo}
                countryKey={key}
                config={config}
                isSelected={isSelected}
                isHovered={isHovered}
                interactive={interactive}
                onClick={(e) =>
                  interactive && config &&
                  handleCountryClick(config, key, e)
                }
                onMouseEnter={() => interactive && setHoveredCountry(key)}
                onMouseLeave={() => setHoveredCountry(null)}
              />
            );
          })}

          <AttackVectors />
        </ComposableMap>
      </motion.div>

      <USCard onClick={handleUSClick} />

      {!selectedCountry && !isZooming && (
        <div className={styles.instruction}>לחץ על מדינה לצפייה בציר הזמן</div>
      )}

      {hoveredCountry && !selectedCountry && !isZooming && (
        <div className={styles.tooltip}>
          {countryGeoConfigs.find(c => c.key === hoveredCountry)?.hebrewName}
        </div>
      )}

      <TimelineModal country={selectedCountry} onClose={handleCloseModal} />
    </div>
  );
}
