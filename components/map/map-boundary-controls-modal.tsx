import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  applyBoundaryStyleDraft,
  BOUNDARY_STEP_MAX,
  BOUNDARY_STEP_MIN,
  boundaryStyleHasChanges,
  clampBoundaryStep,
  DEFAULT_MAP_BOUNDARY_STYLE,
  displayPercentToFillOpacityStep,
  fillOpacityStepToDisplayPercent,
  resolveBoundaryStrokeWidth,
  type MapBoundaryStyleSettings,
  type MapZoomTier,
} from "@/constants/map-boundary-style";
import { resolveCountryFocusBoundaryStrokeWidth } from "@/constants/map-country-focus";
import { hueToHex } from "@/lib/color-utils";
import { useMapUiStore } from "@/store/use-map-ui-store";

const ACCENT = "#fbbf24";
const ACCENT_DARK = "#0b132b";
const TRACK_MUTED = "rgba(255,255,255,0.16)";
const THUMB = "#ffffff";

type MapBoundaryControlsModalProps = {
  /** Map zoom tier used for live thickness preview labels (continent ≈ region). */
  previewZoomTier?: MapZoomTier;
  onClose: () => void;
};

type SettingSwitchProps = {
  value: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  onValueChange: (value: boolean) => void;
};

function SettingSwitch({
  value,
  disabled = false,
  accessibilityLabel,
  onValueChange,
}: SettingSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.switchTrack,
        value && styles.switchTrackOn,
        disabled && styles.switchDisabled,
      ]}
    >
      <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
    </Pressable>
  );
}

function BoundaryOutlineIcon() {
  return (
    <View style={styles.featureIconBox}>
      <View style={styles.boundaryIconInner} />
    </View>
  );
}

function FillPatternIcon() {
  return (
    <View style={styles.featureIconBox}>
      <View style={styles.fillStripe} />
      <View style={[styles.fillStripe, styles.fillStripeMid]} />
      <View style={[styles.fillStripe, styles.fillStripeFar]} />
    </View>
  );
}

function CountryHighlightIcon({ color }: { color: string }) {
  return (
    <View style={styles.featureIconBox}>
      <View
        style={[styles.countryHighlightSwatch, { backgroundColor: color }]}
      />
    </View>
  );
}

type CollapsibleStyleSectionProps = {
  icon: ReactNode;
  label: string;
  enabled: boolean;
  expanded: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleExpanded: () => void;
  children: ReactNode;
};

