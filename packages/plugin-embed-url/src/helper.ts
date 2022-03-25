import { EmbedURLProps } from "./props";
import {makeAbsoluteURL} from "@tiddlybase/plugin-adaptors-lib/src/url";

const TAG_TO_EXTENSION_MAP = {
  'img': ['jpg', 'jpeg', 'png', 'gif', 'heic', 'svg'],
  'video': ['mp4', 'mov', 'mkv'],
  'embed': ['pdf'],
}

type Tag = keyof typeof TAG_TO_EXTENSION_MAP;

const maybeAttribute = (propName: keyof EmbedURLProps, props: EmbedURLProps, overrideAttributName?: string): string => props[propName] ? `${overrideAttributName ?? propName}="${props[propName]}" ` : ''

const INNERHTML_GENERATORS: Record<Tag, (url: string, props: EmbedURLProps) => string> = {
  'img': (url, props) => `<img src="${url}" ${maybeAttribute('height', props)} ${maybeAttribute('width', props)} ${maybeAttribute('description', props, 'title')} />`,
  'video': (url, props) => `
      <video controls ${maybeAttribute('height', props)} ${maybeAttribute('width', props)}>
        <source src="${url}" />
      </video>`,
  'embed': (url, props) => `<embed src="${url}" ${maybeAttribute('height', props)} ${maybeAttribute('width', props)} />`
}

const DEFAULT_TAG: Tag = "embed";

const CONTAINER_CLASSES = ["tc-tiddler-body", "tc-reveal"];

export const getExtension = (filename: string): string => {
  const parts = filename.toLowerCase().trim().split(".");
  return parts[parts.length - 1];
}

export const getTagForExtension = (extension: string): Tag => {
  let tag: string;
  let extensions: string[];
  for ([tag, extensions] of Object.entries(TAG_TO_EXTENSION_MAP)) {
    if (extensions.includes(extension)) {
      return tag as Tag;
    }
  }
  return DEFAULT_TAG;
}

export const getDomNode = (doc: Document, props: EmbedURLProps) => {
  console.log("getDomNode");
  const extension = getExtension(props.src);
  const htmlGenerator = INNERHTML_GENERATORS[getTagForExtension(extension)];
  const containerNode = doc.createElement('div');
  // add CSS classes
  CONTAINER_CLASSES.forEach(cls => containerNode.classList.add(cls));
  const absoluteUrl = makeAbsoluteURL(props.src);
  if (typeof absoluteUrl === 'string') {
    containerNode.innerHTML = htmlGenerator(absoluteUrl, props);
  } else {
    // absolute URL is a promise
    containerNode.innerHTML = getPlaceholderHtml(props);
    absoluteUrl.then(url => {
      containerNode.innerHTML = htmlGenerator(url, props);
    });
  }

  return containerNode;
}
const getPlaceholderHtml = (_props: EmbedURLProps): string => {
  // TODO: spinner
  return "loading..."
}

