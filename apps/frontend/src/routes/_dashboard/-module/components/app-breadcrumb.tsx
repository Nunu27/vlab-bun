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
      const breadcrumbs = state.matches.at(-1)?.staticData?.breadcrumbs ?? [];

      if (breadcrumbs.length) {
        document.title = getTitleFromBreadcrumbs(breadcrumbs);
      }

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
