import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Grid3x3, Focus } from 'lucide-react';
import { VisualizationType } from '@/hooks/useVisualizationState';

interface LayoutProps {
  renderVisualization: (type: VisualizationType) => React.ReactNode;
}

interface GridLayoutProps extends LayoutProps {
  selectedVisualizations: VisualizationType[];
}

export const GridLayout = ({ selectedVisualizations, renderVisualization }: GridLayoutProps) => {
  if (selectedVisualizations.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <Grid3x3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select visualizations to display</p>
            <p className="text-sm">Choose from the options above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {selectedVisualizations.map(type => (
        <div key={type}>{renderVisualization(type)}</div>
      ))}
    </div>
  );
};

interface FocusLayoutProps extends LayoutProps {
  focusedVisualization: VisualizationType | null;
}

export const FocusLayout = ({ focusedVisualization, renderVisualization }: FocusLayoutProps) => {
  if (!focusedVisualization) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <Focus className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a visualization to focus on</p>
            <p className="text-sm">Choose from the options above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {renderVisualization(focusedVisualization)}
    </div>
  );
};

// For now, ComparisonLayout can be the same as GridLayout. It can be specialized later.
export const ComparisonLayout = GridLayout;
