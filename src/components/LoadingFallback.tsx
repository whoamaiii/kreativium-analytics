import React, { memo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const LoadingFallbackComponent = () => {
  const { tCommon } = useTranslation();

  return (
    <div role="status" aria-live="polite" className="p-4">
      {tCommon('loading')}
    </div>
  );
};

export const LoadingFallback = memo(LoadingFallbackComponent);
