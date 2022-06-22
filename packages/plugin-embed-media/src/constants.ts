import { ObjectType } from "./props"

export const EXTENSION_TO_OBJECT_TYPE: Record<string, ObjectType> = {
  'gif': 'image',
  'heic': 'image',
  'jpeg': 'image',
  'jpg': 'image',
  'm4a': 'audio',
  'mkv': 'video',
  'mov': 'video',
  'mp4': 'video',
  'pdf': 'embed',
  'png': 'image',
  'svg': 'image',
}
