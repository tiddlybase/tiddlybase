import { WikiLink, HeadingLink } from "./WikiLink";
import { ExternalLink } from "./ExternalLink";

export const a = ({children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement>): React.ReactElement => {
  if (
    props.className === "internal new" &&
    typeof children === "string" &&
    !!props.href
  ) {
    /*  Internal wiki link case with double-bracket syntax, eg:
      [[Start|X]] -> {
        children: "X"
        className: "internal new"
        href: "Start"
      }
      // note this is opposite of the TW5 convention, [[Displayed Link Title|Tiddler Title]]
      // so we'll want to switch this. (See: https://tiddlywiki.com/static/Linking%2520in%2520WikiText.html )
  */
    const tiddler = children;
    const text = props.href;
    return <WikiLink tiddler={tiddler}>{text}</WikiLink>;
  }
  if (props.href?.startsWith('#toc-anchor-link-')) {
    return <HeadingLink headingContent={children as string} />
  }
  if (props.href?.startsWith('#') && (typeof children === 'string')) {
    /*  Internal wiki link case with hash link href
    target tiddler: "foo bar"
    [Start](#foo%20bar) -> {
      children: "Start"
      href: "#foo%20bar"
    }
    */
    const tiddler = decodeURIComponent(props.href.substring(1))
    const text = children
    return <WikiLink tiddler={tiddler}>{text}</WikiLink>;
  }
  // external link
  return <ExternalLink {...props}>{children}</ExternalLink>;
};
