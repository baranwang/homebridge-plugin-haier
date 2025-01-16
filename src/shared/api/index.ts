import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { Logger } from 'homebridge';
import { randomUUID } from 'node:crypto';
import EventEmitter from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { type MessageEvent, WebSocket } from 'ws';
import { HttpError, getSn, inspectToString, safeJsonParse, sha256 } from '../utils';
import type {
  DevDigitalModel,
  GetFamilyDevicesResponse,
  GetFamilyListResponse,
  HaierResponse,
  TokenInfo,
} from './types';

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

interface HaierApiEvents {
  devDigitalModelUpdate: [deviceId: string, devDigitalModel: DevDigitalModel];
}

interface WsMessage {
  topic: string;
  content: Record<string, unknown>;
}

interface WebSocketState {
  isConnecting: boolean;
  heartbeatInterval?: NodeJS.Timeout;
}

export class HaierApi extends EventEmitter<HaierApiEvents> {
  private axios!: AxiosInstance;
  private tokenInfo?: TokenInfo;

  private digitalModelCache = new Map<string, DevDigitalModel>();

  private wsState: WebSocketState = {
    isConnecting: false,
  };

  constructor(
    private readonly config: HaierApiConfig,
    private readonly storagePath?: string,
    private readonly log?: Logger,
  ) {
    super();
    this.initAxiosInstance();
    this.getTokenInfo();
  }

  private _ws!: WebSocket;

  private get ws() {
    return this._ws;
  }

  private set ws(ws: WebSocket) {
    this._ws = ws;
    this.setupWebSocketListeners(ws);
  }

  private get apiStoragePath(): string {
    const apiStoragePath = path.resolve(this.storagePath || path.dirname(__dirname), '.hb-haier');
    if (!fs.existsSync(apiStoragePath)) {
      fs.mkdirSync(apiStoragePath, { recursive: true });
    }
    return apiStoragePath;
  }

  private get tokenPath(): string {
    const tokenDir = path.resolve(this.apiStoragePath, 'token');
    if (!fs.existsSync(tokenDir)) fs.mkdirSync(tokenDir, { recursive: true });
    return path.resolve(tokenDir, `${this.config.username}.json`);
  }

  private get clientId(): string {
    const cacheClientIdPath = path.resolve(this.apiStoragePath, 'client-id');
    if (fs.existsSync(cacheClientIdPath)) return fs.readFileSync(cacheClientIdPath, 'utf-8');

    const clientId = randomUUID();
    fs.writeFileSync(cacheClientIdPath, clientId);
    this.tokenInfo = undefined;
    return clientId;
  }

