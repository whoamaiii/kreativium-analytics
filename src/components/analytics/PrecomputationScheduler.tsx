import React, { useEffect, useMemo, useState } from 'react';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { dataStorage } from '@/lib/dataStorage';
import { deviceConstraints } from '@/lib/deviceConstraints';

type Props = {
  className?: string;
};

export const PrecomputationScheduler: React.FC<Props> = ({ className }) => {
  const { precomputeEnabled, precomputeStatus, startPrecomputation, stopPrecomputation, precomputeCommonAnalytics } = useAnalyticsWorker({ precomputeOnIdle: true });
  const [enabled, setEnabled] = useState<boolean>(() => analyticsConfig.getConfig().precomputation.enabled);
  const [canRun, setCanRun] = useState<boolean>(true);

  useEffect(() => {
    const unsub = analyticsConfig.subscribe((cfg) => {
      setEnabled(cfg.precomputation.enabled);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const check = async () => {
      try { setCanRun(await deviceConstraints.canPrecompute(analyticsConfig.getConfig().precomputation)); } catch { setCanRun(true); }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  const dataProvider = useMemo(() => {
    return () => {
      const entries = dataStorage.getTrackingEntries();
      const emotions = entries.flatMap(e => (e.emotions || []).map(em => ({ ...em, studentId: em.studentId ?? e.studentId })));
      const sensory = entries.flatMap(e => (e.sensoryInputs || []).map(s => ({ ...s, studentId: s.studentId ?? e.studentId })));
      return [{ entries, emotions, sensoryInputs: sensory }];
    };
  }, []);

  useEffect(() => {
    if (enabled && precomputeEnabled && canRun) {
      precomputeCommonAnalytics(dataProvider);
    }
  }, [enabled, precomputeEnabled, canRun, dataProvider, precomputeCommonAnalytics]);

  const toggle = () => {
    const cfg = analyticsConfig.getConfig();
    analyticsConfig.updateConfig({ precomputation: { ...cfg.precomputation, enabled: !enabled } });
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <label className="font-medium">Precompute Analytics</label>
        <button onClick={toggle} className="px-2 py-1 border rounded">
          {enabled ? 'Disable' : 'Enable'}
        </button>
        <button onClick={() => startPrecomputation && startPrecomputation()} className="px-2 py-1 border rounded">Start</button>
        <button onClick={() => stopPrecomputation && stopPrecomputation()} className="px-2 py-1 border rounded">Stop</button>
        <span className="text-sm text-gray-500">{canRun ? 'READY' : 'WAITING (constraints)'}</span>
      </div>
      <div className="mt-2 text-sm">
        <div>Status: {precomputeStatus?.enabled ? 'on' : 'off'}</div>
        <div>Queue: {precomputeStatus?.queueSize ?? 0}</div>
        <div>Processing: {precomputeStatus?.isProcessing ? 'yes' : 'no'}</div>
        <div>Processed: {precomputeStatus?.processedCount ?? 0}</div>
      </div>
    </div>
  );
};

export default PrecomputationScheduler;



