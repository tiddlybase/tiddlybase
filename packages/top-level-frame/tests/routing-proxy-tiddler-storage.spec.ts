import {RoutingProxyTiddlerStorage} from "../src/tiddler-storage/routing-proxy-tiddler-storage"

describe("RoutingProxyTiddlerStorage", function () {
  it("test provenance", async () => {
    const routingProxy = new RoutingProxyTiddlerStorage()
    expect(1).toEqual(1);
  });
});
