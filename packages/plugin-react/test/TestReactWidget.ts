import { ReactChild, ReactNode } from "react";
import { ReactBaseWidget } from "../src/react-base-widget";
import { TestComponent } from "./TestComponent";

export class TestReactWidget extends ReactBaseWidget<Record<string, string>> {
  getComponent(): ReactChild | Iterable<ReactNode> {
    return TestComponent(this.attributes);
  }
}
