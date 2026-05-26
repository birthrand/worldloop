import { Pressable, Text, View } from "react-native";

type FeedErrorBannerProps = {
  message: string | null;
  onRetry: () => void;
};

export function FeedErrorBanner({ message, onRetry }: FeedErrorBannerProps) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3">
      <Text className="min-w-0 flex-1 body-sm text-white/80" numberOfLines={2}>
        {message ?? "Could not load countries."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading countries"
        onPress={onRetry}
        className="rounded-full bg-tab-active px-4 py-2"
      >
        <Text className="font-semibold text-xs text-midnight-navy">Retry</Text>
      </Pressable>
    </View>
  );
}
