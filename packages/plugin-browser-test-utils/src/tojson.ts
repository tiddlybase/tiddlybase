// based on: https://github.com/sumn2u/dom-to-json

export type JsonDomNode = {
  nodeType: number;
  nodeValue?: string;
  tagName?: string;
  nodeName?: string;
  attributes?: Record<string, string>;
  childNodes?: Array<JsonDomNode>;
}

export const toJSON = (node:Node):JsonDomNode => {
    node = node || this;
    let obj:JsonDomNode = {
        nodeType: node.nodeType
    };
    if (node instanceof HTMLElement) {
      if (node.tagName) {
        obj.tagName = node.tagName.toLowerCase();
      }
      if (node.attributes) {
        obj.attributes = Object.fromEntries([...node.attributes].map((attr:Attr) => [attr.name, attr.value]));
      }
    } else {
      if (node.nodeName) {
        obj.nodeName = node.nodeName;
      }
    }
    if (node.nodeValue) {
        obj.nodeValue = node.nodeValue;
    }

    if (node.childNodes) {
        obj.childNodes = [...node.childNodes].map((child:ChildNode) => toJSON(child));
    }
    return obj;
}
