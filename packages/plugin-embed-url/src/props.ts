export type EmbedType = 'download' | 'open-in-new-tab-on-click';

export interface EmbedURLProps {
  src: string;
	width?: string;
	height?: string;
	description?: string;
	type?: EmbedType;
}
