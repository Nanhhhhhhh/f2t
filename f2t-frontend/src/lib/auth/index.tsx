import { create } from 'zustand';

import { createSelectors } from '../utils';
import type { AuthFarmData, AuthUserData, TokenType } from './utils';
import {
  getFarmData,
  getToken,
  getUserData,
  removeFarmData,
  removeToken,
  removeUserData,
  setFarmData,
  setToken,
  setUserData,
} from './utils';

interface AuthState {
  token: TokenType | null;
  user: AuthUserData | null;
  farm: AuthFarmData | null;
  status: 'idle' | 'signOut' | 'signIn';
  signIn: (data: {
    token: TokenType;
    user: AuthUserData;
    farm?: AuthFarmData;
  }) => void;
  signInBypass: (userType?: 'consumer' | 'farm') => void;
  signOut: () => void;
  updateUser: (userData: Partial<AuthUserData>) => void;
  updateFarm: (farmData: Partial<AuthFarmData>) => void;
  hydrate: () => void;
  isConsumer: () => boolean;
  isFarm: () => boolean;
  hasPermission: (permission: string) => boolean;
  hasFarmData: () => boolean;
  getFarmInfo: () => AuthFarmData | null;
}

// Helper functions for auth store
const handleSignInBypass = (
  userType: 'consumer' | 'farm',
  set: (
    partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)
  ) => void
) => {
  const {
    getMockConsumerUser,
    getMockFarmUser,
    getMockFarmData,
    getMockToken,
  } = require('../dev-utils');

  const mockToken = getMockToken();
  const mockUser =
    userType === 'farm' ? getMockFarmUser() : getMockConsumerUser();
  const mockFarm = userType === 'farm' ? getMockFarmData() : null;

  setToken(mockToken);
  setUserData(mockUser);
  if (mockFarm) {
    setFarmData(mockFarm);
  }
  set({ status: 'signIn', token: mockToken, user: mockUser, farm: mockFarm });
};

const _useAuth = create<AuthState>((set, get) => ({
  status: 'idle',
  token: null,
  user: null,
  farm: null,
  signIn: ({ token, user, farm }) => {
    setToken(token);
    setUserData(user);
    if (farm) {
      setFarmData(farm);
    }
    set({ status: 'signIn', token, user, farm: farm || null });
  },
  signInBypass: (userType = 'consumer') => {
    handleSignInBypass(userType, set);
  },
  signOut: () => {
    removeToken();
    removeUserData();
    removeFarmData();
    set({ status: 'signOut', token: null, user: null, farm: null });
  },
  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      setUserData(updatedUser);
      set({ user: updatedUser });
    }
  },
  updateFarm: (farmData) => {
    const currentFarm = get().farm;
    if (currentFarm) {
      const updatedFarm = { ...currentFarm, ...farmData };
      setFarmData(updatedFarm);
      set({ farm: updatedFarm });
    }
  },
  hydrate: () => {
    try {
      const userToken = getToken();
      const userData = getUserData();
      const farmData = getFarmData();

      if (userToken !== null && userData !== null) {
        set({
          status: 'signIn',
          token: userToken,
          user: userData,
          farm: farmData || null,
        });
      } else {
        get().signOut();
      }
    } catch (e) {
      get().signOut();
    }
  },
  isConsumer: () => {
    const user = get().user;
    return user?.role === 'consumer';
  },
  isFarm: () => {
    const user = get().user;
    return user?.role === 'farm';
  },
  hasPermission: (permission: string) => {
    const user = get().user;
    return user?.permissions?.includes(permission) ?? false;
  },
  hasFarmData: () => {
    const { user, farm } = get();
    return user?.role === 'farm' && farm !== null;
  },
  getFarmInfo: () => {
    const { user, farm } = get();
    return user?.role === 'farm' ? farm : null;
  },
}));

export const useAuth = createSelectors(_useAuth);

export const signOut = () => _useAuth.getState().signOut();
export const signIn = (data: {
  token: TokenType;
  user: AuthUserData;
  farm?: AuthFarmData;
}) => _useAuth.getState().signIn(data);
export const signInBypass = (userType?: 'consumer' | 'farm') =>
  _useAuth.getState().signInBypass(userType);
export const updateUser = (userData: Partial<AuthUserData>) =>
  _useAuth.getState().updateUser(userData);
export const updateFarm = (farmData: Partial<AuthFarmData>) =>
  _useAuth.getState().updateFarm(farmData);
export const hydrateAuth = () => _useAuth.getState().hydrate();

// Helper functions for role checking
export const isAuthenticated = () => _useAuth.getState().token !== null;
export const isConsumer = () => _useAuth.getState().isConsumer();
export const isFarm = () => _useAuth.getState().isFarm();
export const hasPermission = (permission: string) =>
  _useAuth.getState().hasPermission(permission);
export const hasFarmData = () => _useAuth.getState().hasFarmData();
export const getCurrentUser = () => _useAuth.getState().user;
export const getCurrentFarm = () => _useAuth.getState().farm;
export const getFarmInfo = () => _useAuth.getState().getFarmInfo();
