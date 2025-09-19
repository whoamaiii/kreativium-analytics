import { useCallback } from 'react';
import type ReactECharts from 'echarts-for-react';

export type ChartExportMethods = {
  getImage: (opts?: { pixelRatio?: number; backgroundColor?: string }) => string | undefined;
  getSVG: () => string | undefined;
};

export function useChartExport(ref: React.RefObject<ReactECharts>) {
  const getImage = useCallback((opts?: { pixelRatio?: number; backgroundColor?: string }) => {
    try {
      // @ts-expect-error echarts instance type is provided by echarts-for-react at runtime
      const inst = ref.current?.getEchartsInstance?.();
      if (!inst) return undefined;
      return inst.getDataURL({
        type: 'png',
        pixelRatio: opts?.pixelRatio ?? 2,
        backgroundColor: opts?.backgroundColor ?? '#ffffff',
      });
    } catch {
      return undefined;
    }
  }, [ref]);

  const getSVG = useCallback(() => {
    try {
      // Some ECharts builds expose renderToSVGString; if unavailable, return undefined
      // @ts-expect-error echarts instance type is provided by echarts-for-react at runtime
      const inst = ref.current?.getEchartsInstance?.();
      // @ts-expect-error ECharts runtime optionally adds renderToSVGString when SVG renderer bundle is present
      if (inst?.renderToSVGString) {
        // @ts-expect-error Method injected only in SVG builds, safe to guard by runtime check
        return inst.renderToSVGString();
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [ref]);

  return { getImage, getSVG } as ChartExportMethods;
}
