import { registerComponent } from "@tiddlybase/plugin-mdx/src/widget/mdx";
import { EmbedMedia } from "./embed-media";

export const name = "register-img-component";
export const platforms = ["browser"];
export const after = ["load-modules"];
export const before = ["startup"];
export const synchronous = true;
export const startup = () =>
  registerComponent(
    "img",
    (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      // don't override images components when coming from markdown
      if ((props as any)['data-from-md'] === 'true') {
        const { alt, src, title } = props;
        return src ? (
          <EmbedMedia src={src} description={alt} attributes={title} />
        ) : null;
      }
      // otherwise use the regular 'img' component
      return (<img {...props} />);
    }
  );
