import { FileText, ExternalLink, Loader2 } from 'lucide-react'
import { useAuthenticatedFileUrl, useOpenAuthenticatedFile } from '@/hooks/useAuthenticatedFile'

interface AuthenticatedAttachmentProps {
  url: string
  className?: string
  imageClassName?: string
}

function isImagePath(path: string): boolean {
  return /\.(jpg|jpeg|png|webp|heic)$/i.test(path)
}

/** Renders invoice/receipt attachments stored behind /api/files (Clerk JWT required). */
export function AuthenticatedAttachment({ url, className, imageClassName }: AuthenticatedAttachmentProps) {
  const { url: displayUrl, loading, error } = useAuthenticatedFileUrl(url)
  const openFile = useOpenAuthenticatedFile()
  const isImage = isImagePath(url)

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 text-text-muted ${className ?? ''}`}>
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    )
  }

  if (error || !displayUrl) {
    return (
      <div className={`p-4 text-center text-[13px] text-text-muted ${className ?? ''}`}>
        Could not load attachment
      </div>
    )
  }

  return (
    <div className={className}>
      {isImage ? (
        <button
          type="button"
          onClick={() => void openFile(url)}
          className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
        >
          <img
            src={displayUrl}
            alt="Soporte"
            className={imageClassName ?? 'w-full max-h-[200px] object-cover hover:opacity-90 transition-opacity'}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void openFile(url)}
          className="flex w-full items-center gap-2 p-4 text-brand hover:bg-brand/5 transition-colors"
        >
          <FileText className="h-8 w-8 shrink-0" />
          <span className="text-[13px]">Ver documento PDF</span>
        </button>
      )}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <button
          type="button"
          onClick={() => void openFile(url)}
          className="flex items-center gap-1 text-[11px] text-brand hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open in new tab
        </button>
      </div>
    </div>
  )
}
