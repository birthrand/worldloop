import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { continentDisplayLabel } from "@/constants/regions";
import type { GlobeLabel, GlobeLabelScreenPosition } from "@/lib/globe-labels";
import type { MapCluster } from "@/lib/map-clusters";

type GlobeLabelOverlayProps = {
  labels: GlobeLabel[];
  positions: GlobeLabelScreenPosition[];
  layoutSize?: { width: number; height: number };
  focusedRegion?: string | null;
  onContinentPress?: (cluster: MapCluster) => void;
  /** Region id → cluster for continent tap targets. */
  continentClustersByRegion?: Map<string, MapCluster>;
};

const CONTINENT_OFFSET_Y = 4;
/** Gap from projected pin center to label (pin ~20px radius on screen). */
const SELECTED_OFFSET_Y = 10;
const LABEL_HORIZONTAL_MARGIN = 64;
const LABEL_TOP_MARGIN = 148;
const LABEL_BOTTOM_MARGIN = 112;

function estimateLabelHalfWidth(label: GlobeLabel): number {
  if (label.type === "continent") {
    return Math.max(66, label.text.length * 5.4 + 12);
  }
  return Math.max(88, label.text.length * 5.8 + 16);
}

function isLabelInSafeViewport(
  position: GlobeLabelScreenPosition,
  label: GlobeLabel,
  layoutSize: { width: number; height: number },
): boolean {
  if (layoutSize.width <= 0 || layoutSize.height <= 0) return true;

  const halfWidth = estimateLabelHalfWidth(label);
  const left = position.x - halfWidth;
  const right = position.x + halfWidth;

  return (
    left >= LABEL_HORIZONTAL_MARGIN &&
    right <= layoutSize.width - LABEL_HORIZONTAL_MARGIN &&
    position.y >= LABEL_TOP_MARGIN &&
    position.y <= layoutSize.height - LABEL_BOTTOM_MARGIN
  );
}

type LabelItemProps = {
  label: GlobeLabel;
  position: GlobeLabelScreenPosition;
  selected: boolean;
  layoutSize: { width: number; height: number };
  onContinentPress?: (cluster: MapCluster) => void;
  cluster?: MapCluster;
};

const GlobeLabelItem = memo(function GlobeLabelItem({
  label,
  position,
  selected,
  layoutSize,
  onContinentPress,
  cluster,
}: LabelItemProps) {
  if (!position.visible) return null;
  if (!isLabelInSafeViewport(position, label, layoutSize)) return null;

  const isContinent = label.type === "continent";
  const isAntarcticaLabel = isContinent && label.text === "Antarctica";
  const offsetY = isContinent ? CONTINENT_OFFSET_Y : SELECTED_OFFSET_Y;
  const translateX = isContinent ? -48 : -24;

  const content = isContinent ? (
    <View style={styles.continentWrap}>
      <Text
        style={[
          styles.continentText,
          selected && styles.continentTextSelected,
          isAntarcticaLabel ? styles.antarcticaText : null,
        ]}
        numberOfLines={1}
      >
        {label.text}
      </Text>
    </View>
  ) : (
    <Text style={styles.selectedText} numberOfLines={1}>
      {label.text}
    </Text>
  );

  return (
    <View
      style={[
        styles.anchor,
        {
          left: position.x,
          top: position.y + offsetY,
          transform: [{ translateX }],
        },
      ]}
      pointerEvents="box-none"
    >
      {isContinent && cluster && onContinentPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${continentDisplayLabel(cluster.region)}, ${cluster.countryCount} countries`}
          onPress={() => onContinentPress(cluster)}
          style={styles.continentHitArea}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
});

export function GlobeLabelOverlay({
  labels,
  positions,
  layoutSize = { width: 0, height: 0 },
  focusedRegion = null,
  onContinentPress,
  continentClustersByRegion,
}: GlobeLabelOverlayProps) {
  const labelById = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels],
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {positions.map((position) => {
        const label = labelById.get(position.id);
        if (!label) return null;

        const regionKey = label.id.replace("continent:", "");
        const cluster =
          label.type === "continent"
            ? continentClustersByRegion?.get(regionKey)
            : undefined;

        return (
          <GlobeLabelItem
            key={label.id}
            label={label}
            position={position}
            layoutSize={layoutSize}
            selected={
              label.type === "continent" &&
              !!focusedRegion &&
              regionKey === focusedRegion
            }
            onContinentPress={onContinentPress}
            cluster={cluster}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  anchor: {
    position: "absolute",
    alignItems: "center",
  },
  continentHitArea: {
    minWidth: 112,
    maxWidth: 132,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  continentWrap: {
    alignItems: "center",
    maxWidth: 120,
  },
  continentText: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: "rgba(203, 213, 225, 0.5)",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  continentTextSelected: {
    fontSize: 12,
    color: "#fbbf24",
    textShadowColor: "rgba(251, 191, 36, 0.45)",
    textShadowRadius: 6,
  },
  antarcticaText: {
    color: "#000000",
  },
  selectedText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
