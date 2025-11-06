import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Download, Settings, RefreshCw, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AnalyticsActionsProps {
  onExport: (format: 'pdf' | 'csv' | 'json') => void;
  onSettings: () => void;
  onRefresh: () => void;
  onFilters: () => void;
  isExporting?: boolean;
  isAnalyzing?: boolean;
  hasNewInsights?: boolean;
}

export function AnalyticsActions({ 
  onExport, 
  onSettings, 
  onRefresh, 
  onFilters, 
  isExporting, 
  isAnalyzing,
  hasNewInsights 
}: AnalyticsActionsProps) {
  const { tAnalytics, tCommon } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      {/* Primary: Filters - Most used action with visual emphasis */}
      <Button 
        variant="default" 
        size="lg"
        onClick={onFilters}
        className="gap-2 shadow-sm hover:shadow-md transition-shadow font-semibold"
        aria-label={String(tAnalytics('filters.title'))}
      >
        <Filter className="h-5 w-5" />
        <span className="hidden sm:inline">{String(tAnalytics('filters.title'))}</span>
      </Button>
      
      {/* Secondary: More Actions - subtle but accessible */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="hover:bg-muted"
            aria-label={String(tCommon('actions.more'))}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Refresh with new insights indicator */}
          <DropdownMenuItem onClick={onRefresh} disabled={isAnalyzing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {hasNewInsights 
              ? String(tAnalytics('actions.updateInsights')) 
              : String(tAnalytics('actions.refresh'))}
            {hasNewInsights && (
              <span className="ml-2 h-2 w-2 rounded-full bg-primary" aria-label="New insights available" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onExport('pdf')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {String(tAnalytics('export.pdf'))}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('csv')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {String(tAnalytics('export.csv'))}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('json')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {String(tAnalytics('export.json'))}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="mr-2 h-4 w-4" />
            {String(tAnalytics('settings.title'))}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}