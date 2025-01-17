import type { AxiosResponse } from 'axios';
import path from 'node:path';
import { inspect } from 'node:util';


export const isNumber = (num: unknown): num is number => typeof num === 'number';

export const generateCacheDir = (dir: string) => path.resolve(dir, '.hb-haier')

export const safeJsonParse = <T = unknown>(text: string | undefined, defaultValue?: T) => {
  if (!text) {
    return defaultValue ?? null;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    return defaultValue ?? null;
  }
};

export const inspectToString = (data: unknown) => inspect(data, false, Number.POSITIVE_INFINITY, true);

export class HttpError extends Error {
  name = 'HttpError';

  retInfo = '';

  constructor(
    resp: AxiosResponse<{
      retCode: string;
      retInfo: string;
    }>,
  ) {
    super();
    this.message = `${resp.config.url} - [${resp.data.retCode}]: ${JSON.stringify(resp.data.retInfo)}\n ${
      resp.config.data
    }`;
    this.retInfo = resp.data.retInfo;
  }
}
