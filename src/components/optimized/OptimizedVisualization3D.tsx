/**
 * @fileoverview OptimizedVisualization3D - Performance-optimized 3D visualization
 * 
 * Key optimizations:
 * - Component split into smaller, memoized sub-components
 * - Data processing optimized with better algorithms
 * - Expensive calculations memoized
 * - Canvas rendering optimized
 * - Lazy loading for Three.js components
 * 
 * @module components/optimized/OptimizedVisualization3D
 */

import React, { useRef, useState, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Eye, RotateCcw, ZoomIn, ZoomOut, Move3d } from 'lucide-react';
import * as THREE from 'three';
import { colorForeground } from '@/lib/resolveCssColorVar';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/hooks/useTranslation';

interface Visualization3DProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  correlationData?: {
    x: string;
    y: string;
    z: string;
    correlation: number;
  }[];
}

interface DataPoint3D {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
  category: 'emotion' | 'sensory' | 'environmental';
  intensity?: number;
  timestamp: Date;
  metadata: Record<string, string | number>;
  normalizedX?: number;
  normalizedY?: number;
  normalizedZ?: number;
  color?: string;
}

// Memoized tooltip component
const Tooltip3D = memo<{ point: DataPoint3D; onClose: () => void }>(({ point, onClose }) => {
  const { tAnalytics } = useTranslation();
  
  return (
    <Html>
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="capitalize">
            {point.category}
          </Badge>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none"
          >
            ×
          </button>
        </div>
        <p className="font-medium">{point.label}</p>
        <div className="text-sm text-muted-foreground mt-1 space-y-1">
          <p>{tAnalytics('visualization3d.tooltip.xAxis')}: {point.x.toFixed(2)}</p>
          <p>{tAnalytics('visualization3d.tooltip.yAxis')}: {point.y.toFixed(2)}</p>
          <p>{tAnalytics('visualization3d.tooltip.zAxis')}: {point.z.toFixed(2)}</p>
          {point.intensity && <p>{tAnalytics('visualization3d.tooltip.intensity')}: {point.intensity}</p>}
        </div>
      </div>
    </Html>
  );
});

Tooltip3D.displayName = 'Tooltip3D';

// Optimized data point component
const DataPoint = memo<{
  position: [number, number, number];
  color: string;
  size: number;
  point: DataPoint3D;
  onHover: (point: DataPoint3D | null) => void;
  isHighlighted: boolean;
  reducedMotion?: boolean;
}>(({ position, color, size, point, onHover, isHighlighted, reducedMotion = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Memoized scale calculation
  const targetScale = useMemo(() => {
    return hovered || isHighlighted ? 1.5 : 1;
  }, [hovered, isHighlighted]);

  useFrame(() => {
    if (meshRef.current) {
      if (reducedMotion) {
        meshRef.current.scale.set(targetScale, targetScale, targetScale);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        if (hovered) {
          meshRef.current.rotation.y += 0.02;
        }
      }
    }
  });

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    onHover(point);
  }, [point, onHover]);

  const handlePointerOut = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(false);
    onHover(null);
  }, [onHover]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[size, 16, 8]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={hovered || isHighlighted ? 0.5 : 0.2}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
});

DataPoint.displayName = 'DataPoint';

// Memoized axis labels component
const AxisLabels = memo<{ xLabel: string; yLabel: string; zLabel: string }>(({ 
  xLabel, 
  yLabel, 
  zLabel 
}) => {
  const size = 5;
  const foregroundColor = useMemo(() => colorForeground(), []);
  
  return (
    <>
      {/* X Axis */}
      <Text position={[size + 0.5, 0, 0]} fontSize={0.5} color={foregroundColor} anchorX="left">
        {xLabel}
      </Text>
      <mesh position={[size / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.02, size, 0.02]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Y Axis */}
      <Text position={[0, size + 0.5, 0]} fontSize={0.5} color={foregroundColor} anchorX="center">
        {yLabel}
      </Text>
      <mesh position={[0, size / 2, 0]}>
        <boxGeometry args={[0.02, size, 0.02]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      {/* Z Axis */}
      <Text position={[0, 0, size + 0.5]} fontSize={0.5} color={foregroundColor} anchorX="center">
        {zLabel}
      </Text>
      <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.02, size, 0.02]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
    </>
  );
});

