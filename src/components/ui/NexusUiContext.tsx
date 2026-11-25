import React, { createContext, useContext } from 'react';
import type { AnimationLevel, TableThemeId } from '../../types/app';

export interface NexusUiThemeContextValue {
  readonly animationLevel: AnimationLevel;
  readonly glowEnabled: boolean;
  readonly tableTheme: TableThemeId;
}

const DEFAULT_UI_CONTEXT: NexusUiThemeContextValue = {
  animationLevel: 'FULL',
  glowEnabled: true,
  tableTheme: 'VOID_STELLAR',
};

const NexusUiContext = createContext<NexusUiThemeContextValue>(DEFAULT_UI_CONTEXT);

export interface NexusUiProviderProps {
  readonly value: NexusUiThemeContextValue;
  readonly children: React.ReactNode;
}

export function NexusUiProvider({
  value,
  children,
}: NexusUiProviderProps): React.ReactElement {
  return <NexusUiContext.Provider value={value}>{children}</NexusUiContext.Provider>;
}

export function useNexusUi(): NexusUiThemeContextValue {
  return useContext(NexusUiContext);
}
