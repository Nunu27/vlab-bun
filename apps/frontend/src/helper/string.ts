export function getTitleFromBreadcrumbs(breadcrumbs: { title: string }[]) {
  return breadcrumbs.reduce((acc, curr) => curr.title + ' - ' + acc, 'vLab');
}
