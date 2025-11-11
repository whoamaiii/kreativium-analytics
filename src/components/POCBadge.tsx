import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';

const POCBadgeComponent = () => {
  return (
    <Badge variant="outline" className="uppercase tracking-wider text-xs">
      POC Mode
    </Badge>
  );
};

export const POCBadge = memo(POCBadgeComponent);
