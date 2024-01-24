import { createContext, useContext } from 'react';
import { Config } from '../config';

export const ConfigContext = createContext<Config | undefined>(undefined);

export const useConfig = (): Config => {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error('Configuration context not initialized!');
  }
  return config;
};
