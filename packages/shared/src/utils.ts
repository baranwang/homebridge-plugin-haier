import { createHash } from 'crypto';

import { format } from 'date-fns';

import type { AxiosResponse } from 'axios';
import type { BinaryToTextEncoding } from 'crypto';

export class HttpError extends Error {
  name = 'HttpError';

  constructor(resp: AxiosResponse<any>) {
    super();
    this.message = `${resp.config.url} - [${resp.data.retCode}]: ${JSON.stringify(resp.data.retInfo)}\n ${
      resp.config.data
    }`;
  }
}

function isObject(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function hashFactory(algorithm: string, encoding: BinaryToTextEncoding = 'hex') {
  return (data: any) => {
    const hash = createHash(algorithm);

    if (isObject(data)) {
      data = JSON.stringify(data);
    }

    return hash.update(data).digest(encoding);
  };
}

export const sha256 = hashFactory('sha256');

export const getSn = (timestamp = Date.now()) =>
  `${format(timestamp, 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 1000000)}`;
