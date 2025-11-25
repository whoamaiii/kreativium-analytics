import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/useTranslation';
import { Student } from '@/types/student';
import { logger } from '@/lib/logger';

interface StudentProfileSidebarProps {
  student: Student;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function StudentProfileSidebar({
  student,
  activeSection,
  onSectionChange,
}: StudentProfileSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { tStudent: _tStudent, tCommon } = useTranslation();

  // Consolidated navigation - reduced from 8 to 4 main sections
  const menuItems = [
    {
      section: 'dashboard',
      title: tCommon('navigation.dashboard'),
      icon: 'dashboard',
      description: 'Oversikt og sammendrag',
    },
    {
      section: 'analytics',
      title: tCommon('navigation.analytics'),
      icon: 'analytics',
      description: 'Data, mønstre og innsikter',
    },
    {
      section: 'goals',
      title: 'Mål & Fremgang',
      icon: 'trending_up',
      description: 'Målstyring og utviklingsanalyse',
    },
    {
      section: 'reports',
      title: tCommon('navigation.reports'),
      icon: 'description',
      description: 'Rapporter og verktøy',
    },
  ];

  // Tools are now integrated into main sections:
  // - Search/Templates -> Available in Reports section
  // - Compare -> Available in Analytics section
  const _toolItems: typeof menuItems = [];

  const isActive = (section: string) => activeSection === section;

  return (
    <Sidebar
      className={`${state === 'collapsed' ? 'w-14' : 'w-64'} bg-card/95 border-border backdrop-blur-sm z-50`}
    >
      <SidebarContent className="bg-transparent">
        {/* Student Header */}
        <div
          className={`p-4 border-b border-border/20 bg-card/50 backdrop-blur-sm ${state === 'collapsed' ? 'px-2' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
              {student.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </div>
            {state !== 'collapsed' && (
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate text-foreground">{student.name}</h3>
                {student.grade && <p className="text-xs text-muted-foreground">{student.grade}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation with better visual hierarchy */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-medium uppercase tracking-wider px-3 py-2">
            {state !== 'collapsed' ? 'Hovedseksjoner' : ''}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    onClick={() => {
                      try {
                        logger.debug('[UI] Sidebar nav click', { section: item.section });
                      } catch {
                        // Ignore logger errors
                      }
                      onSectionChange(item.section);
                      // Close mobile drawer after selection to reveal content
                      if (isMobile) {
                        try {
                          setOpenMobile(false);
                        } catch {
                          // Ignore state update errors
                        }
                      }
                    }}
                    className={`group cursor-pointer mx-2 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                      isActive(item.section)
                        ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                    title={state === 'collapsed' ? String(item.title) : undefined}
                  >
                    <div className="flex items-center w-full">
                      <span className="material-icons text-base flex-shrink-0">{item.icon}</span>
                      {state !== 'collapsed' && (
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-medium">{String(item.title)}</div>
                          <div className="text-xs opacity-70 truncate">{item.description}</div>
                        </div>
                      )}
                      {isActive(item.section) && state !== 'collapsed' && (
                        <div className="w-2 h-2 rounded-full bg-current flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools integrated into main sections - no separate tools section needed */}
      </SidebarContent>
    </Sidebar>
  );
}
