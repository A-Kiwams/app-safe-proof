import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Image, File as FileIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'application/pdf', 'text/plain',
];
const MAX_SIZE = 1024 * 1024; // 1 MB

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      const maxDim = 1080;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const tryCompress = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= MAX_SIZE || quality <= 0.3) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
            } else {
              tryCompress(quality - 0.1);
            }
          },
          'image/webp',
          quality,
        );
      };
      tryCompress(0.8);
    };
    img.src = url;
  });
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-primary" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-primary" />;
  return <FileIcon className="w-4 h-4 text-primary" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  evidenceId: string;
}

interface EvidenceUploaderProps {
  caseId: string;
  userId: string;
  onUploadComplete: (evidenceId: string) => void;
}

export function EvidenceUploader({ caseId, userId, onUploadComplete }: EvidenceUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (rawFiles: File[]) => {
    const validFiles = rawFiles.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const invalid = rawFiles.length - validFiles.length;
    if (invalid > 0) {
      toast.error(`${invalid} file(s) skipped — unsupported format`);
    }
    if (validFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    let successfulUploads = 0;
    let failedUploads = 0;

    for (let i = 0; i < validFiles.length; i++) {
      let file = validFiles[i];
      let compressed = false;

      setStatusMsg(`Uploading ${file.name}… (${i + 1}/${validFiles.length})`);

      // Compress images if needed
      if (file.type.startsWith('image/') && file.size > MAX_SIZE) {
        setStatusMsg(`Compressing ${file.name}…`);
        file = await compressImage(file);
        compressed = true;
        toast.info(`${validFiles[i].name} was compressed to ${formatBytes(file.size)}`);
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${caseId}/${Date.now()}_${safeName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('evidence-files')
        .upload(filePath, file, { contentType: file.type });

      if (storageError) {
        failedUploads++;
        toast.error(`Failed to upload ${file.name}: ${storageError.message}`);
        setProgress(Math.round(((i + 1) / validFiles.length) * 100));
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('evidence-files')
        .getPublicUrl(storageData.path);

      const { data: evidenceData, error: dbError } = await supabase
        .from('evidence')
        .insert({
          case_id: caseId,
          user_id: userId,
          file_name: validFiles[i].name,
          file_type: file.type,
          file_url: urlData.publicUrl,
          file_size: file.size,
          analysis_status: 'pending',
        })
        .select()
        .maybeSingle();

      if (dbError) {
        failedUploads++;
        toast.error(`Failed to save evidence record for ${file.name}`);
      } else if (evidenceData) {
        successfulUploads++;
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: evidenceData.id,
            name: validFiles[i].name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            evidenceId: evidenceData.id,
          },
        ]);
        pendo.track('evidence_uploaded', {
          case_id: caseId,
          evidence_id: evidenceData.id,
          file_type: file.type,
          file_size_bytes: file.size,
          original_file_name: validFiles[i].name,
          was_compressed: compressed,
          batch_total_files: validFiles.length,
          batch_position: i + 1,
        });
        const msg = compressed
          ? `${validFiles[i].name} uploaded & compressed (${formatBytes(file.size)})`
          : `${validFiles[i].name} uploaded successfully`;
        toast.success(msg);
        onUploadComplete(evidenceData.id);
      }

      setProgress(Math.round(((i + 1) / validFiles.length) * 100));
    }

    pendo.track('evidence_batch_upload_completed', {
      case_id: caseId,
      total_files_attempted: rawFiles.length,
      valid_files_count: validFiles.length,
      skipped_invalid_count: invalid,
      successful_uploads: successfulUploads,
      failed_uploads: failedUploads,
    });

    setUploading(false);
    setStatusMsg('');
  }, [caseId, userId, onUploadComplete]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded p-8 text-center transition-colors cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          uploading && 'pointer-events-none opacity-60',
        )}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground text-balance">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-pretty">
              Screenshots, images, PDFs, text files — max 1 MB each (auto-compressed)
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-2 h-9 font-semibold pointer-events-none"
            disabled={uploading}
            onClick={(e) => e.stopPropagation()}
          >
            <Upload className="w-4 h-4" />
            Choose Files
          </Button>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{statusMsg}</p>
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded this session</p>
          {uploadedFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded border border-border bg-card">
              <div className="shrink-0">{getFileIcon(f.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
