import { createHash } from 'node:crypto';
import type { BinaryLike, BinaryToTextEncoding } from 'node:crypto';
import { inspect } from 'node:util';
import { format } from 'date-fns';
import type { AxiosResponse } from 'axios';

export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  Object.prototype.toString.call(obj) === '[object Object]';

export const isNumber = (num: unknown): num is number => typeof num === 'number';

export const isString = (str: unknown): str is string => typeof str === 'string';

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
