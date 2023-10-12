/* eslint-disable default-case */
/* eslint-disable no-bitwise */

import { inflate } from './inflate';

function byteArrayToString(byteArray) {
  let str = '';
  for (let i = 0; i < byteArray.length; ) {
    const value = byteArray[i++];
    switch (value >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7: {
        str += String.fromCharCode(value);
        break;
      }
      case 12:
      case 13: {
        const secondByte = byteArray[i++];
        str += String.fromCharCode(((value & 31) << 6) | (secondByte & 63));
        break;
      }
      case 14: {
        const secondByte = byteArray[i++];
        const thirdByte = byteArray[i++];
        str += String.fromCharCode(((value & 15) << 12) | ((secondByte & 63) << 6) | (thirdByte & 63));
        break;
      }
    }
  }
  return str;
}

function processArgs(encodedArgs) {
  const decodedArgs = Object(atob)(encodedArgs);
  const charCodes = decodedArgs.split('').map(e => e.charCodeAt(0));
  const uintArray = new Uint8Array(charCodes);

  return byteArrayToString(inflate(uintArray));
}

export function parseRespData(data: string) {
  try {
    const { dev, args } = JSON.parse(Object(atob)(data));
    return { dev, args: JSON.parse(processArgs(args)) };
  } catch (error) {
    return null;
  }
}
