import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
} from '@frontend/components/ui/breadcrumb';
import { getTitleFromBreadcrumbs } from '@frontend/helper/string';
import { Link, useRouterState } from '@tanstack/react-router';
import { Fragment } from 'react';

function AppBreadcrumb() {
  const breadcrumbs = useRouterState({
    select: (state) => {
      const routerState = state.matches.at(-1);
      const rawBreadcrumbs = routerState?.staticData?.breadcrumbs ?? [];
      const data =
        routerState?.context.breadcrumbData ?? new Map<string, string>();

      if (!rawBreadcrumbs.length) return [];

      const breadcrumbs = rawBreadcrumbs.map((breadcrumb) => ({
        ...breadcrumb,
        title:
          typeof breadcrumb.title === 'function'
            ? breadcrumb.title(data) || 'Loading...'
            : breadcrumb.title,
      }));

      document.title = getTitleFromBreadcrumbs(breadcrumbs);
      return breadcrumbs;
    },
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <BreadcrumbSeparator
                key={`sep-${index}`}
                className="hidden md:block"
              />
            )}
            <BreadcrumbItem
              key={index}
              className={index === 0 ? 'hidden md:block' : ''}
            >
              {breadcrumb.url ? (
                <BreadcrumbLink asChild>
                  <Link to={breadcrumb.url}>{breadcrumb.title}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default AppBreadcrumb;
