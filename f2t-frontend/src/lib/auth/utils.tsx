import { getItem, removeItem, setItem } from '@/lib/storage';
import type { Farm, User } from '@/types';

const TOKEN = 'token';
const USER_DATA = 'userData';
const FARM_DATA = 'farmData';

export type TokenType = {
  access: string;
  refresh: string;
};

export type AuthUserData = User & {
  permissions?: string[];
  lastLoginAt?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  farmId?: string; // If user is a farm owner, this links to their farm
};

export type AuthFarmData = Farm;

export const getToken = () => getItem<TokenType>(TOKEN);
export const removeToken = () => removeItem(TOKEN);
export const setToken = (value: TokenType) => setItem<TokenType>(TOKEN, value);

export const getUserData = () => getItem<AuthUserData>(USER_DATA);
export const removeUserData = () => removeItem(USER_DATA);
export const setUserData = (value: AuthUserData) =>
  setItem<AuthUserData>(USER_DATA, value);

export const getFarmData = () => getItem<AuthFarmData>(FARM_DATA);
export const removeFarmData = () => removeItem(FARM_DATA);
export const setFarmData = (value: AuthFarmData) =>
  setItem<AuthFarmData>(FARM_DATA, value);
