// Progress item keys identify a completable thing: `<moduleId>:lesson:<slug>` or `<moduleId>:lab:<labId>`.

export type ProgressItemKind = "lesson" | "lab";

export function lessonItemKey(moduleId: string, lessonSlug: string): string {
  return `${moduleId}:lesson:${lessonSlug}`;
}

export function labItemKey(moduleId: string, labId: string): string {
  return `${moduleId}:lab:${labId}`;
}

export function parseItemKey(itemKey: string): { moduleId: string; kind: ProgressItemKind; id: string } | null {
  const match = /^([a-z0-9]+):(lesson|lab):([a-z0-9-]+)$/.exec(itemKey);
  if (!match) return null;
  return { moduleId: match[1], kind: match[2] as ProgressItemKind, id: match[3] };
}
