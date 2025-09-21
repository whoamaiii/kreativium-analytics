import React, { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TestingToolsSection } from '@/components/TestingToolsSection';
import { IS_PROD, POC_MODE } from '@/lib/env';
import { Database, Wrench, Stethoscope } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useTranslation } from '@/hooks/useTranslation';

const StorageManager = lazy(() => import('@/components/StorageManager').then(m => ({ default: m.StorageManager })));
const ModelDiagnosticsPanel = lazy(() => import('@/components/dev/ModelDiagnosticsPanel').then(m => ({ default: m.ModelDiagnosticsPanel })));
const EnvDebug = lazy(() => import('@/components/dev/EnvDebug').then(m => ({ default: m.EnvDebug })));

/**
 * Developer Tools page - centralizes non user-facing utilities
 * Gated to non-production or POC modes via routing in App.tsx
 */
const DevTools = (): JSX.Element => {
  const { tCommon } = useTranslation();
  // Extra guard to avoid accidental exposure if route misconfigured
  if (IS_PROD && !POC_MODE) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{String(tCommon('devTools.title'))}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{String(tCommon('devTools.unavailable'))}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <Breadcrumbs
            items={[
              { label: tCommon('buttons.home'), href: '/' },
              { label: String(tCommon('devTools.title')), current: true },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            {String(tCommon('devTools.title'))}
          </h1>
        </header>

        {/* Reuse existing TestingToolsSection which already includes MockDataLoader */}
        <TestingToolsSection />

        {/* Storage Management */}
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {String(tCommon('devTools.storage.title'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {String(tCommon('devTools.storage.description'))}
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  {String(tCommon('devTools.storage.open'))}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{String(tCommon('devTools.storage.title'))}</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">{String(tCommon('devTools.storage.loading'))}</div>}>
                  <StorageManager />
                </Suspense>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Diagnostics Panel (dev-only), lazy loaded */}
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {String(tCommon('devTools.diagnostics.title'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {String(tCommon('devTools.diagnostics.description'))}
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  {String(tCommon('devTools.diagnostics.open'))}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{String(tCommon('devTools.diagnostics.title'))}</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">{String(tCommon('devTools.diagnostics.loading'))}</div>}>
                  <ModelDiagnosticsPanel />
                </Suspense>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Env / AI Debug */}
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">{String(tCommon('devTools.env.loading'))}</div>}>
          <EnvDebug />
        </Suspense>
      </div>
    </div>
  );
};

export default DevTools;
