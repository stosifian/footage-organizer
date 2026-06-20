import { createColumnHelper } from '@tanstack/react-table'
import type { ClipData } from '../../types/clip'
import { ThumbnailCell } from './ThumbnailCell'
import { DateCell } from './DateCell'
import { SceneDescriptionCell } from './SceneDescriptionCell'
import { SceneKeywordsCell } from './SceneKeywordsCell'
import { TagChipsCell } from './TagChipsCell'

const col = createColumnHelper<ClipData>()

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function createColumns(directory: string, onPreview: (clip: ClipData) => void) {
  return [
    col.display({
      id: 'thumbnail',
      header: '',
      size: 96,
      cell: ({ row }) => (
        <ThumbnailCell
          clip={row.original}
          directory={directory}
          onPreview={() => onPreview(row.original)}
        />
      )
    }),

    col.accessor('fileName', {
      header: 'File Name',
      size: 200,
      cell: ({ row, getValue }) => {
        const isMissing = row.original.missing
        return (
          <div className="flex items-center gap-1.5">
            {isMissing && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400 rounded">
                Missing
              </span>
            )}
            <span
              className={`text-xs font-medium truncate block ${isMissing ? 'line-through text-[var(--text-label)]' : ''}`}
              title={getValue()}
            >
              {getValue()}
            </span>
          </div>
        )
      }
    }),

    col.accessor('folder', {
      header: 'Folder',
      size: 130,
      cell: ({ getValue }) => {
        const folder = getValue()
        return (
          <span className="text-xs text-[var(--text-secondary)] truncate block" title={folder || '(root)'}>
            {folder || '/'}
          </span>
        )
      }
    }),

    col.accessor('dateShot', {
      header: 'Date Shot',
      size: 120,
      cell: ({ getValue }) => <DateCell dateShot={getValue()} />
    }),

    col.accessor('duration', {
      header: 'Duration',
      size: 70,
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-secondary)]">{formatDuration(getValue())}</span>
      )
    }),

    col.accessor('resolution', {
      header: 'Resolution',
      size: 80,
      cell: ({ getValue }) => <span className="text-xs text-[var(--text-secondary)]">{getValue()}</span>
    }),

    col.accessor('fileSize', {
      header: 'Size',
      size: 70,
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-secondary)]">{formatFileSize(getValue())}</span>
      )
    }),

    col.accessor('sceneDescription', {
      header: 'Scene Description',
      size: 220,
      cell: ({ row }) => (
        <SceneDescriptionCell
          clipId={row.original.id}
          description={row.original.sceneDescription}
          missing={row.original.missing}
        />
      )
    }),

    col.accessor('sceneKeywords', {
      header: 'Scene Keywords',
      size: 180,
      cell: ({ row }) => <SceneKeywordsCell clipId={row.original.id} keywords={row.original.sceneKeywords} />
    }),

    col.accessor('visualTexture', {
      header: 'Visual Texture',
      size: 160,
      cell: ({ row }) => (
        <TagChipsCell
          clipId={row.original.id}
          category="visualTexture"
          tags={row.original.visualTexture}
        />
      )
    }),

    col.accessor('energy', {
      header: 'Energy',
      size: 140,
      cell: ({ row }) => (
        <TagChipsCell
          clipId={row.original.id}
          category="energy"
          tags={row.original.energy}
        />
      )
    }),

    col.accessor('mood', {
      header: 'Mood',
      size: 140,
      cell: ({ row }) => (
        <TagChipsCell
          clipId={row.original.id}
          category="mood"
          tags={row.original.mood}
        />
      )
    }),

    col.accessor('lightQuality', {
      header: 'Light Quality',
      size: 150,
      cell: ({ row }) => (
        <TagChipsCell
          clipId={row.original.id}
          category="lightQuality"
          tags={row.original.lightQuality}
        />
      )
    }),

    col.accessor('location', {
      header: 'Location',
      size: 150,
      cell: ({ row }) => (
        <TagChipsCell
          clipId={row.original.id}
          category="location"
          tags={row.original.location}
        />
      )
    })
  ]
}
