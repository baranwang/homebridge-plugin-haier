import type { AxiosResponse } from 'axios';

export const PLATFORM_NAME = 'HaierHomebridgePlugin';

export const PLUGIN_NAME = 'homebridge-plugin-haier';

export class HttpError extends Error {
  name = 'HttpError';

  retInfo = '';

  constructor(resp: AxiosResponse<any>) {
    super();
    this.message = `${resp.config.url} - [${resp.data.retCode}]: ${JSON.stringify(resp.data.retInfo)}\n ${
      resp.config.data
    }`;
    this.retInfo = resp.data.retInfo;
  }
}
