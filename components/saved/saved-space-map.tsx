import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { SavedPlanetNode } from "@/components/saved/saved-planet-node";
import { SavedSpaceConnections } from "@/components/saved/saved-space-connections";
import { resolveSavedMapLayout } from "@/lib/saved-space-layout";
import type { SavedCategory } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type SavedSpaceMapProps = {
  countries: Country[];
  categoryByName: Record<string, SavedCategory>;
  savedAtByName: Record<string, number>;
  onSelectCountry: (country: Country) => void;
};

export function SavedSpaceMap({
  countries,
  categoryByName,
  savedAtByName,
  onSelectCountry,
}: SavedSpaceMapProps) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);

  const layout = useMemo(
    () =>
      resolveSavedMapLayout(
        countries,
        categoryByName,
        savedAtByName,
        viewportSize.width,
        viewportSize.height,
      ),
    [
      countries,
      categoryByName,
      savedAtByName,
      viewportSize.width,
      viewportSize.height,
    ],
  );

  const canPanX = layout != null && layout.canvasWidth > viewportSize.width;
  const canPanY = layout != null && layout.canvasHeight > viewportSize.height;

  useEffect(() => {
    if (!layout) return;

    const frame = requestAnimationFrame(() => {
      horizontalScrollRef.current?.scrollTo({
        x: layout.initialScrollX,
        animated: false,
      });
      verticalScrollRef.current?.scrollTo({
        y: layout.initialScrollY,
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [layout]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize({ width, height });
  };

  const mapContent =
    layout != null ? (
      <View
        style={{
          width: layout.canvasWidth,
          height: layout.canvasHeight,
        }}
      >
        <SavedSpaceConnections
          centers={layout.planets.map((planet) => planet.center)}
          pairs={layout.connectionPairs}
        />

        {layout.planets.map((planet, index) => (
          <SavedPlanetNode
            key={planet.country.name}
            country={planet.country}
            slot={planet.slot}
            palette={planet.palette}
            index={index}
            position={planet.anchor}
            onPress={() => onSelectCountry(planet.country)}
          />
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <View style={styles.viewport} onLayout={handleLayout}>
        {layout != null ? (
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            bounces={canPanX}
            scrollEnabled={canPanX}
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.scrollAxis}
            contentContainerStyle={{
              width: layout.canvasWidth,
              height: viewportSize.height,
            }}
          >
            <ScrollView
              ref={verticalScrollRef}
              bounces={canPanY}
              scrollEnabled={canPanY}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{
                width: layout.canvasWidth,
                height: viewportSize.height,
              }}
              contentContainerStyle={{
                width: layout.canvasWidth,
                height: layout.canvasHeight,
              }}
            >
              {mapContent}
            </ScrollView>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
  },
  scrollAxis: {
    flex: 1,
  },
});