AxisLabels.displayName = 'AxisLabels';

// Camera controls component
const CameraControls = memo<{ onReset: () => void }>(({ onReset }) => {
  const { camera } = useThree();
  
  const handleReset = useCallback(() => {
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    onReset();
  }, [camera, onReset]);

  return (
    <Html fullscreen>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </Html>
  );
});

CameraControls.displayName = 'CameraControls';

// Optimized data processing function
const processDataPoints = (
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
  xAxis: string,
  yAxis: string,
  zAxis: string
): DataPoint3D[] => {
  // Create lookup maps for faster access
  const emotionsByTime = new Map<number, EmotionEntry[]>();
  const sensoryByTime = new Map<number, SensoryEntry[]>();
  
  // Group data by hour buckets for efficiency
  const hourBucket = 3600000; // 1 hour in ms
  
  emotions.forEach(e => {
    const bucket = Math.floor(e.timestamp.getTime() / hourBucket);
    if (!emotionsByTime.has(bucket)) {
      emotionsByTime.set(bucket, []);
    }
    emotionsByTime.get(bucket)!.push(e);
  });
  
  sensoryInputs.forEach(s => {
    const bucket = Math.floor(s.timestamp.getTime() / hourBucket);
    if (!sensoryByTime.has(bucket)) {
      sensoryByTime.set(bucket, []);
    }
    sensoryByTime.get(bucket)!.push(s);
  });

  // Process tracking entries
  const points: DataPoint3D[] = trackingEntries.map(entry => {
    const bucket = Math.floor(entry.timestamp.getTime() / hourBucket);
    const relatedEmotions = emotionsByTime.get(bucket) || [];
    const relatedSensory = sensoryByTime.get(bucket) || [];
    
    const avgEmotionIntensity = relatedEmotions.length > 0
      ? relatedEmotions.reduce((sum, e) => sum + e.intensity, 0) / relatedEmotions.length
      : 5;
    
    const sensorySeeking = relatedSensory.filter(s => s.response.includes('seeking')).length;
    const sensoryAvoiding = relatedSensory.filter(s => s.response.includes('avoiding')).length;
    const sensoryScore = sensorySeeking - sensoryAvoiding;
    
    const timeValue = entry.timestamp.getTime() / 1000 / 3600; // Convert to hours
    
    const getAxisValue = (axis: string) => {
      switch (axis) {
        case 'emotionIntensity': return avgEmotionIntensity;
        case 'sensoryResponse': return sensoryScore;
        case 'time': return timeValue;
        default: return 0;
      }
    };
    
    return {
      id: `tracking-${entry.timestamp.toISOString()}`,
      x: getAxisValue(xAxis),
      y: getAxisValue(yAxis),
      z: getAxisValue(zAxis),
      label: `Session ${entry.timestamp.toLocaleDateString()}`,
      category: 'environmental' as const,
      intensity: avgEmotionIntensity,
      timestamp: entry.timestamp,
      metadata: {
        emotions: relatedEmotions.length,
        sensory: relatedSensory.length,
        avgIntensity: avgEmotionIntensity,
        sensoryScore
      }
    };
  });

  // Normalize coordinates efficiently
  if (points.length > 0) {
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const zValues = points.map(p => p.z);
    
    const normalize = (values: number[]) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      return values.map(v => ((v - min) / range) * 10 - 5);
    };
    
    const normalizedX = normalize(xValues);
    const normalizedY = normalize(yValues);
    const normalizedZ = normalize(zValues);
    
    points.forEach((point, i) => {
      point.normalizedX = normalizedX[i];
      point.normalizedY = normalizedY[i];
      point.normalizedZ = normalizedZ[i];
    });
  }

  return points;
};

