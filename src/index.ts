import { PLATFORM_NAME } from '@shared';

import { HaierHomebridgePlatform } from './platform';

import type { API } from 'homebridge';

export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HaierHomebridgePlatform);
};
