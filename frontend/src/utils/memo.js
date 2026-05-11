export const MEMO_V2_PREFIX = "[[TDF_MEMO_V2]]";
export const CATCHALL_MEMO_DATE = "9999-12-31";
export const CATCHALL_STORAGE_KEY = "tetedeflorette-fourre-tout";
export const CATCHALL_BACKUP_STORAGE_KEY = "tetedeflorette-fourre-tout-backup";
export const CATCHALL_BACKUP_TIMESTAMP_KEY = "tetedeflorette-fourre-tout-backup-at";

export function hasMemoText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasMemoTasks(tasks) {
  return Array.isArray(tasks)
    && tasks.some((task) => typeof task?.label === "string" && task.label.trim().length > 0);
}

export function parseStoredMemoContent(rawContent) {
  const source = typeof rawContent === "string" ? rawContent : "";

  if (!source.startsWith(MEMO_V2_PREFIX)) {
    return {
      notes: source,
      tasks: [],
    };
  }

  try {
    const payload = JSON.parse(source.slice(MEMO_V2_PREFIX.length));
    return {
      notes: typeof payload.notes === "string" ? payload.notes : "",
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
    };
  } catch {
    return {
      notes: source,
      tasks: [],
    };
  }
}

export function hasStoredMemoContent(rawContent) {
  const { notes, tasks } = parseStoredMemoContent(rawContent);
  return hasMemoText(notes) || hasMemoTasks(tasks);
}

export function isCatchallMemoDate(value) {
  return value === CATCHALL_MEMO_DATE;
}
