import { EmbedURLProps } from "./props";
import {makeAbsoluteURL} from "@tiddlybase/plugin-adaptors-lib/src/url";

const ELEMENT_TYPE_TO_EXTENSION_MAP = {
  'img': ['jpg', 'jpeg', 'png', 'gif', 'heic', 'svg'],
  'video': ['mp4', 'mov', 'mkv'],
  'embed': ['pdf'],
  'a': []
}

const NEW_TAB_LINK_ATTRIBUTES = ['target="_blank"', 'rel="noopener"', 'noreferrer'];

type ElementType = keyof typeof ELEMENT_TYPE_TO_EXTENSION_MAP;

const maybeAttribute = (propName: keyof EmbedURLProps, props: EmbedURLProps, overrideAttributName?: string): string => props[propName] ? `${overrideAttributName ?? propName}="${props[propName]}" ` : ''

type HTMLGenerator = (url: string, props: EmbedURLProps) => string;

const makeLinkElement = (url:string, extraAttributes:string[] = [], body='') => `<a href="${url}" ${extraAttributes.join(" ")}>${body}</a>`

const INNERHTML_GENERATORS: Record<ElementType, HTMLGenerator> = {
  'img': (url, props) => {
    const img = `<img src="${url}" ${maybeAttribute('height', props)} ${maybeAttribute('width', props)} ${maybeAttribute('description', props, 'title')} />`;
    return props.type == 'open-in-new-tab-on-click' ? makeLinkElement(url, NEW_TAB_LINK_ATTRIBUTES, img) : img;
  },
  'video': (url, props) => `
      <video controls ${maybeAttribute('height', props)} ${maybeAttribute('width', props)}>
        <source src="${url}" />
      </video>`,
  'embed': (url, props) => `<embed src="${url}" ${maybeAttribute('height', props)} ${maybeAttribute('width', props)} />`,
  'a': (url, props) => {
    props.cssClasses?.push('embed-inline-link-container');
    let extraAttributes:string[] = [];
    if (props.type === 'download') {
      extraAttributes = [`download="${props.src.split('/').slice(-1)[0]}"`];
    }
    if (props.type === 'open-in-new-tab-on-click') {
      extraAttributes = NEW_TAB_LINK_ATTRIBUTES;
    }
    return makeLinkElement(url, extraAttributes, props.description);
  }
};

const DEFAULT_TAG: ElementType = "embed";

const DEFAULT_CONTAINER_CLASSES = ["tc-tiddler-body", "tc-reveal"];

export const getExtension = (filename: string) => filename.toLowerCase().trim().split(".").slice(-1)[0];

export const getTagForExtension = (extension: string): ElementType => {
  let tag: string;
  let extensions: string[];
  for ([tag, extensions] of Object.entries(ELEMENT_TYPE_TO_EXTENSION_MAP)) {
    if (extensions.includes(extension)) {
      return tag as ElementType;
    }
  }
  return DEFAULT_TAG;
}

const getGenerator = (props:EmbedURLProps):HTMLGenerator => {
  // TODO: take embed type attribute and sandboxed iframe status into account
  let elementType:ElementType;
  if (props.type === 'download') {
    elementType = 'a';
  } else {
    const extension = getExtension(props.src);
    elementType = getTagForExtension(extension);
    // in sandboxed iframe, embedded objects like PDFs should open in new tab
    // because the browser will not start plugins for displaying them.
    if ($tw?.tiddlybase?.inSandboxedIframe && elementType === 'embed') {
      elementType = 'a';
      // if no title was given, use the relative filename
      props.description = props.description || props.src;
      props.type = 'open-in-new-tab-on-click';
    }
  }
  return INNERHTML_GENERATORS[elementType];
}

const applyCssClasses = (containerNode:HTMLDivElement, cssClasses?:string[]) => {
  cssClasses?.forEach(cls => containerNode.classList.add(cls));
}

export const getDomNode = (doc: Document, props: EmbedURLProps) => {

  const htmlGenerator = getGenerator(props);
  const containerNode = doc.createElement('div');
  props.cssClasses = props.cssClasses ?? DEFAULT_CONTAINER_CLASSES.slice();

  const absoluteUrl = makeAbsoluteURL(props.src);
  if (typeof absoluteUrl === 'string') {
    containerNode.innerHTML = htmlGenerator(absoluteUrl, props);
    applyCssClasses(containerNode, props.cssClasses);
  } else {
    // absolute URL is a promise
    containerNode.innerHTML = getPlaceholderHtml(props);
    absoluteUrl.then(url => {
      containerNode.innerHTML = htmlGenerator(url, props);
      applyCssClasses(containerNode, props.cssClasses);
    });
  }

  return containerNode;
}
const getPlaceholderHtml = (_props: EmbedURLProps): string => {
  // TODO: spinner
  return "loading..."
}

