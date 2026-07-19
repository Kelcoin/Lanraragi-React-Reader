export const IMAGE_LOAD_PRIORITY = Object.freeze({
  CRITICAL: 300,
  NORMAL: 200,
  ADJACENT: 100,
  PRELOAD: 0,
});

export function createImageLoadQueue({ maxConcurrent = 3 } = {}) {
  const limit = Math.max(2, Number(maxConcurrent) || 3);
  const backgroundLimit = Math.max(1, limit - 1);
  const pending = new Map();
  const queued = [];
  const active = new Set();
  let sequence = 0;

  const isCritical = (job) => job.priority >= IMAGE_LOAD_PRIORITY.CRITICAL;

  function pump() {
    while (queued.length > 0 && active.size < limit) {
      const criticalWaiting = queued.some(isCritical);
      const criticalActive = [...active].some(isCritical);
      if (criticalActive && !criticalWaiting) return;

      queued.sort((a, b) => (b.priority - a.priority) || (a.sequence - b.sequence));
      const candidateIndex = criticalWaiting ? queued.findIndex(isCritical) : 0;
      const job = queued[candidateIndex];
      if (!isCritical(job) && active.size >= backgroundLimit) return;

      queued.splice(candidateIndex, 1);
      job.state = 'active';
      active.add(job);

      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          active.delete(job);
          if (pending.get(job.key) === job) pending.delete(job.key);
          pump();
        });
    }
  }

  function schedule(key, task, priority = IMAGE_LOAD_PRIORITY.NORMAL) {
    const existing = pending.get(key);
    if (existing) {
      if (priority > existing.priority) {
        existing.priority = priority;
        if (existing.state === 'queued') pump();
      }
      return existing.promise;
    }

    const job = {
      key,
      task,
      priority,
      sequence: sequence++,
      state: 'queued',
    };
    job.promise = new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
    pending.set(key, job);
    queued.push(job);
    pump();
    return job.promise;
  }

  return { schedule };
}

function abortError() {
  return new DOMException('Image decode cancelled', 'AbortError');
}

export function createImageDecodeQueue() {
  const queued = [];
  let active = null;
  let sequence = 0;

  function pump() {
    if (active || queued.length === 0) return;
    queued.sort((a, b) => (b.priority - a.priority) || (a.sequence - b.sequence));
    const job = queued.shift();
    if (job.controller.signal.aborted) {
      job.reject(abortError());
      pump();
      return;
    }
    active = job;
    Promise.resolve()
      .then(() => job.task(job.controller.signal))
      .then(
        (value) => {
          job.settled = true;
          job.resolve(value);
        },
        (error) => {
          job.settled = true;
          job.reject(error);
        },
      )
      .finally(() => {
        if (active === job) active = null;
        pump();
      });
  }

  function schedule(key, task, priority = IMAGE_LOAD_PRIORITY.NORMAL) {
    const controller = new AbortController();
    const job = { key, task, priority, sequence: sequence++, controller };
    job.promise = new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
    job.cancel = () => {
      if (job.settled || controller.signal.aborted) return;
      controller.abort();
      const index = queued.indexOf(job);
      if (index >= 0) {
        queued.splice(index, 1);
        job.settled = true;
        job.reject(abortError());
      }
    };
    queued.push(job);
    pump();
    return { promise: job.promise, cancel: job.cancel };
  }

  function cancelAll() {
    active?.cancel();
    [...queued].forEach((job) => job.cancel());
  }

  return { schedule, cancelAll };
}
