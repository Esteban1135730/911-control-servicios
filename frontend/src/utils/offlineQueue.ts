import { get, set, del, keys } from 'idb-keyval';

export type OfflineJob = {
  id: string;
  type: 'start' | 'end';
  serviceId?: string;
  payload: {
    lat: number;
    lng: number;
    accuracy?: number;
    note?: string;
    clientAt: string;
  };
  photoBlob: Blob;
  createdAt: string;
};

const PREFIX = 'offline-job:';

export async function enqueueJob(job: OfflineJob) {
  await set(PREFIX + job.id, job);
}

export async function listJobs(): Promise<OfflineJob[]> {
  const all = await keys();
  const jobs: OfflineJob[] = [];
  for (const k of all) {
    if (typeof k === 'string' && k.startsWith(PREFIX)) {
      const job = await get<OfflineJob>(k);
      if (job) jobs.push(job);
    }
  }
  return jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeJob(id: string) {
  await del(PREFIX + id);
}

export async function syncJobs(token: string, apiBase = '') {
  const jobs = await listJobs();
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const job of jobs) {
    try {
      const fd = new FormData();
      fd.append('lat', String(job.payload.lat));
      fd.append('lng', String(job.payload.lng));
      if (job.payload.accuracy != null) fd.append('accuracy', String(job.payload.accuracy));
      if (job.payload.note) fd.append('note', job.payload.note);
      fd.append('photo', job.photoBlob, 'capture.jpg');
      if (job.type === 'start') {
        fd.append('clientStartedAt', job.payload.clientAt);
        const res = await fetch(`${apiBase}/api/services/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Error');
      } else {
        fd.append('clientEndedAt', job.payload.clientAt);
        const res = await fetch(`${apiBase}/api/services/${job.serviceId}/end`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Error');
      }
      await removeJob(job.id);
      results.push({ id: job.id, ok: true });
    } catch (e) {
      results.push({ id: job.id, ok: false, error: (e as Error).message });
      break;
    }
  }
  return results;
}
