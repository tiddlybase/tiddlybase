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

export const LINK_ICONS = {
  'youtube': '<i class="prefix-icon fa-brands fa-youtube" aria-hidden="true"></i>',
  'pdf': '<i class="prefix-icon fa fa-file-pdf" aria-hidden="true"></i>',
  'file': '<i class="prefix-icon fa fa-file" aria-hidden="true"></i>'
}