function CollapsibleStyleSection({
  icon,
  label,
  enabled,
  expanded,
  onToggleEnabled,
  onToggleExpanded,
  children,
}: CollapsibleStyleSectionProps) {
  return (
    <View style={styles.collapsibleSection}>
      <View style={styles.collapsibleHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${label} settings`}
          onPress={onToggleExpanded}
          style={({ pressed }) => [
            styles.collapsibleHeaderMain,
            pressed && styles.pressed,
          ]}
        >
          {icon}
          <Text style={styles.featureToggleLabel}>{label}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="rgba(255,255,255,0.55)"
          />
        </Pressable>
        <SettingSwitch
          value={enabled}
          accessibilityLabel={`${label} toggle`}
          onValueChange={onToggleEnabled}
        />
      </View>
      {expanded ? (
        <View style={styles.collapsibleContent}>{children}</View>
      ) : null}
    </View>
  );
}

type ColorFieldProps = {
  label: string;
  hue: number;
  colorHex: string | null;
  disabled?: boolean;
  onHueChange: (hue: number) => void;
  onHexChange: (hex: string | null) => void;
};

function ColorField({
  label,
  hue,
  colorHex,
  disabled = false,
  onHueChange,
  onHexChange,
}: ColorFieldProps) {
  const previewHex = (colorHex ?? hueToHex(hue)).toUpperCase();
  const [hexDraft, setHexDraft] = useState(previewHex);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [liveHue, setLiveHue] = useState(hue);

  useEffect(() => {
    setHexDraft(previewHex);
    setLiveHue(hue);
  }, [hue, previewHex]);

  const livePreview = hueToHex(liveHue);

  return (
    <View
      style={[styles.settingBlock, disabled && styles.settingBlockDisabled]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.colorInputRow}>
        <View
          style={[
            styles.colorSwatchSquare,
            { backgroundColor: livePreview },
            disabled && styles.colorSwatchSquareDisabled,
          ]}
        />
        <View
          accessibilityLabel={`${label} hex value`}
          accessibilityRole="text"
          style={[styles.hexInput, styles.hexInputReadonly]}
        >
          <Text
            style={[
              styles.hexReadonlyText,
              disabled && styles.hexInputDisabled,
            ]}
          >
            {hexDraft}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} hue picker`}
          accessibilityState={{ expanded: pickerOpen }}
          disabled={disabled}
          onPress={() => setPickerOpen((open) => !open)}
          style={({ pressed }) => [
            styles.eyedropperButton,
            pickerOpen && styles.eyedropperButtonActive,
            pressed && !disabled && styles.pressed,
          ]}
        >
          <Ionicons
            name="color-wand-outline"
            size={18}
            color={pickerOpen ? ACCENT : "rgba(255,255,255,0.85)"}
          />
        </Pressable>
      </View>
      {pickerOpen && !disabled ? (
        <Slider
          style={styles.hueSlider}
          value={liveHue}
          minimumValue={0}
          maximumValue={360}
          step={1}
          minimumTrackTintColor={TRACK_MUTED}
          maximumTrackTintColor={TRACK_MUTED}
          thumbTintColor={livePreview}
          accessibilityLabel={`${label} hue slider`}
          onValueChange={(nextHue) => {
            setLiveHue(nextHue);
            onHexChange(null);
            onHueChange(nextHue);
            setHexDraft(hueToHex(nextHue).toUpperCase());
          }}
        />
      ) : null}
    </View>
  );
}

type SliderWithValueProps = {
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  accessibilityLabel: string;
  tickCount?: number;
  endLabels?: [string, string, string];
  formatDisplay: (value: number) => string;
  parseDisplay: (text: string) => number | null;
  onValueChange: (value: number) => void;
  showValueInput?: boolean;
};

function SliderWithValue({
  value,
  min,
  max,
  unit,
  disabled = false,
  accessibilityLabel,
  tickCount = 5,
  endLabels,
  formatDisplay,
  parseDisplay,
  onValueChange,
  showValueInput = true,
}: SliderWithValueProps) {
  const [valueDraft, setValueDraft] = useState(formatDisplay(value));

  useEffect(() => {
    setValueDraft(formatDisplay(value));
  }, [formatDisplay, value]);

  return (
    <View style={styles.sliderControlRow}>
      <View style={styles.sliderColumn}>
        <Slider
          key={`${accessibilityLabel}-${value}`}
          style={styles.controlSlider}
          disabled={disabled}
          value={value}
          minimumValue={min}
          maximumValue={max}
          step={1}
          accessibilityLabel={accessibilityLabel}
          minimumTrackTintColor={ACCENT}
          maximumTrackTintColor={TRACK_MUTED}
          thumbTintColor={THUMB}
          onValueChange={onValueChange}
        />
        {tickCount > 0 ? (
          <View style={styles.tickRow}>
            {Array.from({ length: tickCount }, (_, index) => (
              <View key={index} style={styles.tickMark} />
            ))}
          </View>
        ) : null}
        {endLabels ? (
          <View style={styles.sliderEndLabels}>
            <Text style={styles.sliderEndLabel}>{endLabels[0]}</Text>
            <Text style={styles.sliderEndLabel}>{endLabels[1]}</Text>
            <Text style={styles.sliderEndLabel}>{endLabels[2]}</Text>
          </View>
        ) : null}
      </View>
      {showValueInput ? (
        <View style={styles.valueFieldGroup}>
          <TextInput
            style={styles.valueInput}
            value={valueDraft}
            editable={!disabled}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel={`${accessibilityLabel} value`}
            onChangeText={(text) => {
              setValueDraft(text.replace(/[^0-9]/g, ""));
            }}
            onBlur={() => {
              const parsed = parseDisplay(valueDraft);
              if (parsed === null) {
                setValueDraft(formatDisplay(value));
                return;
              }
              onValueChange(parsed);
            }}
          />
          <Text style={styles.valueUnit}>{unit}</Text>
        </View>
      ) : null}
    </View>
  );
}