  private get logger() {
    return new Proxy(this.log ?? {}, {
      get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver) ?? Reflect.get(console, prop, receiver);
      },
    }) as Logger | Console;
  }

  private initAxiosInstance() {
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

    this.axios.interceptors.request.use(async (config) => {
      if (config.url !== LOGIN_URL) {
        config.headers.accessToken = await this.getAccessToken();
      }

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
    if (!username || !password) {
      throw new Error('用户名或密码为空');
    }
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
    if (this.digitalModelCache.has(deviceId)) {
      return this.digitalModelCache.get(deviceId) ?? null;
    }
    const res = await this.axios.post<{ detailInfo: Record<string, string> }>(
      'https://uws.haier.net/shadow/v1/devdigitalmodels',
      {
        deviceInfoList: [{ deviceId }],
      },
    );
    const resp = safeJsonParse<DevDigitalModel>(res.data.detailInfo[deviceId]);
    if (resp) {
      this.setDevDigitalModel(deviceId, resp);
    }
    return resp;
  }

  sendCommands(deviceId: string, ...commands: Record<string, string>[]) {
    const sn = getSn();
    const digitalModel = this.digitalModelCache.get(deviceId);
    const data: {
      sn: string;
      deviceId: string;
      index: number;
      delaySeconds: number;
      cmdArgs: Record<string, string>;
      subSn: string;
    }[] = [];
    commands.forEach((cmdArgs, index) => {
      data.push({
        sn,
        deviceId,
        index,
        delaySeconds: 0,
        cmdArgs,
        subSn: `${sn}:${index}`,
      });
      if (digitalModel) {
        Object.entries(cmdArgs).forEach(([key, value]) => {
          const property = digitalModel.attributes.find((item) => item.name === key);
          if (property && 'value' in property && property.value !== value) {
            property.value = value;
          }
        });
        this.setDevDigitalModel(deviceId, digitalModel);
      }
    });
    if (this.ws.readyState === WebSocket.OPEN) {
      this.sendWssMessage('BatchCmdReq', {
        sn,
        trace: getSn(),
        data,
      });
    } else {
      this.axios.post(`https://uws.haier.net/stdudse/v1/sendbatchCmd/${deviceId}`, {
        sn,
        cmdMsgList: data,
      });
    }
  }

  async contactWss() {
    const url = await this.getWssUrl();
    if (!url) {
      return;
    }

    this.cleanupWebSocket();
    this.ws = new WebSocket(url);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket 连接超时'));
      }, 10000);

      this.ws.once('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.ws.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async getWssUrl() {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return '';
    }
    const resp = await this.axios.post<{
      agAddr: string;
      id: string;
      name: string;
    }>('https://uws.haier.net/gmsWS/wsag/assign', {});
    const url = new URL(resp.data.agAddr);
    url.protocol = 'wss:';
    url.pathname = '/userag';
    url.searchParams.set('token', accessToken);
    url.searchParams.set('agClientId', this.clientId);
    return url.toString();
  }

  private setDevDigitalModel(deviceId: string, devDigitalModel: DevDigitalModel) {
    this.digitalModelCache.set(deviceId, devDigitalModel);
    this.emit('devDigitalModelUpdate', deviceId, devDigitalModel);
  }

  private setupWebSocketListeners(ws: WebSocket) {
    ws.addEventListener('open', this.startHeartbeat.bind(this));
    ws.addEventListener('message', this.handleWsMessage.bind(this));
    ws.addEventListener('error', (event) => this.logger.error('WebSocket error:', event));
    ws.addEventListener('close', (event) => {
      this.logger.error('WebSocket closed:', event);
      this.reconnectWebSocket();
    });
  }

  private startHeartbeat() {
    if (this.wsState.heartbeatInterval) {
      clearInterval(this.wsState.heartbeatInterval);
    }
    this.wsState.heartbeatInterval = setInterval(() => {
      try {
        this.sendWssMessage('HeartBeat', { sn: getSn(), duration: 0 });
      } catch (error) {
        this.logger.error('心跳消息发送失败:', error);
        this.reconnectWebSocket();
      }
    }, 60 * 1000);
  }

  private handleWsMessage(event: MessageEvent) {
    const resp = safeJsonParse<WsMessage>(event.data.toString());
    if (!resp) {
      this.logger.debug('WebSocket message:', event.data.toString());
      return;
    }
    this.logger.debug('⬇️', `[${resp.topic}]`);

    switch (resp?.topic) {
      case 'HeartBeatAck':
        this.logger.debug('💓', resp.content.sn);
        break;
      case 'GenMsgDown':
        this.handleGenMsgDown(resp.content);
        break;
      default:
        this.logger.debug('Unhandled WebSocket message:', resp);
    }
  }

  private handleGenMsgDown(content: Record<string, unknown>): void {
    if (content.businType === 'DigitalModel' && typeof content.data === 'string') {
      this.processDigitalModel(content.data);
    } else {
      this.logger.debug('GenMsgDown', content);
    }
  }

  private processDigitalModel(data: string) {
    const { dev: deviceId, args } =
      (safeJsonParse(Buffer.from(data, 'base64').toString('utf-8')) as { args: string; dev: string }) ?? {};
    const respStr = gunzipSync(Buffer.from(args, 'base64')).toString('utf-8');
    const resp = safeJsonParse<DevDigitalModel>(respStr);
    this.logger.debug('DigitalModel', deviceId);
    if (resp) {
      this.setDevDigitalModel(deviceId, resp);
    }
  }

  sendWssMessage(topic: string, content: Record<string, unknown>) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn('WebSocket is not open');
      return;
    }
    this.logger.debug('⬆️', `[${topic}]`, inspectToString(content));
    this.ws.send(
      JSON.stringify({
        agClientId: this.clientId,
        topic,
        content,
      }),
    );
  }

  private subscribedDevices: string[] = [];

  subscribeDevices(deviceIds: string[]) {
    this.subscribedDevices = deviceIds;
    this.sendWssMessage('BoundDevs', {
      devs: deviceIds,
    });
  }

  private async reconnectWebSocket() {
    if (this.wsState.isConnecting) {
      return;
    }

    this.wsState.isConnecting = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      this.logger.info('正在重新连接 WebSocket...');

      await this.contactWss();

      if (this.subscribedDevices.length > 0) {
        this.logger.info('重新订阅设备:', this.subscribedDevices);
        this.subscribeDevices(this.subscribedDevices);
      }
    } catch (error) {
      this.logger.error('WebSocket 重连失败:', error);
      this.reconnectWebSocket();
    } finally {
      this.wsState.isConnecting = false;
    }
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
    try {
      const res = await this.login();
      const { tokenInfo } = res.data.data;
      tokenInfo.expiresAt = Number(res.config.headers.timestamp) + tokenInfo.expiresIn * 1000;
      this.tokenInfo = tokenInfo;
      this.setTokenInfo();
      return tokenInfo.uhomeAccessToken;
    } catch (error) {
      this.logger.error('获取 Token 失败', error);
      return '';
    }
  }

  private cleanupWebSocket() {
    if (this.wsState.heartbeatInterval) {
      clearInterval(this.wsState.heartbeatInterval);
    }

    if (this._ws) {
      try {
        this._ws.close();
      } catch (error) {
        this.logger.error('WebSocket 关闭失败:', error);
      }
    }
  }
}
