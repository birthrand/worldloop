import { router, useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";
import { useNavigationState } from "@react-navigation/native";
import { useCallback } from "react";

/**
 * True when this screen was pushed onto a stack or opened from another navigator
 * (e.g. profile tab root reached via router.push, not tab switch).
 */
export function useHeaderBackButton() {
  const navigation = useNavigation();
  const stackIndex = useNavigationState((state) => state.index) ?? 0;

  const parentCanGoBack = navigation.getParent()?.canGoBack() ?? false;
  const visible = stackIndex > 0 || parentCanGoBack;

  const onBackPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  }, [navigation]);

  return { visible, onBackPress };
}
