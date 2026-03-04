import { createContext, useContext } from 'react';
import type { CountryKey } from '../types/country';

export type ViewMode = 'hero' | 'main';

export interface AppStateContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedCountry: CountryKey | null;
  selectCountry: (key: CountryKey | null) => void;
}

export const AppStateContext = createContext<AppStateContextType>({
  viewMode: 'hero',
  setViewMode: () => {},
  selectedCountry: null,
  selectCountry: () => {},
});

export const useAppState = () => useContext(AppStateContext);
