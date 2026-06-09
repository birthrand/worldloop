import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { SPACE_SCREEN_BASE, SPACE_TAB_BAR_BG } from "@/constants/space-theme";

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        initialRouteName="explore"
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: SPACE_TAB_BAR_BG,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ title: "Explore" }} />
        <Tabs.Screen name="culture" options={{ title: "Culture" }} />
        <Tabs.Screen name="map" options={{ title: "Map" }} />
        <Tabs.Screen name="saved" options={{ title: "Saved" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      <SearchOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPACE_SCREEN_BASE,
  },
});
