import { EmbedAttribute, EmbedSpec, EmbedURLProps, EMBED_ATTRIBUTES, RenderedEmbed } from "./props";
import { resolveURL, getExtension } from "@tiddlybase/plugin-adaptors-lib/src/url";

type ObjectType = 'image' | 'video' | 'embed' | 'link' | 'iframe';

const EXTENSION_TO_OBJECT_TYPE: Record<string, ObjectType> = {
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

const NEW_TAB_LINK_ATTRIBUTES = ['target="_blank"', 'rel="noopener"', 'noreferrer'];

const RE_YOUTUBE = new RegExp("^https://www\.youtube\.com/watch\\?v=([a-zA-Z0-9]+)");

const maybeAttribute = (propName: keyof EmbedSpec, spec: EmbedSpec, overrideAttributName?: string): string => spec[propName] ? `${overrideAttributName ?? propName}="${spec[propName]}" ` : ''

// returns HTML for the embedded object, plus updated spec
type HTMLGenerator = (spec: EmbedSpec) => RenderedEmbed;

const makeLinkElement = (url: string, extraAttributes: string[] = [], body = '') => `<a href="${url}" ${extraAttributes.join(" ")}>${body}</a>`

const getYoutubeVideoID = (url: string) => url.match(RE_YOUTUBE)?.[1];

const addInnerHTML = (spec:EmbedSpec, innerHTML:string):RenderedEmbed => ({
  ...spec,
  innerHTML
})

const INNERHTML_GENERATORS: Record<ObjectType, HTMLGenerator> = {
  'image': spec => {
    const img = `<img src="${spec.resolvedSrc}" ${maybeAttribute('height', spec)} ${maybeAttribute('width', spec)} ${maybeAttribute('description', spec, 'title')} />`;
    return addInnerHTML(spec, spec.parsedAttributes.includes('open-in-new-tab-on-click') ? makeLinkElement(spec.resolvedSrc, NEW_TAB_LINK_ATTRIBUTES, img) : img);
  },
  'video': spec => addInnerHTML(spec, `
      <video controls ${maybeAttribute('height', spec)} ${maybeAttribute('width', spec)}>
        <source src="${spec.resolvedSrc}" />
      </video>`),
  'embed': spec => addInnerHTML(spec, `<embed src="${spec.resolvedSrc}" ${maybeAttribute('height', spec)} ${maybeAttribute('width', spec)} />`),
  'link': spec => {
    let extraAttributes: string[] = [];
    let cssClasses = ['embed-inline-link-container']
    if (spec.parsedAttributes.includes('download')) {
      extraAttributes = [`download="${spec.src.split('/').slice(-1)[0]}"`];
    }
    if (spec.parsedAttributes.includes('open-in-new-tab-on-click')) {
      extraAttributes = NEW_TAB_LINK_ATTRIBUTES;
    }
    return addInnerHTML({
      ...spec,
      cssClasses
    }, makeLinkElement(spec.resolvedSrc, extraAttributes, spec.description));
  },
  'iframe': spec => addInnerHTML(spec, `<iframe frameborder="0" scrolling="no" marginheight="0" marginwidth="0" ${maybeAttribute('height', spec)} ${maybeAttribute('width', spec)} src="${spec.resolvedSrc}"></iframe>`)
};

const DEFAULT_CONTAINER_CLASSES = ["tc-tiddler-body", "tc-reveal"];

const addSpecAttribute = (spec: EmbedSpec, attribute: EmbedAttribute): EmbedSpec => ({
  ...spec,
  parsedAttributes: spec.parsedAttributes.concat(attribute)
})

const generateHtml = (spec: EmbedSpec): RenderedEmbed => {
  // download links are always <a>
  if (spec.parsedAttributes.includes('download')) {
    return INNERHTML_GENERATORS['link'](spec);
  }
  // try to embed youtube links
  const youtubeVideoId = getYoutubeVideoID(spec.resolvedSrc);
  if (youtubeVideoId) {
    if (spec.inSandboxedIframe) {
      return INNERHTML_GENERATORS['link'](addSpecAttribute(spec, 'open-in-new-tab-on-click'))
    } else {
      return INNERHTML_GENERATORS['iframe']({
        ...spec,
        resolvedSrc: `https://www.youtube.com/embed/${youtubeVideoId}`
      });
    }
  }

  // for images and media files
  const extension = getExtension(spec.resolvedSrc);
  let objectType: ObjectType = (extension ? EXTENSION_TO_OBJECT_TYPE[extension] : undefined) ?? 'link';
  // in sandboxed iframe, embedded objects like PDFs should open in new tab
  // because the browser will not start plugins for displaying them.
  if (spec.inSandboxedIframe && objectType === 'embed') {
    return INNERHTML_GENERATORS['link']({
      ...(addSpecAttribute(spec, 'open-in-new-tab-on-click')),
      // if no title was given, use the original (possibly relative) filename
      description: spec.description || spec.src
    })
  }
  return INNERHTML_GENERATORS[objectType](spec);
}

const applyCssClasses = (containerNode: HTMLDivElement, cssClasses?: string[]) => {
  cssClasses?.forEach(cls => containerNode?.classList?.add(cls));
}

const parseAttributes = (attributes?: string): EmbedAttribute[] => (attributes ? attributes.split(',') : []).reduce((parsed: EmbedAttribute[], a: string) => {
  const attribute = a.trim();
  if (EMBED_ATTRIBUTES.includes(attribute as EmbedAttribute)) {
    parsed.push(attribute as EmbedAttribute);
  } else {
    console.warn("ignoring unknown embed-url attribute " + a);
  }
  return parsed;
}, []);

const makeEmbedSpec = (props: EmbedURLProps, resolvedSrc: string, cssClasses: string[], parsedAttributes: EmbedAttribute[]): EmbedSpec => ({
  ...props,
  resolvedSrc,
  cssClasses,
  parsedAttributes,
  inSandboxedIframe: $tw?.tiddlybase?.inSandboxedIframe ?? false
});


export const getDomNode = (doc: Document, props: EmbedURLProps) => {

  const containerNode = doc.createElement('div');
  const runWhenUrlReady = (resolvedSrc: string) => {
    const cssClasses = props.cssClasses ?? DEFAULT_CONTAINER_CLASSES.slice();
    const parsedAttributes = parseAttributes(props.attributes)
    const spec = makeEmbedSpec(props, resolvedSrc, cssClasses, parsedAttributes)
    const rendered = generateHtml(spec);
    applyCssClasses(containerNode, rendered.cssClasses);
    containerNode.innerHTML = rendered.innerHTML;
  }

  const resolvedSrc = resolveURL(props.src);
  if (typeof resolvedSrc === 'string') {
    runWhenUrlReady(resolvedSrc)
  } else {
    // absolute URL is a promise
    containerNode.innerHTML = getPlaceholderHtml(props);
    resolvedSrc.then(runWhenUrlReady);
  }

  return containerNode;
}
const getPlaceholderHtml = (_props: EmbedURLProps): string => {
  // TODO: spinner
  return "loading..."
}

