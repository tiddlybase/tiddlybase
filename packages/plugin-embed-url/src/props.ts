
export const EMBED_ATTRIBUTES = ['download', 'open-in-new-tab-on-click'] as const;
export type EmbedAttribute = typeof EMBED_ATTRIBUTES[number];

export interface EmbedURLProps {
  src: string;
	width?: string;
	height?: string;
	description?: string;
	attributes?: string;
	cssClasses?: string[];
}

export type EmbedSpec = Omit<EmbedURLProps, 'attributes' | 'cssClasses'> & {
	inSandboxedIframe: boolean,
	cssClasses: string[];
	resolvedSrc: string,
	parsedAttributes: EmbedAttribute[],
}

export type RenderedEmbed = EmbedSpec & {
	innerHTML: string,
}
