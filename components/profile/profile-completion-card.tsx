import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  PROFILE_CARD_BG,
  PROFILE_COMPLETION_ACCENT,
  PROFILE_COMPLETION_ACCENT_BG,
  PROFILE_COMPLETION_DONE,
  PROFILE_COMPLETION_DONE_ON,
  PROFILE_COMPLETION_DONE_SOFT_BG,
  PROFILE_COMPLETION_DONE_SOFT_BORDER,
  PROFILE_ICON_RING,
  PROFILE_NAV_SUBTITLE,
  PROFILE_TEXT_SUBTITLE,
} from "@/constants/profile-theme";

type CompletionItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
};

function showComingSoon(label: string) {
  Alert.alert(label, "This feature is coming in a later lesson.");
}

function buildCompletionItems(
  user: ReturnType<typeof useUser>["user"],
): CompletionItem[] {
  return [
    {
      id: "name",
      label: "Full name",
      icon: "person-outline",
      done: Boolean(user?.fullName ?? user?.firstName),
    },
    {
      id: "email",
      label: "Email address",
      icon: "mail-outline",
      done: Boolean(user?.primaryEmailAddress?.emailAddress),
    },
    {
      id: "bio",
      label: "Bio",
      icon: "create-outline",
      done: Boolean(
        typeof user?.unsafeMetadata?.bio === "string" &&
        user.unsafeMetadata.bio,
      ),
    },
    {
      id: "location",
      label: "Location",
      icon: "location-outline",
      done: Boolean(
        typeof user?.unsafeMetadata?.location === "string" &&
        user.unsafeMetadata.location,
      ),
    },
  ];
}

function getCompletionPercent(items: CompletionItem[]) {
  const done = items.filter((item) => item.done).length;
  return Math.round((done / items.length) * 100);
}

export function ProfileCompletionCard() {
  const { user } = useUser();
  const [expanded, setExpanded] = useState(false);
  const items = buildCompletionItems(user);
  const percent = getCompletionPercent(items);
  const remaining = items.filter((item) => !item.done);
  const isComplete = percent === 100;

  const toggleExpanded = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  };

  if (isComplete) {
    return (
      <View style={styles.completeCard}>
        <View style={styles.completeIconWrap}>
          <Ionicons
            name="checkmark"
            size={20}
            color={PROFILE_COMPLETION_DONE_ON}
          />
        </View>
        <View style={styles.completeText}>
          <Text className="font-semibold text-[15px] text-white">
            Profile complete
          </Text>
          <Text
            className="mt-0.5 text-[13px] leading-[18px]"
            style={{ color: PROFILE_TEXT_SUBTITLE }}
          >
            You're ready to explore the world
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile completion"
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.topRow,
          pressed && styles.topRowPressed,
          !expanded && styles.topRowCollapsed,
        ]}
      >
        <View style={styles.topCopy}>
          <Text className="font-semibold text-[15px] text-white">
            Complete your profile
          </Text>
          <Text
            className="mt-0.5 text-[13px] leading-[18px]"
            style={{ color: PROFILE_NAV_SUBTITLE }}
          >
            {remaining.length} step{remaining.length === 1 ? "" : "s"} left
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="rgba(255, 255, 255, 0.45)"
          />
        </View>
      </Pressable>

      {expanded ? (
        <>
          <View style={styles.segmentRow}>
            {items.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.segment,
                  item.done ? styles.segmentDone : styles.segmentPending,
                ]}
              />
            ))}
          </View>

          <View style={styles.checklist}>
            {items.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={
                  item.done ? `${item.label} completed` : `Add ${item.label}`
                }
                disabled={item.done}
                onPress={() => showComingSoon(item.label)}
                style={({ pressed }) => [
                  styles.checkRow,
                  index < items.length - 1 && styles.checkRowBorder,
                  !item.done && pressed && styles.checkRowPressed,
                ]}
              >
                <View
                  style={[
                    styles.checkIcon,
                    item.done ? styles.checkIconDone : styles.checkIconPending,
                  ]}
                >
                  <Ionicons
                    name={item.done ? "checkmark" : item.icon}
                    size={item.done ? 14 : 15}
                    color={
                      item.done
                        ? PROFILE_COMPLETION_DONE_ON
                        : PROFILE_TEXT_SUBTITLE
                    }
                  />
                </View>

                <Text
                  className={`flex-1 text-[14px] ${
                    item.done ? "text-white/45 line-through" : "text-white"
                  }`}
                >
                  {item.label}
                </Text>

                {!item.done ? (
                  <View style={styles.addPill}>
                    <Text
                      className="text-[11px] font-semibold"
                      style={{ color: PROFILE_COMPLETION_ACCENT }}
                    >
                      Add
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={PROFILE_COMPLETION_ACCENT}
                    />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.collapsedSegmentRow}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.segment,
                item.done ? styles.segmentDone : styles.segmentPending,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: PROFILE_CARD_BG,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  completeCard: {
    width: "100%",
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: PROFILE_COMPLETION_DONE_SOFT_BG,
    borderWidth: 1,
    borderColor: PROFILE_COMPLETION_DONE_SOFT_BORDER,
  },
  completeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_COMPLETION_DONE,
  },
  completeText: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  topRowCollapsed: {
    paddingBottom: 16,
  },
  topRowPressed: {
    opacity: 0.92,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 6,
  },
  collapsedSegmentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  segmentDone: {
    backgroundColor: "#ffffff",
  },
  segmentPending: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  checklist: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.07)",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 50,
  },
  checkRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
  checkRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  checkIconDone: {
    backgroundColor: PROFILE_COMPLETION_DONE,
    borderColor: PROFILE_COMPLETION_DONE,
  },
  checkIconPending: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: PROFILE_ICON_RING,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: PROFILE_COMPLETION_ACCENT_BG,
  },
});
