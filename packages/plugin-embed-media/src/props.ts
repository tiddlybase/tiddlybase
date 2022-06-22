
export type LinkIcon =  'youtube' | 'pdf' | 'file';
export type ObjectType = 'image' | 'video' | 'audio' | 'embed' | 'link' | 'iframe';

export const EMBED_ATTRIBUTES = ['download', 'open-in-new-tab-on-click'] as const;
export type EmbedAttribute = typeof EMBED_ATTRIBUTES[number];

export interface EmbedMediaProps {
  src: string;
	width?: string;
	height?: string;
	description?: string;
	attributes?: string;
	cssClasses?: string[];
}

export type EmbedSpec = Omit<EmbedMediaProps, 'attributes' | 'cssClasses'> & {
	inSandboxedIframe: boolean,
	cssClasses: string[];
	resolvedSrc: string,
	parsedAttributes: Set<EmbedAttribute>,
	icon?: LinkIcon
}

export type RenderedEmbed = EmbedSpec & {
	element: JSX.Element
}
