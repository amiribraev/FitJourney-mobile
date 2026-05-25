import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'web') {
          window.open(href, '_blank');
        } else {
          WebBrowser.openBrowserAsync(href);
        }
      }}
    >
      <Text>{children}</Text>
    </Pressable>
  );
}