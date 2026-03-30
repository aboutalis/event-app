/**
 * UPLOAD UTILITIES
 * Image/video compression and upload queue management
 */

import imageCompression from 'browser-image-compression';
import { supabase, STORAGE_BUCKET } from './supabase';

// ==============================================
// CONFIGURATION
// ==============================================
const MAX_CONCURRENT_UPLOADS = 2;
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1920;

// ==============================================
// TYPES
// ==============================================
export interface UploadTask {
  id: string;
  file: File;
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: UploadResult;
}

export interface UploadResult {
  filePath: string;
  thumbnailPath?: string;
  fileType: 'image' | 'video';
  width?: number;
  height?: number;
  fileSize: number;
}

export interface MediaRecord {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  file_type: 'image' | 'video';
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
}

// ==============================================
// UPLOAD QUEUE
// ==============================================
class UploadQueue {
  private queue: UploadTask[] = [];
  private activeUploads = 0;
  private listeners: Set<(queue: UploadTask[]) => void> = new Set();
  private uploadCompleteListeners: Set<(media: MediaRecord) => void> = new Set();

  /**
   * Add file to upload queue
   */
  add(file: File): string {
    const task: UploadTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0,
    };

    this.queue.push(task);
    this.notify();
    this.processQueue();

    return task.id;
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: UploadTask[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to upload completion events
   */
  onUploadComplete(listener: (media: MediaRecord) => void): () => void {
    this.uploadCompleteListeners.add(listener);
    return () => this.uploadCompleteListeners.delete(listener);
  }

  /**
   * Get current queue state
   */
  getQueue(): UploadTask[] {
    return [...this.queue];
  }

  /**
   * Process queue (max concurrent uploads)
   */
  private async processQueue() {
    // Only process if we have capacity and pending tasks
    if (this.activeUploads >= MAX_CONCURRENT_UPLOADS || !this.hasPendingTasks()) {
      return;
    }

    const task = this.queue.find(t => t.status === 'pending');
    if (!task) return;

    // Mark as processing IMMEDIATELY to prevent duplicate processing
    task.status = 'uploading';

    this.activeUploads++;
    this.processTask(task).finally(() => {
      this.activeUploads--;
      // Process next task in queue
      this.processQueue();
    });

    // Process additional tasks if we have capacity (up to MAX_CONCURRENT_UPLOADS)
    if (this.activeUploads < MAX_CONCURRENT_UPLOADS) {
      this.processQueue();
    }
  }

  /**
   * Process individual upload task
   */
  private async processTask(task: UploadTask) {
    try {
      const fileType = task.file.type.startsWith('image/') ? 'image' : 'video';

      // Compress if image
      let fileToUpload = task.file;
      if (fileType === 'image') {
        task.status = 'compressing';
        this.notify();

        fileToUpload = await compressImage(task.file, (progress) => {
          task.progress = Math.floor(progress * 50); // 0-50% for compression
          this.notify();
        });
      }

      // Upload
      task.status = 'uploading';
      task.progress = fileType === 'image' ? 50 : 0;
      this.notify();

      const result = await uploadFile(fileToUpload, fileType, (progress) => {
        task.progress = fileType === 'image'
          ? 50 + Math.floor(progress * 50) // 50-100%
          : Math.floor(progress * 100);    // 0-100%
        this.notify();
      });

      // Get dimensions for images
      if (fileType === 'image') {
        const dimensions = await getImageDimensions(task.file);
        result.width = dimensions.width;
        result.height = dimensions.height;
      }

      // Save to database and get the created record
      const mediaRecord = await saveMediaToDatabase(result);

      task.status = 'completed';
      task.progress = 100;
      task.result = result;
      this.notify();

      // Notify upload complete listeners with the media record
      this.notifyUploadComplete(mediaRecord);

      // Remove from queue after 5 seconds to allow user to see "Published" status
      setTimeout(() => {
        this.queue = this.queue.filter(t => t.id !== task.id);
        this.notify();
      }, 5000);

    } catch (error) {
      task.status = 'error';
      task.error = error instanceof Error ? error.message : 'Upload failed';
      this.notify();
    }
  }

  private hasPendingTasks(): boolean {
    return this.queue.some(t => t.status === 'pending');
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getQueue()));
  }

  private notifyUploadComplete(media: MediaRecord) {
    this.uploadCompleteListeners.forEach(listener => listener(media));
  }
}

// Singleton instance
export const uploadQueue = new UploadQueue();

// ==============================================
// IMAGE COMPRESSION
// ==============================================
async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const options = {
    maxWidthOrHeight: Math.max(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT),
    useWebWorker: true,
    onProgress: onProgress,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    // If compression fails, return original
    return file;
  }
}

// ==============================================
// FILE UPLOAD
// ==============================================
async function uploadFile(
  file: File,
  fileType: 'image' | 'video',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Generate unique file path
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${timestamp}-${randomId}.${extension}`;
  const filePath = `${fileType}s/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (onProgress) {
    onProgress(1);
  }

  return {
    filePath: data.path,
    fileType,
    fileSize: file.size,
  };
}

// ==============================================
// SAVE TO DATABASE
// ==============================================
async function saveMediaToDatabase(result: UploadResult): Promise<MediaRecord> {
  const { data, error } = await supabase.from('media').insert({
    file_path: result.filePath,
    thumbnail_path: result.thumbnailPath,
    file_type: result.fileType,
    file_size: result.fileSize,
    width: result.width,
    height: result.height,
  }).select().single();

  if (error) {
    throw new Error(`Database save failed: ${error.message}`);
  }

  return data as MediaRecord;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validate file before adding to queue
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const fileType = file.type.startsWith('image/') ? 'image' :
                   file.type.startsWith('video/') ? 'video' : 'unknown';

  if (fileType === 'unknown') {
    return { valid: false, error: 'Only images and videos are allowed' };
  }

  return { valid: true };
}
