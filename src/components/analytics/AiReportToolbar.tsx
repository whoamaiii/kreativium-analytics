import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clipboard as ClipboardIcon, Download, Share2 } from 'lucide-react';
import type { ToolbarLastAction } from '@/hooks/useKreativiumAiState';

interface ToolbarLabels {
  copy: string;
  copyTooltip: string;
  copyAria: string;
  pdf: string;
  pdfTooltip: string;
  pdfAria: string;
  share: string;
  shareTooltip: string;
  shareAria: string;
  lastExportShort: string;
}

interface AiReportToolbarProps {
  onCopy: () => Promise<void> | void;
  onDownload: () => Promise<void> | void;
  onShare: () => Promise<void> | void;
  lastAction: ToolbarLastAction;
  labels: ToolbarLabels;
}

export function AiReportToolbar({
  onCopy,
  onDownload,
  onShare,
  lastAction,
  labels,
}: AiReportToolbarProps): JSX.Element {
  return (
    <TooltipProvider>
      <div className="p-4 flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={labels.copyAria}
              onClick={onCopy}
            >
              <ClipboardIcon className="h-4 w-4 mr-2" />
              {labels.copy}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{labels.copyTooltip}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={labels.pdfAria}
              onClick={onDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              {labels.pdf}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{labels.pdfTooltip}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={labels.shareAria}
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {labels.share}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{labels.shareTooltip}</TooltipContent>
        </Tooltip>

        {lastAction.at && (
          <span className="text-[11px] text-muted-foreground ml-1">
            {labels.lastExportShort}: {lastAction.type?.toUpperCase()} {new Date(lastAction.at).toLocaleTimeString()}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
