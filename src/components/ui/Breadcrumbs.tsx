import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbsComponent = ({ items, className }: BreadcrumbsProps) => {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('text-xs text-muted-foreground', className)}>
      <ol className="flex items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const content =
            item.href && !item.current && !isLast ? (
              <Link to={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(item.current || isLast ? 'text-foreground' : undefined)}
                aria-current={item.current || isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            );
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {content}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const Breadcrumbs = memo(BreadcrumbsComponent);
