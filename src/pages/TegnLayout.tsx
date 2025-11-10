import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSettings } from '@/components/LanguageSettings';
import { Hand } from 'lucide-react';

const TegnLayout = () => {
  const { tCommon } = useTranslation();

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Hand className="h-6 w-6" />
            {String(tCommon('navigation.tegnTilTale'))}
          </h1>
          <LanguageSettings />
        </header>

        <nav aria-label="Tegn til Tale navigation" className="flex gap-2">
          <NavLink
            to="."
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-full border ${isActive ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`
            }
          >
            {String(tCommon('tegn.menu'))}
          </NavLink>
          <NavLink
            to="learn"
            className={({ isActive }) =>
              `px-3 py-2 rounded-full border ${isActive ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`
            }
          >
            {String(tCommon('tegn.learn'))}
          </NavLink>
          <NavLink
            to="tegnbase"
            className={({ isActive }) =>
              `px-3 py-2 rounded-full border ${isActive ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`
            }
          >
            {String(tCommon('tegn.tegnbase'))}
          </NavLink>
          <NavLink
            to="memory"
            className={({ isActive }) =>
              `px-3 py-2 rounded-full border ${isActive ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`
            }
          >
            {String(tCommon('tegn.memory'))}
          </NavLink>
          <NavLink
            to="progress"
            className={({ isActive }) =>
              `px-3 py-2 rounded-full border ${isActive ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`
            }
          >
            {String(tCommon('tegn.progress'))}
          </NavLink>
        </nav>

        <Outlet />
      </div>
    </div>
  );
};

export default TegnLayout;
