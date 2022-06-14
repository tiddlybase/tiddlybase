import React from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transclude } = require("$:/core/modules/widgets/transclude.js");

const TranscludeClass: typeof $tw.Widget = transclude;

export interface TranscludeTiddlerParams {
  tiddler: string;
}

// based on: https://reactjs.org/docs/integrating-with-other-libraries.html#how-to-approach-the-problem
export class TranscludeTiddler extends React.Component<TranscludeTiddlerParams> {
  constructor(props: TranscludeTiddlerParams) {
    super(props);
  }

  el: HTMLDivElement | null = null;
  transcludeWidget: $tw.Widget | null = null;

  static contextType = TW5ReactContext;
  declare context: React.ContextType<typeof TW5ReactContext>;

  componentDidMount() {
    this.transcludeWidget = new TranscludeClass(
      {
        type: "transclude",
        attributes: {
          tiddler: {
            type: "string",
            value: this.props.tiddler,
          },
        },
      },
      {
        wiki: this.context?.parentWidget?.wiki ?? $tw.wiki,
        parentWidget: this.context?.parentWidget,
        document: this.context?.parentWidget?.document,
      }
    );
    this.context?.parentWidget?.children?.push(this.transcludeWidget);
    this.transcludeWidget.render(this.el!);
    console.log("constructing transcluded tiddler widget");
  }

  componentWillUnmount() {
    if (this.context?.parentWidget?.children) {
      this.context.parentWidget.children = this.context.parentWidget.children.filter(ch => ch !== this.transcludeWidget);
    }
    console.log("destructing transcluded tiddler widget");
  }

  render() {
    return <div ref={(el) => (this.el = el)} />;
  }
}
