import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { EXPLORE_SWIPE_TAB_BAR_BG } from "@/constants/explore-swipe-layout";
import { SPACE_SCREEN_BASE } from "@/constants/space-theme";

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

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
            backgroundColor: EXPLORE_SWIPE_TAB_BAR_BG,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ title: "Explore" }} />
        <Tabs.Screen
          name="culture"
          options={{ href: null, title: "Culture" }}
        />
        <Tabs.Screen
          name="map"
          options={{
            href: null,
            title: "Map",
            tabBarStyle: { display: "none" },
          }}
        />
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
