import { ProfileBackButton } from "@/components/profile/profile-back-button";

type SavedBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function SavedBackButton({
  onPress,
  accessibilityLabel = "Back",
}: SavedBackButtonProps) {
  return (
    <ProfileBackButton
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
