export type PathTemplateComponentEncoding = 'encodeURI' | 'base64' | 'encodeURIComponent'

export interface PathTemplateComponent {
  shortName: string;
  variableName: string;
  pattern?: string; // RegExp pattern
  encoding?: PathTemplateComponentEncoding;
}

export type PathTemplate = PathTemplateComponent[];