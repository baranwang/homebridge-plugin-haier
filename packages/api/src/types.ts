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

  //-
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
