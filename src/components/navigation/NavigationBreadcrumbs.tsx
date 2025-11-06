import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface NavigationBreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  onHomeClick?: () => void;
  className?: string;
}

export const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({
  items,
  showHome = true,
  onHomeClick,
  className = ''
}) => {
  const { tCommon } = useTranslation();

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`} aria-label="Breadcrumb navigation">
      {showHome && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHomeClick}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            aria-label={String(tCommon('navigation.home', { defaultValue: 'Home' }))}
          >
            <Home className="h-4 w-4" />
          </Button>
          {items.length > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </>
      )}
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.onClick ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={item.onClick}
              className={`h-8 px-2 font-medium ${
                item.isActive 
                  ? 'text-foreground bg-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Button>
          ) : (
            <span className={`px-2 py-1 font-medium ${
              item.isActive ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {item.label}
            </span>
          )}
          
          {index < items.length - 1 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Context-aware breadcrumb hook
export const useBreadcrumbs = (
  currentSection: string,
  currentTab?: string,
  studentName?: string
) => {
  const { tCommon, tAnalytics } = useTranslation();

  const items: BreadcrumbItem[] = React.useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];

    if (studentName) {
      breadcrumbs.push({
        label: studentName,
        isActive: false
      });
    }

    // Section level
    const sectionLabels: Record<string, string> = {
      dashboard: String(tCommon('navigation.dashboard')),
      analytics: String(tCommon('navigation.analytics')),
      goals: 'Mål',
      progress: 'Fremgang',
      reports: String(tCommon('navigation.reports')),
      search: 'Avansert søk',
      templates: 'Hurtigmaler',
      compare: 'Sammenligning'
    };

    if (sectionLabels[currentSection]) {
      breadcrumbs.push({
        label: sectionLabels[currentSection],
        isActive: !currentTab
      });
    }

    // Tab level (for analytics)
    if (currentTab && currentSection === 'analytics') {
      const tabLabels: Record<string, string> = {
        overview: String(tAnalytics('tabs.overview')),
        explore: String(tAnalytics('tabs.explore')),
        alerts: String(tAnalytics('tabs.alerts'))
      };

      if (tabLabels[currentTab]) {
        breadcrumbs.push({
          label: tabLabels[currentTab],
          isActive: true
        });
      }
    }

    return breadcrumbs;
  }, [currentSection, currentTab, studentName, tCommon, tAnalytics]);

  return items;
};

