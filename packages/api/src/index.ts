import { URL } from 'url';

import { HttpError, sha256 } from '@hb-haier/utils';
import axios from 'axios';
import { format } from 'date-fns';

import type { GetFamilyListResponse, HaierResponse, TokenInfo } from './types';
import type { AxiosInstance } from 'axios';

const APP_ID = 'MB-UZHSH-0001';
const APP_KEY = '5dfca8714eb26e3a776e58a8273c8752';
const APP_VERSION = '7.19.2';
// const APP_SECRET = 'E46602789309498CEEDAACB585B00F40';
const CLIENT_ID = 'CCD4B90C-E195-4A9B-9F71-15A92AA1DE87';
const LOGIN_URL = '/oauthserver/account/v1/login';

export interface HaierApiConfig {
  username: string;
  password: string;
}

export class HaierApi {
  axios!: AxiosInstance;

  tokenInfo?: TokenInfo;

  constructor(readonly config: HaierApiConfig) {
    this.axios = axios.create({
      baseURL: 'https://zj.haier.net',
      headers: {
        Accept: '*/*',
        appId: APP_ID,
        appKey: APP_KEY,
        appVersion: APP_VERSION,
        clientId: CLIENT_ID,
        'User-Agent': `Uplus/${APP_VERSION} (iPhone; iOS 17.0.2; Scale/2.00)`,
      },
    });
    this.axios.interceptors.request.use(async (config) => {
      if (config.url !== LOGIN_URL) {
        config.headers.accessToken = await this.getAccessToken();
      }
      const timestamp = Date.now();
      config.headers.timestamp = timestamp;
      config.headers.sequenceId = `${format(timestamp, 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 1000000)}`;
      const url = new URL(axios.getUri(config));
      const body = config.data ? JSON.stringify(config.data) : '';
      const signStr = `${url.pathname}${url.search}${body}${APP_ID}${APP_KEY}${timestamp}`;
      config.headers.sign = sha256(signStr);
      return config;
    });
    this.axios.interceptors.response.use((res) => {
      if (res.data.retCode !== '00000') {
        throw new HttpError(res);
      }
      return res;
    });
  }

  login() {
    const { username, password } = this.config;
    return this.axios.post<HaierResponse<{ tokenInfo: TokenInfo }>>(LOGIN_URL, {
      username,
      password,
      phoneType: 'iPhone16,2',
    });
  }

  async getFamilyList() {
    return this.axios.post<HaierResponse<GetFamilyListResponse>>('/api-gw/wisdomfamily/family/v4/family/list', {}).then((res) => {
      const { createfamilies = [], joinfamilies = [] } = res.data.data;
      return [...createfamilies, ...joinfamilies];
    });
  }

  async getDevicesByFamilyId(familyId: string) {
    return this.axios.get('/api-gw/wisdomdevice/applent/device/v2/family/devices', {
      params: { familyId },
    });
  }

  private getAccessToken() {
    if (this.tokenInfo?.uhomeAccessToken && this.tokenInfo.expiresAt > Date.now()) {
      return Promise.resolve(this.tokenInfo.uhomeAccessToken);
    }
    return this.login().then((res) => {
      const { tokenInfo } = res.data.data;
      tokenInfo.expiresAt = Number(res.config.headers.timestamp) + tokenInfo.expiresIn * 1000;
      this.tokenInfo = tokenInfo;
      return tokenInfo.uhomeAccessToken;
    });
  }
}
