import { createHash } from 'crypto';
import { inspect } from 'util';

import { format } from 'date-fns';

import type { BinaryToTextEncoding } from 'crypto';

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

/**
 * 输出完整的Logger日志
 * @param {unknown} data 序列化的数据
 * @returns {string}
 */
export function inspectAndStringifyData(data: unknown): string {
  return inspect(data, true, Infinity);
}
