import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type DidYouKnowCardProps = {
  body: string;
};

export function DidYouKnowCard({ body }: DidYouKnowCardProps) {
  return (
    <View className="flex-row gap-3 rounded-2xl bg-black/55 px-4 py-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-tab-active/20">
        <Ionicons name="bulb" size={22} color="#fbbf24" />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-sm text-tab-active">
          Did You Know?
        </Text>
        <Text className="text-sm leading-5 text-white">{body}</Text>
      </View>
    </View>
  );
}
