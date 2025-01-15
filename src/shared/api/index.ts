import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

import axios from 'axios';

import { HttpError, getSn, inspectToString, safeJsonParse, sha256 } from '../utils';

import type {
  DevDigitalModel,
  GetFamilyDevicesResponse,
  GetFamilyListResponse,
  HaierResponse,
  TokenInfo,
} from './types';
import type { AxiosInstance } from 'axios';
import type { API, Logger } from 'homebridge';

export * from './types';

const APP_CONFIG = {
  ID: 'MB-UZHSH-0001',
  KEY: '5dfca8714eb26e3a776e58a8273c8752',
  VERSION: '7.19.2',
};

const LOGIN_URL = '/oauthserver/account/v1/login';

export interface HaierApiConfig {
  username: string;
  password: string;
}

export class HaierApi {
  private axios!: AxiosInstance;
  private tokenInfo?: TokenInfo;

  constructor(
    private readonly config: HaierApiConfig,
    private readonly api?: API,
    private readonly log?: Logger,
  ) {
    this.initAxiosInstance();
    this.getTokenInfo();
  }

  private get storagePath(): string {
    const storagePath = path.resolve(this.api?.user.storagePath?.() ?? path.dirname(__dirname), '.hb-haier');
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    return storagePath;
  }

  private get tokenPath(): string {
    const tokenDir = path.resolve(this.storagePath, 'token');
    if (!fs.existsSync(tokenDir)) fs.mkdirSync(tokenDir, { recursive: true });
    return path.resolve(tokenDir, `${this.config.username}.json`);
  }

  private get clientId(): string {
    const cacheClientIdPath = path.resolve(this.storagePath, 'client-id');
    if (fs.existsSync(cacheClientIdPath)) return fs.readFileSync(cacheClientIdPath, 'utf-8');

    const clientId = randomUUID();
    fs.writeFileSync(cacheClientIdPath, clientId);
    this.tokenInfo = undefined;
    return clientId;
  }

  private get logger() {
    return this.log ?? console;
  }

  private initAxiosInstance(): void {
    this.axios = axios.create({
      baseURL: 'https://zj.haier.net',
      headers: {
        appId: APP_CONFIG.ID,
        appKey: APP_CONFIG.KEY,
        appVersion: APP_CONFIG.VERSION,
        clientId: this.clientId,
        language: 'zh-cn',
        timezone: '8',
        'User-Agent': `Uplus/${APP_CONFIG.VERSION} (iPhone; iOS 17.0.2; Scale/2.00)`,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(async (config) => {
      if (config.url !== LOGIN_URL) config.headers.accessToken = await this.getAccessToken();

      const timestamp = Date.now();
      config.headers.timestamp = timestamp;
      config.headers.sequenceId = getSn(timestamp);

      const url = new URL(axios.getUri(config));
      const body = config.data ? JSON.stringify(config.data) : '';
      const signStr = `${url.pathname}${url.search}${body}${APP_CONFIG.ID}${APP_CONFIG.KEY}${timestamp}`;
      config.headers.sign = sha256(signStr);

      this.logger.debug('Request:', url.toString(), config.data ? inspectToString(config.data) : undefined);
      return config;
    });

    this.axios.interceptors.response.use(
      (res) => {
        if (res.data.retCode !== '00000') {
          this.logger.error('Response:', res.data.retCode, res.data.retInfo);
          throw new HttpError(res);
        }
        return res;
      },
      (err) => {
        this.logger.error('Response error:', err);
        return Promise.reject(err);
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
    const res = await this.axios.post<HaierResponse<GetFamilyListResponse>>(
      '/api-gw/wisdomfamily/family/v4/family/list',
      {},
    );
    const { createfamilies = [], joinfamilies = [] } = res.data.data;
    return [...createfamilies, ...joinfamilies];
  }

  async getDevicesByFamilyId(familyId: string) {
    const res = await this.axios.get<HaierResponse<GetFamilyDevicesResponse>>(
      '/api-gw/wisdomdevice/applent/device/v2/family/devices',
      {
        params: { familyId },
      },
    );
    return res.data.data.deviceinfos;
  }

  async getDevDigitalModel(deviceId: string) {
    const res = await this.axios.post<{ detailInfo: Record<string, string> }>(
      'https://uws.haier.net/shadow/v1/devdigitalmodels',
      {
        deviceInfoList: [{ deviceId }],
      },
    );
    return safeJsonParse<DevDigitalModel>(res.data.detailInfo[deviceId]);
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

  private setTokenInfo(): void {
    fs.writeFileSync(this.tokenPath, JSON.stringify(this.tokenInfo));
  }

  private getTokenInfo(): void {
    if (fs.existsSync(this.tokenPath)) {
      const tokenInfo = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
      if (tokenInfo.expiresAt > Date.now()) this.tokenInfo = tokenInfo;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenInfo?.uhomeAccessToken && this.tokenInfo.expiresAt > Date.now()) {
      return this.tokenInfo.uhomeAccessToken;
    }

    const res = await this.login();
    const { tokenInfo } = res.data.data;
    tokenInfo.expiresAt = Number(res.config.headers.timestamp) + tokenInfo.expiresIn * 1000;
    this.tokenInfo = tokenInfo;
    this.setTokenInfo();
    return tokenInfo.uhomeAccessToken;
  }
}
