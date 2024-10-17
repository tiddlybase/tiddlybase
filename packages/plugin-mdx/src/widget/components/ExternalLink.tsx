const DEFAULT_EXTERNAL_LINK_PROPS = {
  rel: "noopener noreferrer",
  target: "_blank",
};

// TiddlyWiki 5.2.7 includes https://github.com/Jermolene/TiddlyWiki5/pull/6528
  // which adds the "_codified_" class to links.",
const DEFAULT_EXTERNAL_LINK_CLASSES = "tc-tiddlylink-external _codified_ ";

export const ExternalLink = (
  {children, ...attributes}: React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >
) => {
  // external link
  const mergedProps = {
    ...DEFAULT_EXTERNAL_LINK_PROPS,
    ...attributes,
    className: DEFAULT_EXTERNAL_LINK_CLASSES + (attributes.className ?? "")
  };
  return <a {...mergedProps}>{children}</a>;
};
