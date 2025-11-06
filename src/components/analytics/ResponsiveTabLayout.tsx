import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ResponsiveTabLayoutProps {
  tabs: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  contextHelp?: Record<string, string>;
}

export const ResponsiveTabLayout: React.FC<ResponsiveTabLayoutProps> = ({
  tabs,
  activeTab,
  onTabChange,
  contextHelp = {}
}) => {
  const { tAnalytics } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeTabData = tabs.find(tab => tab.key === activeTab);

  if (isMobile) {
    return (
      <div className="w-full">
        {/* Mobile header with tab selector */}
        <div className="flex items-center justify-between mb-4 p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-3">
            {activeTabData?.icon}
            <div>
              <h2 className="font-semibold text-sm">{activeTabData?.label}</h2>
              {contextHelp[activeTab] && (
                <p className="text-xs text-muted-foreground">{contextHelp[activeTab]}</p>
              )}
            </div>
          </div>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
                <span className="sr-only">{String(tAnalytics('tabs.selectTab', { defaultValue: 'Select tab' }))}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{String(tAnalytics('tabs.selectView', { defaultValue: 'Select View' }))}</h3>
                </div>
                <div className="grid gap-2">
                  {tabs.map((tab) => (
                    <Button
                      key={tab.key}
                      variant={activeTab === tab.key ? "default" : "outline"}
                      className="justify-start h-auto p-4"
                      onClick={() => {
                        onTabChange(tab.key);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {tab.icon}
                        <div className="text-left">
                          <div className="font-medium">{tab.label}</div>
                          {contextHelp[tab.key] && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {contextHelp[tab.key]}
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile content */}
        <div className="space-y-4">
          {activeTabData?.content}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="w-full">
      {/* Desktop tab bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
              aria-label={`${tab.label} tab`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Context help */}
        {contextHelp[activeTab] && (
          <div className="text-sm text-muted-foreground hidden lg:block">
            {contextHelp[activeTab]}
          </div>
        )}
      </div>

      {/* Desktop content */}
      <div className="space-y-6">
        {activeTabData?.content}
      </div>
    </div>
  );
};

