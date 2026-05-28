import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { MapBoundaryControlsModal } from "@/components/map/map-boundary-controls-modal";
import type { MapViewTransition } from "@/lib/map-view-transition";
import type { MapMode } from "@/store/use-map-store";
import {
  isGlobeYellowPinsVisible,
  toggleGlobeYellowPins,
  useMapUiStore,
} from "@/store/use-map-ui-store";

type MapControlsProps = {
  mapMode: MapMode;
  mapViewTransition: MapViewTransition;
  onMapModeToggle: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** When false, the flag visibility toggle is hidden (e.g. world view, 3D, no markers). */
  showFlagToggle?: boolean;
  /** When false, boundary style controls are hidden. */
  showBoundaryControls?: boolean;
};

export function MapControls({
  mapMode,
  mapViewTransition,
  onMapModeToggle,
  onReset,
  onZoomIn,
  onZoomOut,
  showFlagToggle = false,
  showBoundaryControls = true,
}: MapControlsProps) {
  const [showNavZoomControls, setShowNavZoomControls] = useState(true);
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);
  const countryMarkerMode = useMapUiStore((s) => s.countryMarkerMode);
  const setCountryMarkerMode = useMapUiStore((s) => s.setCountryMarkerMode);
  const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);
  const setShowBoundaryLines = useMapUiStore((s) => s.setShowBoundaryLines);

  const is3d = mapMode === "3d";
  const isTransitioning =
    mapViewTransition === "enteringGlobe" ||
    mapViewTransition === "enteringFlat";
  const isGlobeLoading = mapViewTransition === "enteringGlobe";

  const handleCycleCountryMarkerMode = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (is3d) {
      setCountryMarkerMode(toggleGlobeYellowPins(countryMarkerMode));
      return;
    }
    setCountryMarkerMode(countryMarkerMode === "flag" ? "hidden" : "flag");
  }, [countryMarkerMode, is3d, setCountryMarkerMode]);

  const countryMarkerModeLabel = useCallback(
    (mode: "flag" | "circle" | "hidden") => {
      if (is3d) {
        return isGlobeYellowPinsVisible(mode)
          ? "Hide yellow country pins on globe"
          : "Show yellow country pins on globe";
      }
      return mode === "flag" ? "Hide country flags" : "Show country flags";
    },
    [is3d],
  );

  const isFlagsVisible = countryMarkerMode === "flag";
  const markerModeIcon =
    is3d || isFlagsVisible ? "flag" : ("flag-outline" as const);
  const markerModeColor = isFlagsVisible ? "#ffffff" : "#4b5563";

  const handleToggleBoundaryLines = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBoundaryLines(!showBoundaryLines);
  }, [setShowBoundaryLines, showBoundaryLines]);

  const handleMapModeToggle = useCallback(() => {
    if (isTransitioning) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMapModeToggle();
  }, [isTransitioning, onMapModeToggle]);

  const useDisplayStack = showFlagToggle || showBoundaryControls;

  const toggleNavZoomControls = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNavZoomControls((prev) => !prev);
  }, []);

  const legendControl = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: showNavZoomControls }}
      accessibilityLabel={
        showNavZoomControls
          ? "Hide map navigation controls"
          : "Show map navigation controls"
      }
      onPress={toggleNavZoomControls}
      style={({ pressed }) => [
        styles.control,
        !showNavZoomControls && styles.legendControlCollapsed,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name="layers-outline"
        size={18}
        color={showNavZoomControls ? "#ffffff" : "rgba(255, 255, 255, 0.28)"}
      />
    </Pressable>
  );

  return (
    <>
      <View
        style={styles.column}
        pointerEvents="box-none"
        className="items-center"
      >
        <View
          style={styles.stack}
          accessibilityRole="tablist"
          accessibilityLabel="Map view mode"
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{
              selected: !is3d,
              disabled: isTransitioning,
            }}
            accessibilityLabel="Flat map view"
            disabled={isTransitioning}
            onPress={() => {
              if (!is3d) return;
              handleMapModeToggle();
            }}
            style={({ pressed }) => [
              styles.control,
              !is3d && styles.modeControlActiveTop,
              pressed &&
                !isTransitioning &&
                !is3d &&
                styles.modeControlPressedTop,
              pressed && !isTransitioning && is3d && styles.pressed,
            ]}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={!is3d ? "#0b132b" : "#ffffff"}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{
              selected: is3d,
              disabled: isTransitioning,
            }}
            accessibilityLabel={
              isGlobeLoading ? "Switching to globe view" : "Globe view"
            }
            disabled={isTransitioning}
            onPress={() => {
              if (is3d) return;
              handleMapModeToggle();
            }}
            style={({ pressed }) => [
              styles.control,
              is3d && styles.modeControlActiveBottom,
              isGlobeLoading && styles.modeControlLoading,
              pressed &&
                !isTransitioning &&
                is3d &&
                styles.modeControlPressedBottom,
              pressed && !isTransitioning && !is3d && styles.pressed,
            ]}
          >
            <Ionicons
              name={is3d ? "globe" : "globe-outline"}
              size={20}
              color={is3d ? "#0b132b" : "#ffffff"}
            />
          </Pressable>
        </View>

        {showNavZoomControls ? (
          <View style={styles.stack}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset to world view"
              onPress={onReset}
              style={({ pressed }) => [
                styles.control,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="navigate-outline" size={20} color="#ffffff" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              onPress={onZoomIn}
              style={({ pressed }) => [
                styles.control,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              onPress={onZoomOut}
              style={({ pressed }) => [
                styles.control,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="remove" size={20} color="#ffffff" />
            </Pressable>
          </View>
        ) : null}

        {useDisplayStack ? (
          <View style={styles.stack}>
            {showFlagToggle ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={countryMarkerModeLabel(countryMarkerMode)}
                  onPress={handleCycleCountryMarkerMode}
                  style={({ pressed }) => [
                    styles.control,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={markerModeIcon}
                    size={18}
                    color={markerModeColor}
                  />
                </Pressable>
                <View style={styles.divider} />
              </>
            ) : null}
            {showBoundaryControls ? (
              <>
                <Pressable
                  accessibilityRole="togglebutton"
                  accessibilityState={{ checked: showBoundaryLines }}
                  accessibilityLabel={
                    showBoundaryLines
                      ? "Hide boundary lines"
                      : "Show boundary lines"
                  }
                  onPress={handleToggleBoundaryLines}
                  style={({ pressed }) => [
                    styles.control,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={showBoundaryLines ? "grid" : "grid-outline"}
                    size={18}
                    color={showBoundaryLines ? "#ffffff" : "#4b5563"}
                  />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Boundary style controls"
                  onPress={() => setIsBoundaryModalOpen(true)}
                  style={({ pressed }) => [
                    styles.control,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={18}
                    color="#ffffff"
                  />
                </Pressable>
                <View style={styles.divider} />
              </>
            ) : null}
            {legendControl}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showNavZoomControls }}
            accessibilityLabel={
              showNavZoomControls
                ? "Hide map navigation controls"
                : "Show map navigation controls"
            }
            onPress={toggleNavZoomControls}
            style={({ pressed }) => [
              styles.legendButton,
              !showNavZoomControls && styles.legendButtonCollapsed,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="layers-outline"
              size={18}
              color={
                showNavZoomControls ? "#ffffff" : "rgba(255, 255, 255, 0.28)"
              }
            />
          </Pressable>
        )}
      </View>

      <MapBoundaryControlsModal
        visible={isBoundaryModalOpen}
        onClose={() => setIsBoundaryModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  column: {
    position: "absolute",
    left: 16,
    bottom: 120,
    gap: 4,
    zIndex: 5,
  },
  /** Match stack pill radius so active fill is not clipped by overflow: hidden. */
  modeControlLoading: {
    opacity: 0.45,
  },
  modeControlActiveTop: {
    backgroundColor: "#fbbf24",
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
  },
  modeControlActiveBottom: {
    backgroundColor: "#fbbf24",
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  modeControlPressedTop: {
    opacity: 0.95,
    backgroundColor: "#e5ad1f",
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
  },
  modeControlPressedBottom: {
    opacity: 0.95,
    backgroundColor: "#e5ad1f",
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  stack: {
    borderRadius: 32,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  control: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  legendControlCollapsed: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  legendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  legendButtonCollapsed: {
    backgroundColor: "#1a2234",
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
