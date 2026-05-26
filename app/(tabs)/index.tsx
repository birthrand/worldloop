import { ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="grow px-6 py-8 pb-28"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-2">
        <Text className="h2">Home</Text>
        <Text className="body-md">Coming in a later lesson</Text>
      </View>
    </ScrollView>
  );
}
