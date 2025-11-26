// Minimal stub worker used in POC mode to avoid bundling heavy analytics code
// Posts a single complete message with empty-but-valid results

interface AnalyticsWorkerMessage {
  cacheKey?: string;
}

self.onmessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
  const data = event.data || {};
  const cacheKey = data.cacheKey;

  (self as unknown as Worker).postMessage({
    type: 'complete',
    payload: {
      patterns: [],
      correlations: [],
      environmentalCorrelations: [],
      predictiveInsights: [],
      anomalies: [],
      insights: [],
      cacheKey,
    },
  });
};
