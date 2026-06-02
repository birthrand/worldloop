import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function HomeStatsRow() {
  const streakDays = useDiscoveryProgressStore((s) => s.streakDays);
  const weekProgress = useDiscoveryProgressStore((s) => s.weekProgress);
  const worldProgressPercent = useDiscoveryProgressStore(
    (s) => s.worldProgressPercent,
  );
  const countriesExplored = useDiscoveryProgressStore(
    (s) => s.countriesExplored,
  );
  const quizzesCompleted = useDiscoveryProgressStore((s) => s.quizzesCompleted);

  return (
    <View className="flex-row gap-3 rounded-3xl bg-white/6 p-4">
      <View className="min-w-0 flex-1 gap-3">
        <Text className="font-semibold text-sm text-tab-active">
          🔥 Your Learning Streak
        </Text>
        <View className="gap-1">
          <Text className="font-bold text-2xl text-white">
            {streakDays} days
          </Text>
          <Text className="body-sm text-white/50">Keep it going!</Text>
        </View>
        <View className="flex-row justify-between gap-1">
          {DAY_LABELS.map((label, index) => {
            const done = weekProgress[index];
            return (
              <View key={`${label}-${index}`} className="items-center gap-1">
                <Text className="text-[10px] text-white/45">{label}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    done ? styles.dayCircleDone : styles.dayCircleEmpty,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={12} color="#0b132b" />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View className="w-px bg-white/10" />

      <View className="items-center gap-2 px-1">
        <Text className="font-semibold text-xs text-tab-active">
          Your Progress
        </Text>
        <WorldProgressRing percent={worldProgressPercent} />
        <Text className="text-center text-[10px] leading-tight text-white/50">
          {worldProgressPercent}%{"\n"}of the world explored
        </Text>
      </View>

      <View className="w-px bg-white/10" />

      <View className="justify-center gap-2">
        <MiniStatCard
          icon="globe-outline"
          value={String(countriesExplored)}
          label="Countries Explored"
        />
        {quizzesCompleted > 0 ? (
          <MiniStatCard
            icon="help-circle-outline"
            value={String(quizzesCompleted)}
            label="Quizzes Completed"
          />
        ) : null}
      </View>
    </View>
  );
}

function MiniStatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-white/6 px-2 py-2">
      <Ionicons name={icon} size={18} color="#fbbf24" />
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-sm text-white">{value}</Text>
        <Text className="text-[9px] leading-tight text-white/55">{label}</Text>
      </View>
    </View>
  );
}

function WorldProgressRing({ percent }: { percent: number }) {
  const size = 72;
  const stroke = 6;
  const clamped = Math.min(100, Math.max(0, percent));
  const rotation = (clamped / 100) * 360 - 90;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: "rgba(255, 255, 255, 0.12)",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: "transparent",
          borderTopColor: "#fbbf24",
          borderRightColor: clamped > 25 ? "#fbbf24" : "transparent",
          borderBottomColor: clamped > 50 ? "#fbbf24" : "transparent",
          borderLeftColor: clamped > 75 ? "#fbbf24" : "transparent",
          transform: [{ rotate: `${rotation}deg` }],
        }}
      />
      <Text className="font-bold text-base text-white">{clamped}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleDone: {
    backgroundColor: "#fbbf24",
  },
  dayCircleEmpty: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "transparent",
  },
});
