import {
  EmbedAttribute,
  EmbedSpec,
  EmbedMediaProps,
  EMBED_ATTRIBUTES,
  LinkIcon,
  ObjectType,
  RenderedEmbed,
} from "./props";
import {
  resolveURL,
  getExtension,
  cleanupURL,
} from "@tiddlybase/plugin-tiddlybase-utils/src/url";
import { EXTENSION_TO_OBJECT_TYPE } from "./constants";
import { useState, useEffect } from "react";

const ENABLE_ICONS = true;

export const LINK_ICONS: Record<LinkIcon, JSX.Element> = {
  youtube: (
    <i className="prefix-icon fa-brands fa-youtube" aria-hidden="true"></i>
  ),
  pdf: <i className="prefix-icon fa fa-file-pdf" aria-hidden="true"></i>,
  file: <i className="prefix-icon fa fa-file" aria-hidden="true"></i>,
};

type LinkAttributes = Partial<React.AnchorHTMLAttributes<HTMLAnchorElement>>;

const NEW_TAB_LINK_ATTRIBUTES: LinkAttributes = {
  target: "_blank",
  rel: "noopener",
  referrerPolicy: "no-referrer",
};

const RE_YOUTUBE = new RegExp(
  "^https://www.youtube.com/watch\\?v=([a-zA-Z0-9]+)"
);

const maybeAddAttribute = (
  dest: Record<string, any>,
  spec: EmbedSpec,
  propName: keyof EmbedSpec,
  overrideAttributName?: string
): Partial<Record<string, string>> => {
  if (spec[propName]) {
    return Object.assign(dest, {
      [overrideAttributName ?? propName]: spec[propName],
    });
  }
  return dest;
};

// returns HTML for the embedded object, plus updated spec
type HTMLGenerator = (spec: EmbedSpec) => RenderedEmbed;

const makeLinkElement = (
  url: string,
  extraAttributes: typeof NEW_TAB_LINK_ATTRIBUTES = {},
  body: React.ReactNode = null
) => (
  <a href={url} {...extraAttributes}>
    {body}
  </a>
);

const getYoutubeVideoID = (url: string) => url.match(RE_YOUTUBE)?.[1];

const addIcon = (icon?: LinkIcon, description?: string) => (
  <>
    {icon ? LINK_ICONS[icon] : null}
    {description}
  </>
);

const addElement = (spec: EmbedSpec, element: JSX.Element): RenderedEmbed => ({
  ...spec,
  element,
});

const INNERHTML_GENERATORS: Record<ObjectType, HTMLGenerator> = {
  image: (spec) => {
    const props = {
      className: spec.cssClasses.join(" "),
      src: spec.resolvedSrc,
    };
    maybeAddAttribute(props, spec, "height");
    maybeAddAttribute(props, spec, "width");
    maybeAddAttribute(props, spec, "description", "title");
    const img = <img {...props} />;
    return addElement(
      spec,
      spec.parsedAttributes.has("open-in-new-tab-on-click")
        ? makeLinkElement(spec.resolvedSrc, NEW_TAB_LINK_ATTRIBUTES, img)
        : img
    );
  },
  video: (spec) => {
    const props = {
      className: spec.cssClasses.join(" "),
    };
    maybeAddAttribute(props, spec, "height");
    maybeAddAttribute(props, spec, "width");
    return addElement(
      spec,
      <video controls {...props}>
        <source src={spec.resolvedSrc} />
      </video>
    );
  },
  audio: (spec) => {
    const props = {
      className: spec.cssClasses.join(" "),
    };
    maybeAddAttribute(props, spec, "height");
    maybeAddAttribute(props, spec, "width");
    return addElement(
      spec,
      <audio controls {...props}>
        <source src={spec.resolvedSrc} />
      </audio>
    );
  },
  embed: (spec) => {
    const props = {
      className: spec.cssClasses.join(" "),
    };
    maybeAddAttribute(props, spec, "height");
    maybeAddAttribute(props, spec, "width");
    return addElement(spec, <embed src={spec.resolvedSrc} {...props} />);
  },
  link: (spec) => {
    const attributes: LinkAttributes = {};
    let cssClasses = ["embed-inline-link-container"];
    if (spec.parsedAttributes.has("download")) {
      attributes["download"] = spec.src.split("/").slice(-1)[0];
    }
    if (spec.parsedAttributes.has("open-in-new-tab-on-click")) {
      Object.assign(attributes, NEW_TAB_LINK_ATTRIBUTES);
    }
    return addElement(
      {
        ...spec,
        cssClasses,
      },
      makeLinkElement(
        spec.resolvedSrc,
        {
          ...attributes,
          className: [...cssClasses, spec.cssClasses].join(" "),
        },
        addIcon(spec.icon, spec.description)
      )
    );
  },
  iframe: (spec) => {
    const props = {
      className: spec.cssClasses.join(" "),
    };
    maybeAddAttribute(props, spec, "height");
    maybeAddAttribute(props, spec, "width");
    return addElement(
      spec,
      <iframe
        frameBorder={0}
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={spec.resolvedSrc}
        {...props}
      ></iframe>
    );
  },
};

