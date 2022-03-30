import { ObjectType } from "./props"

export const EXTENSION_TO_OBJECT_TYPE: Record<string, ObjectType> = {
  'jpg': 'image',
  'jpeg': 'image',
  'png': 'image',
  'gif': 'image',
  'heic': 'image',
  'svg': 'image',
  'mp4': 'video',
  'mov': 'video',
  'mkv': 'video',
  'pdf': 'embed',
}

export const LINK_ICONS = {
  'youtube': '<i class="prefix-icon fa-brands fa-youtube" aria-hidden="true"></i>',
  'pdf': '<i class="prefix-icon fa fa-file-pdf" aria-hidden="true"></i>',
  'file': '<i class="prefix-icon fa fa-file" aria-hidden="true"></i>'
}
