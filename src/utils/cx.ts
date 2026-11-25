export type ClassValue = string | false | null | undefined;

/** Joins truthy class names with a space. A tiny, dependency-free `clsx`. */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
