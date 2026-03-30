/**
 * UPLOAD COMPONENT
 * Photo/video upload with queue and progress
 */

import React, { useRef } from 'react';
import { Upload as UploadIcon, Image, Video, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { uploadQueue, validateFile } from '../../lib/upload';
import { useUploadQueue } from '../../hooks/useUploadQueue';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function Upload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { queue, activeUploads, completedCount } = useUploadQueue();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate and add to queue
    files.forEach((file) => {
      const validation = validateFile(file);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      uploadQueue.add(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
              <UploadIcon className="w-10 h-10 text-rose-600" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                Share Your Photos & Videos
              </h2>
              <p className="text-neutral-600">
                Help us capture every moment of this special day
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleButtonClick}
                className="w-full md:w-auto"
              >
                <UploadIcon className="w-5 h-5 mr-2" />
                Choose Files
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <p className="text-sm text-neutral-500">
                Supported: Images (JPEG, PNG, HEIC) and Videos (MP4, MOV)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              Upload Queue
            </h3>
            <div className="text-sm text-neutral-600">
              {activeUploads > 0 && (
                <span>{activeUploads} uploading...</span>
              )}
              {completedCount > 0 && (
                <span className="ml-3 text-green-600">
                  {completedCount} completed
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {queue.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {task.file.type.startsWith('image/') ? (
                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Image className="w-6 h-6 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Video className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {task.file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatFileSize(task.file.size)}
                      </p>

                      {/* Progress bar */}
                      {(task.status === 'compressing' || task.status === 'uploading') && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            {task.status === 'compressing' ? 'Compressing...' : 'Uploading...'} {task.progress}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {task.status === 'pending' && (
                        <div className="text-neutral-400">
                          <span className="text-xs">Waiting...</span>
                        </div>
                      )}
                      {(task.status === 'compressing' || task.status === 'uploading') && (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                      {task.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                      {task.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {task.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700">{task.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <Card className="bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="p-6">
          <h4 className="font-semibold text-neutral-900 mb-3">Tips for great photos</h4>
          <ul className="text-sm text-neutral-700 space-y-2">
            <li>• Capture candid moments and genuine emotions</li>
            <li>• Use good lighting when possible</li>
            <li>• Include different perspectives and angles</li>
            <li>• Don't worry about perfection - we love spontaneous shots!</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