const DEFAULT_CONTAINER_CLASSES = ["tc-tiddler-body", "tc-reveal"];

const addSpecAttribute = (
  spec: EmbedSpec,
  attribute: EmbedAttribute
): EmbedSpec => ({
  ...spec,
  parsedAttributes: new Set([...spec.parsedAttributes, attribute]),
});

const getIconForExtension = (extension: string): LinkIcon =>
  extension === "pdf" ? "pdf" : "file";

export const generateHtml = (spec: EmbedSpec): RenderedEmbed => {
  // download links are always <a>
  if (spec.parsedAttributes.has("download")) {
    let icon: LinkIcon | undefined = undefined;
    if (ENABLE_ICONS) {
      const extension = getExtension(spec.resolvedSrc);
      icon = extension ? getIconForExtension(extension) : undefined;
    }
    return INNERHTML_GENERATORS["link"]({
      ...spec,
      icon,
    });
  }
  // try to embed youtube links
  const youtubeVideoId = getYoutubeVideoID(spec.resolvedSrc);
  if (youtubeVideoId) {
    if (spec.inSandboxedIframe) {
      return INNERHTML_GENERATORS["link"](
        addSpecAttribute(
          {
            ...spec,
            icon: ENABLE_ICONS ? "youtube" : undefined,
          },
          "open-in-new-tab-on-click"
        )
      );
    } else {
      return INNERHTML_GENERATORS["iframe"]({
        ...spec,
        resolvedSrc: `https://www.youtube.com/embed/${youtubeVideoId}`,
      });
    }
  }
  // try to guess object type based on extension
  const extension = getExtension(spec.resolvedSrc);
  let objectType: ObjectType = (extension ? EXTENSION_TO_OBJECT_TYPE[extension] : undefined) ?? "link";
  // blob's are images, override extension
  if (spec.resolvedSrc.startsWith('blob:')) {
    objectType = "image"
  }
  // in sandboxed iframe, embedded objects like PDFs should open in new tab
  // because the browser will not start plugins for displaying them.
  if (spec.inSandboxedIframe && objectType === "embed") {
    return INNERHTML_GENERATORS["link"](
      addSpecAttribute(
        {
          ...spec,
          // if no title was given, use the original (possibly relative) filename
          description: spec.description || spec.src,
          icon:
            ENABLE_ICONS && extension
              ? getIconForExtension(extension)
              : undefined,
        },
        "open-in-new-tab-on-click"
      )
    );
  }
  return INNERHTML_GENERATORS[objectType](spec);
};

const parseAttributes = (attributes?: string): Set<EmbedAttribute> =>
  (attributes ? attributes.split(",") : []).reduce(
    (parsed: Set<EmbedAttribute>, a: string) => {
      const attribute = a.trim();
      if (EMBED_ATTRIBUTES.includes(attribute as EmbedAttribute)) {
        parsed.add(attribute as EmbedAttribute);
      } else {
        console.warn("ignoring unknown embed-url attribute " + a);
      }
      return parsed;
    },
    new Set<EmbedAttribute>()
  );

const makeEmbedSpec = (
  props: EmbedMediaProps,
  resolvedSrc: string,
  cssClasses: string[],
  parsedAttributes: Set<EmbedAttribute>
): EmbedSpec => ({
  ...props,
  resolvedSrc,
  cssClasses,
  parsedAttributes,
  inSandboxedIframe: !!$tw?.tiddlybase?.topLevelClient,
});

export const MediaNode = (props: EmbedMediaProps) => {
  const { src } = props;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let realUrl = src;
    Promise.resolve(resolveURL(src)).then(s => {
      realUrl = s;
      setResolvedSrc(s);
    });
    return () => {
      cleanupURL(realUrl);
    }
  }, [src]);

  const createElement = () => {
    const cssClasses = props.cssClasses ?? DEFAULT_CONTAINER_CLASSES.slice();
    const parsedAttributes = parseAttributes(props.attributes);
    const spec = makeEmbedSpec(
      props,
      resolvedSrc!,
      cssClasses,
      parsedAttributes
    );
    const rendered = generateHtml(spec);
    return rendered.element;
  };

  return resolvedSrc ? createElement() : getPlaceholderHtml(props);
};

const getPlaceholderHtml = (_props: EmbedMediaProps): JSX.Element => {
  // TODO: spinner
  return <>"loading..."</>;
};
