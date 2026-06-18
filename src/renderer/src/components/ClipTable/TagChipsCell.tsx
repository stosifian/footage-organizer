import { TagEditor } from '../TagEditor'
import type { TagCategory } from '../../constants/preset-tags'

interface Props {
  clipId: string
  category: TagCategory
  tags: string[]
}

export function TagChipsCell({ clipId, category, tags }: Props) {
  return <TagEditor clipId={clipId} category={category} selectedTags={tags} />
}
