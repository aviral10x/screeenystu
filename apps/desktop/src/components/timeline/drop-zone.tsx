import { useCallback, useState } from 'react';

interface DropZoneProps {
  onFilesAdded?: (files: FileInfo[]) => void;
}

interface FileInfo {
  name: string;
  path: string;
  type: string;
  size: number;
}

/**
 * Drag & drop zone for importing media files onto the timeline.
 */
export function DropZone({ onFilesAdded }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files: FileInfo[] = [];

      if (e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          const isMedia =
            file.type.startsWith('video/') ||
            file.type.startsWith('audio/') ||
            file.type.startsWith('image/');

          if (isMedia) {
            files.push({
              name: file.name,
              path: (file as any).path || file.name,
              type: file.type,
              size: file.size,
            });
          }
        }
      }

      if (files.length > 0) {
        onFilesAdded?.(files);
      }
    },
    [onFilesAdded],
  );

  return (
    <div
      className={`relative transition-all ${isDragOver ? 'ring-2 ring-accent-500 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-accent-600/10 border-2 border-dashed border-accent-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="text-center space-y-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-accent-400">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p className="text-sm font-medium text-accent-400">Drop media here</p>
            <p className="text-[10px] text-surface-500">Video, audio, or images</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper component that makes the timeline drag-and-drop aware.
 */
export function TimelineDropWrapper({ children: _children }: { children: React.ReactNode }) {
  const handleFilesAdded = useCallback((files: FileInfo[]) => {
    for (const file of files) {
      console.log('Importing:', file.name, file.type, file.size);
    }
  }, []);

  return <DropZone onFilesAdded={handleFilesAdded} />;
}
