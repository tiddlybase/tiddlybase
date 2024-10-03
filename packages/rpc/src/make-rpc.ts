import { MiniIframeRPC } from 'mini-iframe-rpc';

export const makeRPC = () =>
  new MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 10 * 1000, // 10 seconds
      retryLimit: 0,
    },
  });
