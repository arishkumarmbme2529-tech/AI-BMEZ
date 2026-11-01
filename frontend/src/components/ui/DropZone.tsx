import React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Image, X } from 'lucide-react';
import { clsx } from 'clsx';
import { formatFileSize } from '../../utils/helpers';

interface DropZoneProps {
  files: File[];
  onDrop: (acceptedFiles: File[]) => void;
  onRemove: (index: number) => void;
  multiple?: boolean;
  maxSizeMB?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  files,
  onDrop,
  onRemove,
  multiple = false,
  maxSizeMB = 10,
}) => {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-cyan-500 bg-cyan-50/40'
            : 'border-slate-300 hover:border-cyan-400 bg-slate-50/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800">
          {isDragActive ? 'Drop files here to upload' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supported formats: PDF, JPG, JPEG, PNG (Max size: {maxSizeMB}MB)
        </p>
      </div>

      {fileRejections.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          Some files were rejected. Ensure format is PDF/JPG/PNG and size is under {maxSizeMB}MB.
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Selected Files ({files.length})
          </p>
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                {file.type.startsWith('image/') ? (
                  <Image className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-brand-navy flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

