// src/utils/offlineQueue.ts
//
// Coastal disaster zones frequently lose connectivity right when reporting
// matters most. Rather than fail the submission, we persist it to
// localStorage and flush the queue automatically once the browser regains
// connectivity (see `initOfflineSync`, called once from App's root).

// Note: avoid importing project types here to keep this utility decoupled
// from the rest of the app and to prevent build errors if type files
// are unavailable at runtime. Use a general shape for the draft.

const QUEUE_KEY = "hazard_report_offline_queue";

export interface QueuedReport {
  localId: string;
  // File objects aren't JSON-serializable; keep a serializable draft shape.
  draft: Record<string, any>;
  mediaDataUrl?: string; // base64 preview kept so media isn't lost offline
  queuedAt: string;
}

function readQueue(): QueuedReport[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedReport[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueReport(item: QueuedReport) {
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
}

export function getQueuedReports(): QueuedReport[] {
  return readQueue();
}

export function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter((r) => r.localId !== localId));
}

export function queueLength(): number {
  return readQueue().length;
}

/** Converts a File to a base64 string so it can sit in localStorage until sync. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Attempts to submit every queued report via `submitFn`. Call this on app
 * load and on the browser's `online` event. Reports that fail to submit
 * stay queued for the next attempt.
 */
export async function flushQueue(
  submitFn: (item: QueuedReport) => Promise<boolean>
): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  let synced = 0;

  for (const item of queue) {
    try {
      const ok = await submitFn(item);
      if (ok) {
        removeFromQueue(item.localId);
        synced += 1;
      }
    } catch {
      // Leave it queued — likely still offline.
    }
  }

  return { synced, remaining: queueLength() };
}