import { createHash } from 'node:crypto';
import type { BinaryLike, BinaryToTextEncoding } from 'node:crypto';
import { inspect } from 'node:util';
import { format } from 'date-fns';
import type { AxiosResponse } from 'axios';

const isObject = (obj: unknown): obj is Record<string, unknown> =>
  Object.prototype.toString.call(obj) === '[object Object]';

const hashFactory =
  (algorithm: string, encoding: BinaryToTextEncoding = 'hex') =>
  (data: unknown) => {
    let dataStr = data as BinaryLike;
    const hash = createHash(algorithm);

    if (isObject(dataStr)) {
      dataStr = JSON.stringify(dataStr);
    }

    return hash.update(dataStr).digest(encoding);
  };

export const sha256 = hashFactory('sha256');

export const getSn = (timestamp = Date.now()) =>
  `${format(timestamp, 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 1000000)}`;

export const inspectAndStringifyData = (data: unknown): string => inspect(data, true, Number.POSITIVE_INFINITY);

export const safeJsonParse = <T = unknown>(...args: Parameters<typeof JSON.parse>) => {
  try {
    return JSON.parse(...args) as T;
  } catch (error) {
    return null;
  }
};

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
