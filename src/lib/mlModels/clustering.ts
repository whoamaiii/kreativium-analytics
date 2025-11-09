import { TrackingEntry } from '../../types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { BaselineCluster } from './types';
import { euclideanDistance, normalizeFeatures } from './utils';

/**
 * Baseline clustering using K-means algorithm.
 * Identifies patterns in tracking data by grouping similar entries.
 *
 * @param trackingEntries - Array of tracking entries to cluster
 * @param numClusters - Number of clusters to create (default: 3)
 * @returns Array of cluster descriptions with centroids and anomaly scores
 * @throws Error if insufficient data points for clustering
 */
export async function performBaselineClustering(
  trackingEntries: TrackingEntry[],
  numClusters: number = 3
): Promise<BaselineCluster[]> {
  if (trackingEntries.length < numClusters) {
    throw new Error('Not enough data points for clustering');
  }

  // Extract features for clustering
  const features = trackingEntries.map(entry => {
    const avgEmotionIntensity = entry.emotions.length > 0
      ? entry.emotions.reduce((sum, e) => sum + e.intensity, 0) / entry.emotions.length
      : 0;

    const cfg = analyticsConfig.getConfig();
    const positiveSet = new Set((cfg.taxonomy?.positiveEmotions || []).map(e => e.toLowerCase()));
    const positiveEmotionRatio = entry.emotions.length > 0
      ? entry.emotions.filter(e => positiveSet.has(e.emotion.toLowerCase())).length / entry.emotions.length
      : 0;

    const sensorySeekingRatio = entry.sensoryInputs.length > 0
      ? entry.sensoryInputs.filter(s => s.response.toLowerCase().includes('seeking')).length / entry.sensoryInputs.length
      : 0;

    const sensoryAvoidingRatio = entry.sensoryInputs.length > 0
      ? entry.sensoryInputs.filter(s => s.response.toLowerCase().includes('avoiding')).length / entry.sensoryInputs.length
      : 0;

    return [
      avgEmotionIntensity / 5, // Normalize to 0-1
      positiveEmotionRatio,
      sensorySeekingRatio,
      sensoryAvoidingRatio
    ];
  });

  // Normalize features
  const normalizedFeatures = normalizeFeatures(features);

  // Perform K-means clustering
  const { centroids, assignments } = await kMeansClustering(normalizedFeatures, numClusters);

  // Calculate anomaly scores
  const clusters: BaselineCluster[] = [];
  for (let i = 0; i < numClusters; i++) {
    const clusterPoints = normalizedFeatures.filter((_, idx) => assignments[idx] === i);
    const avgDistance = clusterPoints.length > 0
      ? clusterPoints.reduce((sum, point) => sum + euclideanDistance(point, centroids[i]), 0) / clusterPoints.length
      : 0;

    // Determine cluster characteristics
    const description = describeCluster(centroids[i]);

    clusters.push({
      clusterId: i,
      centroid: centroids[i],
      description,
      anomalyScore: avgDistance,
      isNormal: avgDistance < 0.5 // Threshold for normal behavior
    });
  }

  return clusters;
}

/**
 * K-means clustering implementation.
 * Partitions data into k clusters by iteratively assigning points to nearest centroids
 * and updating centroids until convergence.
 *
 * @param data - 2D array of data points
 * @param k - Number of clusters
 * @param maxIterations - Maximum iterations before stopping (default: 100)
 * @returns Object containing final centroids and cluster assignments
 */
async function kMeansClustering(
  data: number[][],
  k: number,
  maxIterations: number = 100
): Promise<{ centroids: number[][]; assignments: number[] }> {
  const n = data.length;
  const dimensions = data[0].length;

  // Initialize centroids randomly
  const centroids = initializeCentroids(data, k);
  const assignments = new Array(n).fill(0);
  let previousAssignments = new Array(n).fill(-1);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assignment step
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity;
      let closestCentroid = 0;

      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(data[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = j;
        }
      }

      assignments[i] = closestCentroid;
    }

    // Check for convergence
    if (assignments.every((val, idx) => val === previousAssignments[idx])) {
      break;
    }

    previousAssignments = [...assignments];

    // Update step
    for (let j = 0; j < k; j++) {
      const clusterPoints = data.filter((_, idx) => assignments[idx] === j);
      if (clusterPoints.length > 0) {
        centroids[j] = new Array(dimensions).fill(0).map((_, dim) =>
          clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length
        );
      }
    }
  }

  return { centroids, assignments };
}

/**
 * Initialize centroids using K-means++ algorithm.
 * Selects initial centroids to be far apart, improving convergence.
 *
 * @param data - 2D array of data points
 * @param k - Number of centroids to initialize
 * @returns Array of k initial centroids
 */
function initializeCentroids(data: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const n = data.length;

  // Choose first centroid randomly
  centroids.push([...data[Math.floor(Math.random() * n)]]);

  // Choose remaining centroids
  for (let i = 1; i < k; i++) {
    const distances = data.map(point => {
      const minDist = centroids.reduce((min, centroid) =>
        Math.min(min, euclideanDistance(point, centroid)), Infinity);
      return minDist * minDist;
    });

    // Choose next centroid with probability proportional to squared distance
    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    let randomValue = Math.random() * totalDist;
    let selectedIndex = 0;

    for (let j = 0; j < n; j++) {
      randomValue -= distances[j];
      if (randomValue <= 0) {
        selectedIndex = j;
        break;
      }
    }

    centroids.push([...data[selectedIndex]]);
  }

  return centroids;
}

/**
 * Describe cluster characteristics based on centroid features.
 * Uses configured thresholds to interpret emotional and sensory patterns.
 *
 * @param centroid - Cluster centroid with [emotionIntensity, positiveRatio, seekingRatio, avoidingRatio]
 * @returns Human-readable description of cluster characteristics
 */
function describeCluster(centroid: number[]): string {
  const [emotionIntensity, positiveRatio, seekingRatio, avoidingRatio] = centroid;
  const cfg = analyticsConfig.getConfig();

  // Derive normalized intensity bounds from configured thresholds (assumes 0-5 app scale in features)
  const highIntensityNorm = Math.min(1, cfg.patternAnalysis.highIntensityThreshold / 5);
  const lowIntensityNorm = Math.max(0, (cfg.patternAnalysis.highIntensityThreshold - 2) / 5);

  // Valence thresholds from insights config
  const positiveValence = cfg.insights.POSITIVE_EMOTION_TREND_THRESHOLD;
  const negativeValence = cfg.insights.NEGATIVE_EMOTION_TREND_THRESHOLD;

  // Sensory dominance threshold reuse concern frequency
  const sensoryDominance = cfg.patternAnalysis.concernFrequencyThreshold;

  let description = '';

  // Emotion characteristics
  if (emotionIntensity > highIntensityNorm) {
    description += 'High emotional intensity';
  } else if (emotionIntensity < lowIntensityNorm) {
    description += 'Low emotional intensity';
  } else {
    description += 'Moderate emotional intensity';
  }

  // Emotional valence
  if (positiveRatio > positiveValence) {
    description += ', predominantly positive emotions';
  } else if (positiveRatio < negativeValence) {
    description += ', predominantly challenging emotions';
  } else {
    description += ', mixed emotional states';
  }

  // Sensory patterns
  if (seekingRatio > sensoryDominance) {
    description += ', high sensory seeking';
  } else if (avoidingRatio > sensoryDominance) {
    description += ', high sensory avoiding';
  } else {
    description += ', balanced sensory responses';
  }

  return description;
}
