import {registerComponent} from '@tiddlybase/plugin-mdx/src/widget/mdx'
import { EmbedMedia } from './embed-media';

export const name = "register-img-component";
export const platforms = ["browser", "node"];
export const after = ["load-modules"];
export const synchronous = true;
export const startup = () => registerComponent('img', (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const {alt, src, title} = props;
  return src ? (<EmbedMedia src={src} description={alt} attributes={title}/>) : null;
})
