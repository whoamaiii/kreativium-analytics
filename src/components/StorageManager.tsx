import { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { storageUtils } from '@/lib/storageUtils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';
import { toError } from '@/lib/errors';
import { MAX_LOCAL_STORAGE_BYTES } from '@/config/storage';
import { storageService } from '@/lib/storage/storageService';
import { getStorageStats, type StorageStats } from '@/lib/storage/storageStats';

interface StorageInfo {
  used: number;
  available: boolean;
}

/**
 * StorageManager Component
 *
 * Provides UI for managing local storage, including viewing usage statistics
 * and clearing different types of data. Includes safety checks and error handling.
 *
 * @component
 * @returns {React.ReactElement} Rendered storage management interface
 */
const StorageManagerComponent = () => {
  const { tCommon } = useTranslation();
  const [storageInfo, setStorageInfo] = useState<StorageInfo>(() => storageUtils.getStorageInfo());
  const [stats, setStats] = useState<StorageStats>(() => getStorageStats());

  const refreshStats = () => {
    setStorageInfo(storageUtils.getStorageInfo());
    setStats(getStorageStats());
  };

  const handleClearOldData = () => {
    try {
      storageUtils.clearOldTrackingData(30);
      toast.success(
        String(
          tCommon('storage.clearOld.success', { defaultValue: 'Old data cleared successfully' }),
        ),
      );
      refreshStats();
    } catch (error) {
      logger.error('Failed to clear old tracking data', toError(error));
      toast.error(
        String(tCommon('storage.clearOld.failure', { defaultValue: 'Failed to clear old data' })),
      );
    }
  };

  const handleClearNonEssential = () => {
    try {
      storageUtils.clearNonEssentialData();
      toast.success(
        String(
          tCommon('storage.clearNonEssential.success', {
            defaultValue: 'Non-essential data cleared',
          }),
        ),
      );
      refreshStats();
    } catch (error) {
      logger.error('Failed to clear non-essential data', toError(error));
      toast.error(
        String(
          tCommon('storage.clearNonEssential.failure', {
            defaultValue: 'Failed to clear non-essential data',
          }),
        ),
      );
    }
  };

  /**
   * Handle clearing all data with proper confirmation dialog.
   * Uses a more robust approach than browser confirm().
   */
  const handleClearAll = () => {
    // Using window.confirm with proper error handling
    // In production, consider using a custom modal component
    try {
      const confirmed = window.confirm(
        String(
          tCommon('storage.confirmClearAll', {
            defaultValue: 'Are you sure you want to clear ALL data? This cannot be undone!',
          }),
        ),
      );
      if (confirmed) {
        try {
          storageService.clearAll();
          toast.success(
            String(tCommon('storage.clearAll.success', { defaultValue: 'All data cleared' })),
          );
          // Use window.location.replace for better history management
          window.location.replace('/');
        } catch (error) {
          logger.error('Failed to clear all data', toError(error));
          toast.error(
            String(
              tCommon('storage.clearAll.failure', { defaultValue: 'Failed to clear all data' }),
            ),
          );
        }
      }
    } catch (error) {
      // Handle cases where confirm might fail (e.g., in some test environments)
      logger.error('Confirmation dialog failed', toError(error));
      toast.error(
        String(
          tCommon('storage.confirmation.failure', {
            defaultValue: 'Could not show confirmation dialog',
          }),
        ),
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercentage = (storageInfo.used / MAX_LOCAL_STORAGE_BYTES) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {String(tCommon('storage.title', { defaultValue: 'Storage Management' }))}
        </CardTitle>
        <CardDescription>
          {String(
            tCommon('storage.description', {
              defaultValue: 'Manage your local storage to ensure smooth operation',
            }),
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Usage */}
        <div>
          <h3 className="font-medium mb-2">
            {String(tCommon('storage.usage.title', { defaultValue: 'Storage Usage' }))}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{String(tCommon('storage.used', { defaultValue: 'Used' }))}</span>
              <span>
                {String(
                  tCommon('storage.usage.usedOf', {
                    defaultValue: '{{used}} / ~5 MB',
                    used: formatBytes(storageInfo.used),
                  }),
                )}
              </span>
            </div>
            <div className="w-full">
              <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
            </div>
          </div>
        </div>

        {/* Storage Stats */}
        <div>
          <h3 className="font-medium mb-2">
            {String(tCommon('storage.stats.title', { defaultValue: 'Data Statistics' }))}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              {String(tCommon('storage.stats.students', { defaultValue: 'Students' }))}:{' '}
              {stats.studentsCount}
            </div>
            <div>
              {String(tCommon('storage.stats.entries', { defaultValue: 'Entries' }))}:{' '}
              {stats.entriesCount}
            </div>
            <div>
              {String(tCommon('storage.stats.goals', { defaultValue: 'Goals' }))}:{' '}
              {stats.goalsCount}
            </div>
            <div>
              {String(tCommon('storage.stats.alerts', { defaultValue: 'Alerts' }))}:{' '}
              {stats.alertsCount}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {usagePercentage > 70 && (
          <Alert className={cn(usagePercentage > 90 ? 'border-red-500' : 'border-yellow-500')}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {usagePercentage > 90
                ? String(
                    tCommon('storage.warning.almostFull', {
                      defaultValue: 'Storage is almost full! Clear some data to prevent errors.',
                    }),
                  )
                : String(
                    tCommon('storage.warning.gettingHigh', {
                      defaultValue: 'Storage usage is getting high. Consider clearing old data.',
                    }),
                  )}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" onClick={handleClearOldData} className="w-full justify-start">
            <Trash2 className="h-4 w-4 mr-2" />
            {String(
              tCommon('storage.actions.clearOld', {
                defaultValue: 'Clear data older than 30 days',
                days: 30,
              }),
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleClearNonEssential}
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {String(
              tCommon('storage.actions.clearNonEssential', {
                defaultValue: 'Clear non-essential data',
              }),
            )}
          </Button>
          <Button variant="destructive" onClick={handleClearAll} className="w-full justify-start">
            <Trash2 className="h-4 w-4 mr-2" />
            {String(
              tCommon('storage.actions.clearAll', {
                defaultValue: 'Clear ALL data (irreversible)',
              }),
            )}
          </Button>
        </div>

        {storageInfo.available && (
          <Alert className="border-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {String(
                tCommon('storage.healthy', {
                  defaultValue: 'Storage is healthy with sufficient space available.',
                }),
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const StorageManager = memo(StorageManagerComponent);