type BoundaryStyleSection = "boundary" | "overlay" | "country";

export function MapBoundaryControlsModal({
  previewZoomTier = "world",
  onClose,
}: MapBoundaryControlsModalProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const setBoundaryStyle = useMapUiStore((s) => s.setBoundaryStyle);
  const resetBoundaryStyle = useMapUiStore((s) => s.resetBoundaryStyle);
  const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);
  const setShowBoundaryLines = useMapUiStore((s) => s.setShowBoundaryLines);

  const initialStyle = applyBoundaryStyleDraft(boundaryStyle);
  const committedStyleRef = useRef(initialStyle);
  const committedShowLinesRef = useRef(showBoundaryLines);
  const hasToggledShowLinesRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToEndAfterCountryExpandRef = useRef(false);
  const [draft, setDraft] = useState<MapBoundaryStyleSettings>(initialStyle);
  const [expandedSection, setExpandedSection] =
    useState<BoundaryStyleSection | null>("boundary");

  const toggleSection = useCallback((section: BoundaryStyleSection) => {
    setExpandedSection((current) => {
      const nextExpanded = current === section ? null : section;
      if (section === "country" && nextExpanded === "country") {
        scrollToEndAfterCountryExpandRef.current = true;
      }
      return nextExpanded;
    });
  }, []);

  const handleScrollContentSizeChange = useCallback(() => {
    if (!scrollToEndAfterCountryExpandRef.current) return;
    scrollToEndAfterCountryExpandRef.current = false;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Ensure the 2D map has polygons to preview (restored on dismiss if they were off).
  useEffect(() => {
    if (!committedShowLinesRef.current) {
      setShowBoundaryLines(true);
    }
  }, [setShowBoundaryLines]);

  // Live-preview: map reflects slider changes immediately while the modal is open.
  useEffect(() => {
    setBoundaryStyle(applyBoundaryStyleDraft(draft));
  }, [draft, setBoundaryStyle]);

  const hasChanges = boundaryStyleHasChanges(draft, committedStyleRef.current);
  const boundaryEnabled = draft.strokeColorEnabled;
  const countryHighlightEnabled = draft.countryHighlightEnabled;

  const previewStrokeWidth = resolveBoundaryStrokeWidth(
    applyBoundaryStyleDraft(draft),
    previewZoomTier,
  );
  const previewCountryStrokeWidth = resolveCountryFocusBoundaryStrokeWidth(
    applyBoundaryStyleDraft(draft),
  );

  const formatThicknessStep = useCallback((step: number) => String(step), []);
  const formatOverlayOpacityStep = useCallback(
    (step: number) => String(fillOpacityStepToDisplayPercent(step)),
    [],
  );
  const formatCountryFillOpacityStep = useCallback(
    (step: number) => String(fillOpacityStepToDisplayPercent(step)),
    [],
  );

  const handleDismiss = useCallback(() => {
    setBoundaryStyle(committedStyleRef.current);
    setShowBoundaryLines(committedShowLinesRef.current);
    onClose();
  }, [onClose, setBoundaryStyle, setShowBoundaryLines]);

  const handleApply = () => {
    const applied = applyBoundaryStyleDraft(draft);
    setBoundaryStyle(applied);
    committedStyleRef.current = applied;
    if (hasToggledShowLinesRef.current) {
      committedShowLinesRef.current = showBoundaryLines;
    } else {
      setShowBoundaryLines(committedShowLinesRef.current);
    }
    onClose();
  };

  const handleResetDefaults = () => {
    const defaults = applyBoundaryStyleDraft(DEFAULT_MAP_BOUNDARY_STYLE);
    setDraft(defaults);
    setBoundaryStyle(defaults);
    setShowBoundaryLines(true);
    committedStyleRef.current = defaults;
    committedShowLinesRef.current = true;
    hasToggledShowLinesRef.current = true;
    resetBoundaryStyle();
  };

  const setBoundaryEnabled = (strokeColorEnabled: boolean) => {
    hasToggledShowLinesRef.current = true;
    setShowBoundaryLines(strokeColorEnabled);
    setDraft((current) => ({
      ...current,
      strokeColorEnabled,
      strokeWidthEnabled: strokeColorEnabled,
    }));
  };

  const setOverlayEnabled = (fillEnabled: boolean) => {
    setDraft((current) => ({ ...current, fillEnabled }));
  };

  const setCountryHighlightEnabled = (enabled: boolean) => {
    setDraft((current) => ({ ...current, countryHighlightEnabled: enabled }));
  };

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close boundary controls"
          onPress={handleDismiss}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSideSpacer} />
            <Text style={styles.modalTitle}>Boundary style</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          <View style={styles.sectionDivider} />

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={handleScrollContentSizeChange}
          >
            <CollapsibleStyleSection
              icon={<BoundaryOutlineIcon />}
              label="Boundary"
              enabled={boundaryEnabled}
              expanded={expandedSection === "boundary"}
              onToggleEnabled={setBoundaryEnabled}
              onToggleExpanded={() => toggleSection("boundary")}
            >
              <ColorField
                label="Boundary color"
                hue={draft.strokeColorHue}
                colorHex={draft.strokeColorHex}
                disabled={!boundaryEnabled}
                onHueChange={(strokeColorHue) =>
                  setDraft((current) => ({ ...current, strokeColorHue }))
                }
                onHexChange={(strokeColorHex) =>
                  setDraft((current) => ({ ...current, strokeColorHex }))
                }
              />

              <View
                style={[
                  styles.settingBlock,
                  styles.compactSliderBlock,
                  !boundaryEnabled && styles.settingBlockDisabled,
                ]}
                pointerEvents={boundaryEnabled ? "auto" : "none"}
              >
                <Text style={styles.fieldLabel}>
                  Boundary thickness ({previewStrokeWidth.toFixed(1)}px)
                </Text>
                <SliderWithValue
                  value={draft.strokeThicknessStep}
                  min={BOUNDARY_STEP_MIN}
                  max={BOUNDARY_STEP_MAX}
                  unit="px"
                  disabled={!boundaryEnabled}
                  accessibilityLabel="Global boundary thickness"
                  tickCount={5}
                  showValueInput={false}
                  formatDisplay={formatThicknessStep}
                  parseDisplay={(text) => {
                    const parsed = Number.parseInt(text, 10);
                    if (Number.isNaN(parsed)) {
                      return null;
                    }
                    return clampBoundaryStep(parsed);
                  }}
                  onValueChange={(strokeThicknessStep) =>
                    setDraft((current) => ({
                      ...current,
                      strokeThicknessStep:
                        clampBoundaryStep(strokeThicknessStep),
                    }))
                  }
                />
              </View>
            </CollapsibleStyleSection>

            <View style={styles.sectionGroupDivider} />

            <CollapsibleStyleSection
              icon={<FillPatternIcon />}
              label="Overlay"
              enabled={draft.fillEnabled}
              expanded={expandedSection === "overlay"}
              onToggleEnabled={setOverlayEnabled}
              onToggleExpanded={() => toggleSection("overlay")}
            >
              <View
                style={[
                  styles.settingBlock,
                  styles.compactSliderBlock,
                  styles.fillOpacityBlock,
                  !draft.fillEnabled && styles.settingBlockDisabled,
                ]}
                pointerEvents={draft.fillEnabled ? "auto" : "none"}
              >
                <Text style={styles.fieldLabel}>Overlay opacity</Text>
                <SliderWithValue
                  value={draft.fillOpacityStep}
                  min={BOUNDARY_STEP_MIN}
                  max={BOUNDARY_STEP_MAX}
                  unit="%"
                  disabled={!draft.fillEnabled}
                  accessibilityLabel="Overlay opacity"
                  tickCount={0}
                  endLabels={["Subtle", "50%", "Strong"]}
                  showValueInput={false}
                  formatDisplay={formatOverlayOpacityStep}
                  parseDisplay={(text) => {
                    const parsed = Number.parseInt(text, 10);
                    if (Number.isNaN(parsed)) {
                      return null;
                    }
                    return displayPercentToFillOpacityStep(parsed);
                  }}
                  onValueChange={(fillOpacityStep) =>
                    setDraft((current) => ({
                      ...current,
                      fillOpacityStep: clampBoundaryStep(fillOpacityStep),
                    }))
                  }
                />
              </View>
            </CollapsibleStyleSection>

            <View style={styles.sectionGroupDivider} />

            <CollapsibleStyleSection
              icon={
                <CountryHighlightIcon
                  color={
                    draft.countryFillColorHex ??
                    hueToHex(draft.countryFillColorHue)
                  }
                />
              }
              label="Highlight"
              enabled={countryHighlightEnabled}
              expanded={expandedSection === "country"}
              onToggleEnabled={setCountryHighlightEnabled}
              onToggleExpanded={() => toggleSection("country")}
            >
              <ColorField
                label="Fill color"
                hue={draft.countryFillColorHue}
                colorHex={draft.countryFillColorHex}
                disabled={!countryHighlightEnabled}
                onHueChange={(countryFillColorHue) =>
                  setDraft((current) => ({ ...current, countryFillColorHue }))
                }
                onHexChange={(countryFillColorHex) =>
                  setDraft((current) => ({ ...current, countryFillColorHex }))
                }
              />

              <View
                style={[
                  styles.settingBlock,
                  styles.compactSliderBlock,
                  !countryHighlightEnabled && styles.settingBlockDisabled,
                ]}
                pointerEvents={countryHighlightEnabled ? "auto" : "none"}
              >
                <Text style={styles.fieldLabel}>Fill opacity</Text>
                <SliderWithValue
                  value={draft.countryFillOpacityStep}
                  min={BOUNDARY_STEP_MIN}
                  max={BOUNDARY_STEP_MAX}
                  unit="%"
                  disabled={!countryHighlightEnabled}
                  accessibilityLabel="Fill opacity"
                  tickCount={0}
                  endLabels={["Subtle", "50%", "Strong"]}
                  showValueInput={false}
                  formatDisplay={formatCountryFillOpacityStep}
                  parseDisplay={(text) => {
                    const parsed = Number.parseInt(text, 10);
                    if (Number.isNaN(parsed)) {
                      return null;
                    }
                    return displayPercentToFillOpacityStep(parsed);
                  }}
                  onValueChange={(countryFillOpacityStep) =>
                    setDraft((current) => ({
                      ...current,
                      countryFillOpacityStep: clampBoundaryStep(
                        countryFillOpacityStep,
                      ),
                    }))
                  }
                />
              </View>

              <ColorField
                label="Boundary color"
                hue={draft.countryStrokeColorHue}
                colorHex={draft.countryStrokeColorHex}
                disabled={!countryHighlightEnabled}
                onHueChange={(countryStrokeColorHue) =>
                  setDraft((current) => ({ ...current, countryStrokeColorHue }))
                }
                onHexChange={(countryStrokeColorHex) =>
                  setDraft((current) => ({ ...current, countryStrokeColorHex }))
                }
              />

              <View
                style={[
                  styles.settingBlock,
                  styles.compactSliderBlock,
                  !countryHighlightEnabled && styles.settingBlockDisabled,
                ]}
                pointerEvents={countryHighlightEnabled ? "auto" : "none"}
              >
                <Text style={styles.fieldLabel}>
                  Boundary thickness ({previewCountryStrokeWidth.toFixed(1)}
                  px)
                </Text>
                <SliderWithValue
                  value={draft.countryStrokeThicknessStep}
                  min={BOUNDARY_STEP_MIN}
                  max={BOUNDARY_STEP_MAX}
                  unit="px"
                  disabled={!countryHighlightEnabled}
                  accessibilityLabel="Country highlight boundary thickness"
                  tickCount={5}
                  showValueInput={false}
                  formatDisplay={formatThicknessStep}
                  parseDisplay={(text) => {
                    const parsed = Number.parseInt(text, 10);
                    if (Number.isNaN(parsed)) {
                      return null;
                    }
                    return clampBoundaryStep(parsed);
                  }}
                  onValueChange={(countryStrokeThicknessStep) =>
                    setDraft((current) => ({
                      ...current,
                      countryStrokeThicknessStep: clampBoundaryStep(
                        countryStrokeThicknessStep,
                      ),
                    }))
                  }
                />
              </View>
            </CollapsibleStyleSection>
          </ScrollView>

          <View style={styles.sectionDivider} />

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset all boundary styles"
              onPress={handleResetDefaults}
              style={({ pressed }) => [
                styles.actionButton,
                styles.resetButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="refresh-outline" size={16} color="#ffffff" />
              <Text style={styles.resetText}>Reset all</Text>
            </Pressable>
            <Pressable
              disabled={!hasChanges}
              accessibilityState={{ disabled: !hasChanges }}
              accessibilityRole="button"
              accessibilityLabel="Apply boundary styles"
              onPress={handleApply}
              style={({ pressed }) => [
                styles.actionButton,
                styles.applyButton,
                !hasChanges && styles.applyButtonDisabled,
                pressed && hasChanges && styles.pressed,
              ]}
            >
              <Ionicons
                name="checkmark"
                size={18}
                color={hasChanges ? ACCENT_DARK : "rgba(255,255,255,0.65)"}
              />
              <Text
                style={[
                  styles.applyText,
                  !hasChanges && styles.applyTextDisabled,
                ]}
              >
                Apply
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "88%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerSideSpacer: {
    width: 32,
    height: 32,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  scrollContent: {
    gap: 10,
    paddingTop: 6,
    paddingBottom: 6,
  },
  collapsibleSection: {
    gap: 10,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  collapsibleHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 40,
  },
  collapsibleContent: {
    gap: 10,
    paddingBottom: 2,
  },
  featureIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  boundaryIconInner: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    borderStyle: "dashed",
  },
  fillStripe: {
    position: "absolute",
    width: 28,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.45)",
    transform: [{ rotate: "42deg" }],
    left: -2,
    top: 8,
  },
  fillStripeMid: {
    top: 13,
    opacity: 0.75,
  },
  fillStripeFar: {
    top: 18,
    opacity: 0.5,
  },
  countryHighlightSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  featureToggleLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  switchTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  switchTrackOn: {
    backgroundColor: ACCENT,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignSelf: "flex-start",
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  switchDisabled: {
    opacity: 0.45,
  },
  settingBlock: {
    gap: 6,
  },
  compactSliderBlock: {
    gap: 3,
  },
  fillOpacityBlock: {
    marginBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 0,
    marginBottom: 0,
  },
  /** Separates Boundary vs Overlay groups (offsets scroll gap so spacing stays tight). */
  sectionGroupDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: -2,
    marginBottom: -4,
  },
  settingBlockDisabled: {
    opacity: 0.42,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.62)",
  },
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorSwatchSquare: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  colorSwatchSquareDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  hexInput: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  hexInputReadonly: {
    justifyContent: "center",
  },
  hexReadonlyText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  hexInputDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  eyedropperButton: {
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  eyedropperButtonActive: {
    borderColor: ACCENT,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  hueSlider: {
    width: "100%",
    height: 34,
    marginTop: 0,
  },
  sliderControlRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sliderColumn: {
    flex: 1,
    gap: 4,
  },
  controlSlider: {
    width: "100%",
    height: 32,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: -2,
  },
  tickMark: {
    width: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  sliderEndLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: -2,
  },
  sliderEndLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.5)",
  },
  valueFieldGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  valueInput: {
    width: 44,
    height: 36,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  valueUnit: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.55)",
    minWidth: 18,
  },
  modalActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  applyButton: {
    backgroundColor: ACCENT,
  },
  applyButtonDisabled: {
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  resetText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  applyText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: ACCENT_DARK,
  },
  applyTextDisabled: {
    color: "rgba(255,255,255,0.65)",
  },
  pressed: {
    opacity: 0.78,
  },
});
