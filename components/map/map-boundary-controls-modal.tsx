import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { type ReactNode, useEffect, useState } from "react";
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
  BOUNDARY_STEP_MAX,
  BOUNDARY_STEP_MIN,
  boundaryStyleHasChanges,
  clampBoundaryStep,
  DEFAULT_MAP_BOUNDARY_STYLE,
  displayPercentToFillOpacityStep,
  fillOpacityStepToDisplayPercent,
  type MapBoundaryStyleSettings,
} from "@/constants/map-boundary-style";
import { hexToHue, hueToHex } from "@/lib/color-utils";
import { useMapUiStore } from "@/store/use-map-ui-store";

const ACCENT = "#fbbf24";
const ACCENT_DARK = "#0b132b";
const TRACK_MUTED = "rgba(255,255,255,0.16)";
const THUMB = "#ffffff";

type MapBoundaryControlsModalProps = {
  visible: boolean;
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

type FeatureToggleRowProps = {
  icon: ReactNode;
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

function FeatureToggleRow({
  icon,
  label,
  enabled,
  onChange,
}: FeatureToggleRowProps) {
  return (
    <View style={styles.featureToggleRow}>
      {icon}
      <Text style={styles.featureToggleLabel}>{label}</Text>
      <SettingSwitch
        value={enabled}
        accessibilityLabel={`${label} toggle`}
        onValueChange={onChange}
      />
    </View>
  );
}

type ColorFieldProps = {
  label: string;
  hue: number;
  disabled?: boolean;
  onHueChange: (hue: number) => void;
};

function ColorField({ label, hue, disabled = false, onHueChange }: ColorFieldProps) {
  const previewHex = hueToHex(hue).toUpperCase();
  const [hexDraft, setHexDraft] = useState(previewHex);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [liveHue, setLiveHue] = useState(hue);

  useEffect(() => {
    setHexDraft(previewHex);
    setLiveHue(hue);
  }, [hue, previewHex]);

  const livePreview = hueToHex(liveHue);

  const commitHex = (text: string) => {
    const parsedHue = hexToHue(text);
    if (parsedHue !== null) {
      onHueChange(parsedHue);
    }
  };

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
        <TextInput
          style={[styles.hexInput, disabled && styles.hexInputDisabled]}
          value={hexDraft}
          editable={!disabled}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          accessibilityLabel={`${label} hex value`}
          onChangeText={(text) => {
            const normalized = text.startsWith("#") ? text : `#${text}`;
            setHexDraft(normalized.toUpperCase());
            if (normalized.length === 7) {
              commitHex(normalized);
            }
          }}
          onBlur={() => {
            const parsedHue = hexToHue(hexDraft);
            if (parsedHue === null) {
              setHexDraft(previewHex);
              return;
            }
            commitHex(hexDraft);
          }}
        />
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
}: SliderWithValueProps) {
  const [valueDraft, setValueDraft] = useState(formatDisplay(value));

  useEffect(() => {
    setValueDraft(formatDisplay(value));
  }, [formatDisplay, value]);

  return (
    <View style={styles.sliderControlRow}>
      <View style={styles.sliderColumn}>
        <Slider
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
    </View>
  );
}

export function MapBoundaryControlsModal({
  visible,
  onClose,
}: MapBoundaryControlsModalProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const setBoundaryStyle = useMapUiStore((s) => s.setBoundaryStyle);
  const resetBoundaryStyle = useMapUiStore((s) => s.resetBoundaryStyle);

  const [draft, setDraft] = useState<MapBoundaryStyleSettings>(boundaryStyle);

  useEffect(() => {
    if (visible) {
      setDraft(boundaryStyle);
    }
  }, [boundaryStyle, visible]);

  const hasChanges = boundaryStyleHasChanges(draft, boundaryStyle);
  const boundaryEnabled = draft.strokeColorEnabled;

  const handleApply = () => {
    setBoundaryStyle({
      ...draft,
      strokeThicknessStep: clampBoundaryStep(draft.strokeThicknessStep),
      fillOpacityStep: clampBoundaryStep(draft.fillOpacityStep),
      strokeWidthEnabled: draft.strokeColorEnabled,
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setDraft(DEFAULT_MAP_BOUNDARY_STYLE);
    resetBoundaryStyle();
    onClose();
  };

  const setBoundaryEnabled = (strokeColorEnabled: boolean) => {
    setDraft((current) => ({
      ...current,
      strokeColorEnabled,
      strokeWidthEnabled: strokeColorEnabled,
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close boundary controls"
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Boundary style</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <FeatureToggleRow
              icon={<BoundaryOutlineIcon />}
              label="Boundary"
              enabled={boundaryEnabled}
              onChange={setBoundaryEnabled}
            />
            <FeatureToggleRow
              icon={<FillPatternIcon />}
              label="Fill"
              enabled={draft.fillEnabled}
              onChange={(fillEnabled) =>
                setDraft((current) => ({ ...current, fillEnabled }))
              }
            />

            <ColorField
              label="Boundary color"
              hue={draft.strokeColorHue}
              disabled={!boundaryEnabled}
              onHueChange={(strokeColorHue) =>
                setDraft((current) => ({ ...current, strokeColorHue }))
              }
            />

            <View
              style={[
                styles.settingBlock,
                !boundaryEnabled && styles.settingBlockDisabled,
              ]}
              pointerEvents={boundaryEnabled ? "auto" : "none"}
            >
              <Text style={styles.fieldLabel}>Boundary thickness</Text>
              <SliderWithValue
                value={draft.strokeThicknessStep}
                min={BOUNDARY_STEP_MIN}
                max={BOUNDARY_STEP_MAX}
                unit="px"
                disabled={!boundaryEnabled}
                accessibilityLabel="Boundary thickness"
                tickCount={5}
                formatDisplay={(step) => String(step)}
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
                    strokeThicknessStep: clampBoundaryStep(strokeThicknessStep),
                  }))
                }
              />
            </View>

            <ColorField
              label="Fill color"
              hue={draft.fillColorHue}
              disabled={!draft.fillEnabled}
              onHueChange={(fillColorHue) =>
                setDraft((current) => ({ ...current, fillColorHue }))
              }
            />

            <View
              style={[
                styles.settingBlock,
                !draft.fillEnabled && styles.settingBlockDisabled,
              ]}
              pointerEvents={draft.fillEnabled ? "auto" : "none"}
            >
              <Text style={styles.fieldLabel}>Fill opacity</Text>
              <SliderWithValue
                value={draft.fillOpacityStep}
                min={BOUNDARY_STEP_MIN}
                max={BOUNDARY_STEP_MAX}
                unit="%"
                disabled={!draft.fillEnabled}
                accessibilityLabel="Fill opacity"
                tickCount={0}
                endLabels={["0%", "50%", "100%"]}
                formatDisplay={(step) =>
                  String(fillOpacityStepToDisplayPercent(step))
                }
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
          </ScrollView>

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
    maxHeight: "90%",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
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
    gap: 14,
    paddingBottom: 8,
  },
  featureToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
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
    gap: 8,
  },
  settingBlockDisabled: {
    opacity: 0.42,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.62)",
  },
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorSwatchSquare: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  colorSwatchSquareDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  hexInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  hexInputDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  eyedropperButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
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
    height: 40,
    marginTop: 2,
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
    height: 36,
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
  },
  sliderEndLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.45)",
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
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
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
