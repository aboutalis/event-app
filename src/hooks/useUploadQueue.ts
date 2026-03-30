/**
 * HOOK: useUploadQueue
 * Monitor upload queue state
 */

import { useState, useEffect } from 'react';
import { uploadQueue, UploadTask } from '../lib/upload';

export function useUploadQueue() {
  const [queue, setQueue] = useState<UploadTask[]>([]);

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = uploadQueue.subscribe(setQueue);

    // Get initial state
    setQueue(uploadQueue.getQueue());

    return unsubscribe;
  }, []);

  const activeUploads = queue.filter(
    t => t.status === 'compressing' || t.status === 'uploading'
  ).length;

  const completedCount = queue.filter(t => t.status === 'completed').length;
  const errorCount = queue.filter(t => t.status === 'error').length;

  return {
    queue,
    activeUploads,
    completedCount,
    errorCount,
    hasUploads: queue.length > 0,
  };
}
