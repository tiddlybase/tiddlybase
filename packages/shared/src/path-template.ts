export type PathTemplateComponentEncoding = 'encodeURI' | 'base64' | 'encodeURIComponent'

export type PathTemplateVariable = 'launchConfig' | 'instance' | 'filter' | 'tiddler';

export interface PathTemplateComponent {
  shortName: string;
  variableName: PathTemplateVariable;
  pattern?: string; // RegExp pattern
  encoding?: PathTemplateComponentEncoding;
}

export type PathTemplate = PathTemplateComponent[];
