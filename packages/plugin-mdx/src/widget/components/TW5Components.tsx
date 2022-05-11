const DEFAULT_EXTERNAL_LINK_PROPS = {
  className: "tc-tiddlylink-external",
  rel: "noopener noreferrer",
  target: "_blank",
};

export const TW5ExternalLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>
): React.ReactElement => (
  <a
    {...{
      ...DEFAULT_EXTERNAL_LINK_PROPS,
      ...props,
    }}
  >
    {props.children}
  </a>
);
