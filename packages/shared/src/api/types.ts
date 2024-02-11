export interface HaierResponse<T> {
  retCode: string;
  retInfo: string;
  data: T;
}
export interface TokenInfo {
  accountToken: string;
  expiresIn: number;
  tokenType: string;
  refreshToken: string;
  uhomeAccessToken: string;
  uhomeUserId: string;
  uocUserId: string;

  // -
  expiresAt: number;
}

export interface FamilyInfo {
  // ...
  familyId: string;
  familyName: string;
  // ...
}

export interface GetFamilyListResponse {
  createfamilies: FamilyInfo[];
  joinfamilies: FamilyInfo[];
}

export interface DeviceInfo {
  baseInfo: DeviceBaseInfo;
  extendedInfo: DeviceExtendedInfo;
}

export interface DeviceBaseInfo {
  deviceId: string;
  deviceName: string;
  devName: string;
  bindTime: string;
  deviceType: string;
  familyId: string;
  ownerId: string;
  permission: {
    auth: {
      control: boolean;
      set: boolean;
      view: boolean;
    };
    authType: string;
  };
  wifiType: string | null;
  isOnline: boolean;
  ownerInfo: any;
  subDeviceIds: string | null;
  parentsDeviceId: string | null;
  deviceRole: null;
  deviceRoleType: string | null;
  deviceNetType: 'device' | 'nonNetDevice';
  deviceGroupId: string | null;
  deviceGroupType: string | null;
}

export interface DeviceExtendedInfo {
  brand: string;
  apptypeCode: string;
  apptypeName: string;
  apptypeIcon: string;
  barcode: string;
  room: string;
  roomId: string;
  devFloorId: string;
  devFloorOrderId: string;
  devFloorName: string;
  model: string;
  prodNo: string;
  bindType: string | null;
  categoryGrouping: string;
  imageAddr1: string;
  imageAddr2: string;
  accessType: string | null;
  configType: string;
  comunicationMode: string | null;
  detailsUrl: string | null;
  noKeepAlive: number;
  twoGroupingName: string;
  appletProxAuth: number;
}

export interface GetFamilyDevicesResponse {
  deviceinfos: DeviceInfo[];
}

export interface DevDigitalModel {
  alarms: [];
  attributes: DevDigitalModelProperty[];
}

export interface DevDigitalModelProperty {
  defaultValue: string;
  desc: string;
  invisible: boolean;
  name: string;
  operationType: string;
  readable: boolean;
  value: string;
  valueRange: {
    type: string;
    dataStep: { dataType: string; maxValue: string; minValue: string; step: string };
    dataList: { data: string; desc: string }[];
  };
  writable: boolean;
}
