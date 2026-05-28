import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { MapBoundaryControlsModal } from "@/components/map/map-boundary-controls-modal";
import { applyBoundaryStyleDraft } from "@/constants/map-boundary-style";
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
  /** Distance from the bottom safe edge (tab bar / region chrome clearance). */
  bottom?: number;
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
  bottom = 98,
}: MapControlsProps) {
  const [isActionRailExpanded, setIsActionRailExpanded] = useState(true);
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);
  const countryMarkerMode = useMapUiStore((s) => s.countryMarkerMode);
  const setCountryMarkerMode = useMapUiStore((s) => s.setCountryMarkerMode);
  const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);
  const setShowBoundaryLines = useMapUiStore((s) => s.setShowBoundaryLines);
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const setBoundaryStyle = useMapUiStore((s) => s.setBoundaryStyle);
  const focusedRegion = useMapUiStore((s) => s.focusedRegion);
  const boundaryPreviewZoomTier = focusedRegion ? "region" : "world";

  const is3d = mapMode === "3d";
  const isTransitioning =
    mapViewTransition === "enteringGlobe" ||
    mapViewTransition === "enteringFlat";
  const isGlobeLoading = mapViewTransition === "enteringGlobe";
  const isFlatLoading = mapViewTransition === "enteringFlat";

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
          ? "Hide globe country pins"
          : "Show globe country pins";
      }
      return mode === "flag" ? "Hide country flags" : "Show country flags";
    },
    [is3d],
  );

  const isFlagsVisible = countryMarkerMode === "flag";
  const areGlobePinsVisible = isGlobeYellowPinsVisible(countryMarkerMode);
  const markerModeIcon = is3d
    ? areGlobePinsVisible
      ? ("location" as const)
      : ("location-outline" as const)
    : isFlagsVisible
      ? ("flag" as const)
      : ("flag-outline" as const);
  const markerModeColor =
    (is3d && areGlobePinsVisible) || (!is3d && isFlagsVisible)
      ? "#ffffff"
      : "#4b5563";

  const handleToggleBoundaryLines = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !showBoundaryLines;
    setShowBoundaryLines(next);
    setBoundaryStyle(
      applyBoundaryStyleDraft({
        ...boundaryStyle,
        strokeColorEnabled: next,
        strokeWidthEnabled: next,
      }),
    );
  }, [boundaryStyle, setBoundaryStyle, setShowBoundaryLines, showBoundaryLines]);

  const handleMapModeToggle = useCallback(() => {
    if (isTransitioning) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMapModeToggle();
  }, [isTransitioning, onMapModeToggle]);

  const showDisplayStack = showFlagToggle || showBoundaryControls;

  const toggleActionRail = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActionRailExpanded((prev) => !prev);
  }, []);

  const legendAccessibilityLabel = isActionRailExpanded
    ? "Hide map controls"
    : "Show map controls";

  return (
    <>
      <View
        style={[styles.column, { bottom }]}
        pointerEvents="box-none"
        className="items-center"
      >
        {isActionRailExpanded ? (
          <>
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
                accessibilityLabel={
                  isFlatLoading ? "Switching to flat map view" : "Flat map view"
                }
                disabled={isTransitioning}
                onPress={() => {
                  if (!is3d) return;
                  handleMapModeToggle();
                }}
                style={({ pressed }) => [
                  styles.control,
                  !is3d && styles.modeControlActiveTop,
                  isFlatLoading && styles.modeControlLoading,
                  pressed &&
                    !isTransitioning &&
                    !is3d &&
                    styles.modeControlPressedTop,
                  pressed && !isTransitioning && is3d && styles.pressed,
                ]}
              >
                <Ionicons
                  name={!is3d ? "map" : "map-outline"}
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
                <Ionicons name="refresh-outline" size={20} color="#ffffff" />
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

            {showDisplayStack ? (
              <View style={styles.stack}>
                {showFlagToggle ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={countryMarkerModeLabel(
                        countryMarkerMode,
                      )}
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
                        name="options-outline"
                        size={20}
                        color="#ffffff"
                      />
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        <View
          style={[
            styles.stack,
            !isActionRailExpanded && styles.legendStackCollapsed,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isActionRailExpanded }}
            accessibilityLabel={legendAccessibilityLabel}
            onPress={toggleActionRail}
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <Ionicons
              name={isActionRailExpanded ? "layers" : "layers-outline"}
              size={20}
              color={isActionRailExpanded ? "#ffffff" : "#ffffff"}
            />
          </Pressable>
        </View>
      </View>

      {isBoundaryModalOpen ? (
        <MapBoundaryControlsModal
          previewZoomTier={boundaryPreviewZoomTier}
          onClose={() => setIsBoundaryModalOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  column: {
    position: "absolute",
    left: 16,
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
  legendStackCollapsed: {
    backgroundColor: "#1a2234",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
