import fs from 'fs';
import path from 'path';
import { URL } from 'url';

import { HttpError, getSn, sha256 } from '@hb-haier/utils';
import axios from 'axios';
import { Logger } from 'homebridge/lib/logger';

import type {
  DevDigitalModel,
  GetFamilyDevicesResponse,
  GetFamilyListResponse,
  HaierResponse,
  TokenInfo,
} from './types';
import type { AxiosInstance } from 'axios';
import type { API } from 'homebridge';
import type { io } from 'socket.io-client';

export * from './types';

const APP_ID = 'MB-UZHSH-0001';
const APP_KEY = '5dfca8714eb26e3a776e58a8273c8752';
// const APP_ID = 'MB-SHEZJAPPWXXCX-0000';
// const APP_KEY = '79ce99cc7f9804663939676031b8a427';
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

  logger = new Logger('HaierApi');

  socket!: ReturnType<typeof io>;

  // lastHeartbeatAt = Date.now();

  constructor(readonly config: HaierApiConfig, readonly api?: API) {
    this.getTokenInfo();

    this.axios = axios.create({
      baseURL: 'https://zj.haier.net',
      headers: {
        Accept: '*/*',
        appId: APP_ID,
        appKey: APP_KEY,
        appVersion: APP_VERSION,
        clientId: CLIENT_ID,
        language: 'zh-cn',
        timezone: '+8',
        'User-Agent': `Uplus/${APP_VERSION} (iPhone; iOS 17.0.2; Scale/2.00)`,
      },
    });
    this.axios.interceptors.request.use(async config => {
      if (config.url !== LOGIN_URL) {
        config.headers.accessToken = await this.getAccessToken();
      }
      const timestamp = Date.now();
      config.headers.timestamp = timestamp;
      config.headers.sequenceId = getSn(timestamp);
      const url = new URL(axios.getUri(config));
      const body = config.data ? JSON.stringify(config.data) : '';
      const signStr = `${url.pathname}${url.search}${body}${APP_ID}${APP_KEY}${timestamp}`;
      config.headers.sign = sha256(signStr);
      this.logger.debug('request:', url.toString(), JSON.stringify(config.data));
      return config;
    });
    this.axios.interceptors.response.use(
      res => {
        if (res.data.retCode !== '00000') {
          this.logger.error('response', res.data.retCode, res.data.retInfo);
          throw new HttpError(res);
        }
        return res;
      },
      err => {
        this.logger.error('response error', err);
      },
    );
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
    return this.axios
      .post<HaierResponse<GetFamilyListResponse>>('/api-gw/wisdomfamily/family/v4/family/list', {})
      .then(res => {
        const { createfamilies = [], joinfamilies = [] } = res.data.data;
        return [...createfamilies, ...joinfamilies];
      });
  }

  async getDevicesByFamilyId(familyId: string) {
    return this.axios
      .get<HaierResponse<GetFamilyDevicesResponse>>('/api-gw/wisdomdevice/applent/device/v2/family/devices', {
        params: { familyId },
      })
      .then(res => res.data.data.deviceinfos);
  }

  async getDevDigitalModel(deviceId: string) {
    return this.axios
      .post<{ detailInfo: string }>('https://uws.haier.net/shadow/v1/devdigitalmodels', {
        deviceInfoList: [{ deviceId }],
      })
      .then(res => {
        return JSON.parse(res.data.detailInfo[deviceId]) as DevDigitalModel;
      });
  }

  async sendCommands(deviceId: string, ...commands: Record<string, unknown>[]) {
    const sn = getSn();
    return this.axios.post(`https://uws.haier.net/stdudse/v1/sendbatchCmd/${deviceId}`, {
      sn,
      cmdMsgList: commands.map((cmdArgs, index) => ({
        deviceId,
        index,
        cmdArgs,
        subSn: `${sn}:${index}`,
      })),
    });
  }

  get tokenPath() {
    const storagePath = this.api?.user.storagePath() ?? path.dirname(__dirname);
    const tokenDir = path.resolve(storagePath, '.hb-haier/token');
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
    console.log('tokenDir', tokenDir);
    return path.resolve(tokenDir, `${this.config.username}.json`);
  }

  /**
   * 获取 websocket 地址，
   * 但是 token 的问题还没解决
   */
  async getWssUrl() {
    const accessToken = await this.getAccessToken();
    return this.axios
      .post<{
        agAddr: string;
      }>('https://uws.haier.net/gmsWS/wsag/assign', {
        token: accessToken,
        clientId: `iOS1702${Date.now()}`,
      })
      .then(res => {
        const url = new URL(res.data.agAddr);
        url.protocol = 'wss:';
        url.pathname = '/userag';
        url.searchParams.set('token', accessToken);
        url.searchParams.set('clientId', CLIENT_ID);
        return url.toString();
      });
  }

  public async connectWss() {
    this.getWssUrl().then(url => {
      console.log('// TODO', url);
    });
  }

  wsMessageSender(topic: string, content: Record<string, unknown>) {
    this.socket.send(
      JSON.stringify({
        topic,
        content,
        agClientId: this.tokenInfo?.uhomeAccessToken,
      }),
    );
    this.logger.info('ws send', topic, content);
  }

  private setTokenInfo() {
    fs.writeFileSync(this.tokenPath, JSON.stringify(this.tokenInfo));
  }

  private getTokenInfo() {
    if (fs.existsSync(this.tokenPath)) {
      const tokenInfo = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
      if (tokenInfo.expiresAt > Date.now()) {
        this.tokenInfo = tokenInfo;
      }
    }
  }

  private getAccessToken() {
    if (this.tokenInfo?.uhomeAccessToken && this.tokenInfo.expiresAt > Date.now()) {
      return Promise.resolve(this.tokenInfo.uhomeAccessToken);
    }
    return this.login().then(res => {
      const { tokenInfo } = res.data.data;
      tokenInfo.expiresAt = Number(res.config.headers.timestamp) + tokenInfo.expiresIn * 1000;
      this.tokenInfo = tokenInfo;
      this.setTokenInfo();
      return tokenInfo.uhomeAccessToken;
    });
  }
}
