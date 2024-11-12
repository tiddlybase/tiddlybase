import { WikiLink } from "./WikiLink";
import { ExternalLink } from "./ExternalLink";
import {urlHashToFragmentName} from "@tiddlybase/shared/src/fragment-utils"
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
    const tiddlerParts = tiddler.split('#');
    if (tiddlerParts.length === 2) {
      // the [[tiddler#fragment]] syntax
      return <WikiLink tiddler={tiddlerParts[0]} fragment={tiddlerParts[1]}>{text}</WikiLink>;
    }
    return <WikiLink tiddler={tiddler}>{text}</WikiLink>;
  }
  if (props.href?.startsWith('#toc-anchor-link-')) {
    return <WikiLink fragment={children as string}>{children}</WikiLink>
  }
  if (props.href?.startsWith('#') && (typeof children === 'string')) {
    const text = children
    return <WikiLink fragment={urlHashToFragmentName(props.href)}>{text}</WikiLink>;
  }
  // external link
  return <ExternalLink {...props}>{children}</ExternalLink>;
};
