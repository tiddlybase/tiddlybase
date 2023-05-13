import { MiniIframeRPC } from 'mini-iframe-rpc';

export const makeRPC = () =>
  new MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 0,
      retryLimit: 0,
    },
  });
