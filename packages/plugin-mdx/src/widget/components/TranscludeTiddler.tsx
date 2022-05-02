import type { Widget, WidgetConstructor } from "packages/tw5-types/src";
import React from "react";
import { TW5WidgetParentContext } from "./TW5WidgetParentContext";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transclude } = require("$:/core/modules/widgets/transclude.js");

const TranscludeClass: WidgetConstructor = transclude;

export interface TranscludeTiddlerParams {
  tiddler: string;
}

// based on: https://reactjs.org/docs/integrating-with-other-libraries.html#how-to-approach-the-problem
export class TranscludeTiddler extends React.Component<TranscludeTiddlerParams> {
  constructor(props: TranscludeTiddlerParams) {
    super(props);
  }

  el: HTMLDivElement | null = null;
  transcludeWidget: Widget | null = null;

  static contextType = TW5WidgetParentContext;
  declare context: React.ContextType<typeof TW5WidgetParentContext>;

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
        wiki: this.context!.wiki,
        parentWidget: this.context!,
        document: this.context!.document,
      }
    );
    this.transcludeWidget.render(this.el!);
    //this.$el.somePlugin();
    console.log("constructing transcluded tiddler widget");
  }

  componentWillUnmount() {
    console.log("destructing transcluded tiddler widget");
  }

  render() {
    return <div ref={(el) => (this.el = el)} />;
  }
}