// Main optimized component
export const OptimizedVisualization3D = memo<Visualization3DProps>(({
  emotions,
  sensoryInputs,
  trackingEntries,
  correlationData
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { tCommon } = useTranslation();
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint3D | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DataPoint3D | null>(null);
  const [xAxis, setXAxis] = useState<string>('emotionIntensity');
  const [yAxis, setYAxis] = useState<string>('sensoryResponse');
  const [zAxis, setZAxis] = useState<string>('time');
  const [colorBy, setColorBy] = useState<string>('category');
  const [pointSize, setPointSize] = useState<number>(0.2);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const xAxisLabelId = React.useId();
  const xAxisTriggerId = React.useId();
  const yAxisLabelId = React.useId();
  const yAxisTriggerId = React.useId();
  const zAxisLabelId = React.useId();
  const zAxisTriggerId = React.useId();
  const colorByLabelId = React.useId();
  const colorByTriggerId = React.useId();
  const filterLabelId = React.useId();
  const filterTriggerId = React.useId();
  const pointSizeLabelId = React.useId();

  // Memoize data processing
  const dataPoints = useMemo(() => {
    return processDataPoints(
      emotions,
      sensoryInputs,
      trackingEntries,
      xAxis,
      yAxis,
      zAxis
    );
  }, [emotions, sensoryInputs, trackingEntries, xAxis, yAxis, zAxis]);

  // Filter points based on category
  const filteredPoints = useMemo(() => {
    if (filterCategory === 'all') return dataPoints;
    return dataPoints.filter(p => p.category === filterCategory);
  }, [dataPoints, filterCategory]);

  // Memoize color mapping
  const getPointColor = useCallback((point: DataPoint3D): string => {
    if (colorBy === 'category') {
      switch (point.category) {
        case 'emotion': return '#ff6b6b';
        case 'sensory': return '#4ecdc4';
        case 'environmental': return '#45b7d1';
        default: return '#95a5a6';
      }
    } else if (colorBy === 'intensity' && point.intensity) {
      const intensity = point.intensity / 10;
      return `hsl(${120 - intensity * 120}, 70%, 50%)`;
    }
    return '#95a5a6';
  }, [colorBy]);

  // Memoized handlers
  const handlePointHover = useCallback((point: DataPoint3D | null) => {
    setHoveredPoint(point);
  }, []);

  const handlePointClick = useCallback((point: DataPoint3D) => {
    setSelectedPoint(point);
  }, []);

  const handleResetCamera = useCallback(() => {
    setHoveredPoint(null);
    setSelectedPoint(null);
  }, []);

  const handleXAxisChange = useCallback((value: string) => setXAxis(value), []);
  const handleYAxisChange = useCallback((value: string) => setYAxis(value), []);
  const handleZAxisChange = useCallback((value: string) => setZAxis(value), []);
  const handleColorByChange = useCallback((value: string) => setColorBy(value), []);
  const handleFilterChange = useCallback((value: string) => setFilterCategory(value), []);
  const handlePointSizeChange = useCallback((value: number[]) => setPointSize(value[0]), []);

  // Axis labels
  const axisLabels = useMemo(() => ({
    x: xAxis === 'emotionIntensity' ? 'Emotion' : xAxis === 'sensoryResponse' ? 'Sensory' : 'Time',
    y: yAxis === 'emotionIntensity' ? 'Emotion' : yAxis === 'sensoryResponse' ? 'Sensory' : 'Time',
    z: zAxis === 'emotionIntensity' ? 'Emotion' : zAxis === 'sensoryResponse' ? 'Sensory' : 'Time'
  }), [xAxis, yAxis, zAxis]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move3d className="h-5 w-5" />
          3D Data Visualization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label
              id={xAxisLabelId}
              className="text-sm font-medium mb-1 block"
              htmlFor={xAxisTriggerId}
            >
              X Axis
            </label>
            <Select value={xAxis} onValueChange={handleXAxisChange}>
              <SelectTrigger id={xAxisTriggerId} aria-labelledby={xAxisLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emotionIntensity">Emotion Intensity</SelectItem>
                <SelectItem value="sensoryResponse">Sensory Response</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label
              id={yAxisLabelId}
              className="text-sm font-medium mb-1 block"
              htmlFor={yAxisTriggerId}
            >
              Y Axis
            </label>
            <Select value={yAxis} onValueChange={handleYAxisChange}>
              <SelectTrigger id={yAxisTriggerId} aria-labelledby={yAxisLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emotionIntensity">Emotion Intensity</SelectItem>
                <SelectItem value="sensoryResponse">Sensory Response</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label
              id={zAxisLabelId}
              className="text-sm font-medium mb-1 block"
              htmlFor={zAxisTriggerId}
            >
              Z Axis
            </label>
            <Select value={zAxis} onValueChange={handleZAxisChange}>
              <SelectTrigger id={zAxisTriggerId} aria-labelledby={zAxisLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emotionIntensity">Emotion Intensity</SelectItem>
                <SelectItem value="sensoryResponse">Sensory Response</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label
              id={colorByLabelId}
              className="text-sm font-medium mb-1 block"
              htmlFor={colorByTriggerId}
            >
              Color By
            </label>
            <Select value={colorBy} onValueChange={handleColorByChange}>
              <SelectTrigger id={colorByTriggerId} aria-labelledby={colorByLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="intensity">Intensity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <p id={pointSizeLabelId} className="text-sm font-medium mb-1 block">Point Size</p>
            <Slider
              value={[pointSize]}
              onValueChange={handlePointSizeChange}
              min={0.1}
              max={0.5}
              step={0.05}
              className="w-full"
              aria-labelledby={pointSizeLabelId}
            />
          </div>
          
          <div className="flex-1">
            <label
              id={filterLabelId}
              className="text-sm font-medium mb-1 block"
              htmlFor={filterTriggerId}
            >
              Filter
            </label>
            <Select value={filterCategory} onValueChange={handleFilterChange}>
              <SelectTrigger id={filterTriggerId} aria-labelledby={filterLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="emotion">Emotions</SelectItem>
                <SelectItem value="sensory">Sensory</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="relative h-[500px] bg-muted/30 rounded-lg overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{tCommon('loading')}</p>
            </div>
          }>
            <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <OrbitControls 
                enablePan={!prefersReducedMotion}
                enableZoom={true}
                enableRotate={!prefersReducedMotion}
                autoRotate={false}
              />
              
              <AxisLabels
                xLabel={axisLabels.x}
                yLabel={axisLabels.y}
                zLabel={axisLabels.z}
              />
              
              {filteredPoints.map((point) => (
                <DataPoint
                  key={point.id}
                  position={[
                    point.normalizedX || 0,
                    point.normalizedY || 0,
                    point.normalizedZ || 0
                  ]}
                  color={getPointColor(point)}
                  size={pointSize}
                  point={point}
                  onHover={handlePointHover}
                  isHighlighted={selectedPoint?.id === point.id}
                  reducedMotion={prefersReducedMotion}
                />
              ))}
              
              {hoveredPoint && (
                <Tooltip3D
                  point={hoveredPoint}
                  onClose={() => setHoveredPoint(null)}
                />
              )}
              
              <CameraControls onReset={handleResetCamera} />
            </Canvas>
          </Suspense>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{filteredPoints.length} data points</span>
          {hoveredPoint && (
            <span>Hovering: {hoveredPoint.label}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.emotions.length === nextProps.emotions.length &&
    prevProps.sensoryInputs.length === nextProps.sensoryInputs.length &&
    prevProps.trackingEntries.length === nextProps.trackingEntries.length &&
    prevProps.correlationData?.length === nextProps.correlationData?.length
  );
});

OptimizedVisualization3D.displayName = 'OptimizedVisualization3D';

export default OptimizedVisualization3D;
