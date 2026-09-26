// Just enough of React Native's types for the examples to typecheck without
// installing React Native itself. Apps use the real 'react-native' types.
declare module 'react-native' {
  import type { ComponentType, ReactNode } from 'react';

  export interface GestureResponderEvent {
    nativeEvent: { locationX: number; locationY: number };
  }
  export const View: ComponentType<{ style?: object; children?: ReactNode }>;
  export const Text: ComponentType<{
    style?: object;
    children?: ReactNode;
    accessibilityRole?: 'header' | 'text' | 'alert';
  }>;
  export const Pressable: ComponentType<{
    onPress?: (event: GestureResponderEvent) => void;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    children?: ReactNode;
  }>;
  export const Image: ComponentType<{
    source: { uri: string };
    style?: object;
    accessibilityLabel?: string;
  }>;
  export const Button: ComponentType<{ title: string; onPress: () => void }>;
}
