import { useCallback } from 'react';
import type { EChartsInstance, EChartsComponentRef } from '@/lib/echartsTypes';
import { getTypedEChartsInstance, tryRenderToSVGString, getChartDataURL } from '@/lib/echartsUtils';

export type ChartExportMethods = {
  getImage: (opts?: { pixelRatio?: number; backgroundColor?: string }) => string | undefined;
  getSVG: () => string | undefined;
};

export function useChartExport(ref: React.RefObject<EChartsComponentRef | null>) {
  const getImage = useCallback((opts?: { pixelRatio?: number; backgroundColor?: string }) => {
    const inst = getTypedEChartsInstance(ref);
    if (!inst) return undefined;
    return getChartDataURL(inst, {
      type: 'png',
      pixelRatio: opts?.pixelRatio ?? 2,
      backgroundColor: opts?.backgroundColor ?? '#ffffff',
    });
  }, [ref]);

  const getSVG = useCallback(() => {
    const inst = getTypedEChartsInstance(ref);
    if (!inst) return undefined;
    return tryRenderToSVGString(inst);
  }, [ref]);

  return { getImage, getSVG } as ChartExportMethods;
}
