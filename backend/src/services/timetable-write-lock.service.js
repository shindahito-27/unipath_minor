let writeQueue = Promise.resolve();

export function withTimetableWriteLock(work) {
  const result = writeQueue.then(work, work);
  writeQueue = result.catch(() => {});
  return result;
}
