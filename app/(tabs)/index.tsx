import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Circle, Line } from "react-native-svg";
import { ScreenContainer } from "@/components/screen-container";
import { useLevelSensor, type LevelAngles, type SensorStatus } from "@/hooks/use-level-sensor";

type Mode = "center" | "plane";
type PlaneAxis = "x" | "y";

const colors = {
  canvas: "#F2F4EF",
  ink: "#19231F",
  secondary: "#52605A",
  muted: "#87928B",
  line: "#E0E5DD",
  card: "#18231E",
  cardElevated: "#223129",
  acid: "#D4F268",
  softWhite: "#F8FAF6",
};

const thresholds = [0.2, 0.5, 1, 2];
const wrapAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const signedAngle = (angle: number) => `${angle > 0 ? "+" : angle < 0 ? "−" : ""}${Math.abs(angle).toFixed(1)}°`;

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.34 }]}>
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="8.2" fill="none" stroke={colors.ink} strokeWidth="1.7" />
        <Line x1="3.2" y1="12" x2="20.8" y2="12" stroke={colors.ink} strokeWidth="1.3" />
        <Line x1="12" y1="3.2" x2="12" y2="20.8" stroke={colors.ink} strokeWidth="1.3" />
        <Circle cx="12" cy="12" r="2.2" fill={colors.ink} />
      </Svg>
    </View>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.modeSwitch} accessibilityRole="tablist" accessibilityLabel="Chế độ đo">
      <ModeOption active={mode === "center"} icon="adjust" label="Lấy tâm" onPress={() => onChange("center")} />
      <ModeOption active={mode === "plane"} icon="straighten" label="Mặt phẳng" onPress={() => onChange("plane")} />
    </View>
  );
}

function PlaneAxisSwitch({ axis, onChange }: { axis: PlaneAxis; onChange: (axis: PlaneAxis) => void }) {
  return (
    <View style={styles.axisTabSwitch} accessibilityRole="tablist" accessibilityLabel="Chọn trục cần căn">
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: axis === "x" }} onPress={() => onChange("x")} style={[styles.axisTabOption, axis === "x" && styles.axisTabOptionActive]}>
        <MaterialIcons name="swap-horiz" size={18} color={axis === "x" ? colors.ink : "#A1AEA3"} />
        <View>
          <Text style={[styles.axisTabLabel, axis === "x" && styles.axisTabLabelActive]}>TRỤC X</Text>
          <Text style={[styles.axisTabCaption, axis === "x" && styles.axisTabCaptionActive]}>NGANG</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: axis === "y" }} onPress={() => onChange("y")} style={[styles.axisTabOption, axis === "y" && styles.axisTabOptionActive]}>
        <MaterialIcons name="swap-vert" size={18} color={axis === "y" ? colors.ink : "#A1AEA3"} />
        <View>
          <Text style={[styles.axisTabLabel, axis === "y" && styles.axisTabLabelActive]}>TRỤC Y</Text>
          <Text style={[styles.axisTabCaption, axis === "y" && styles.axisTabCaptionActive]}>DỌC</Text>
        </View>
      </Pressable>
    </View>
  );
}

function ModeOption({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeOption, active && styles.modeOptionActive]}>
      <MaterialIcons name={icon} size={18} color={active ? colors.softWhite : colors.secondary} />
      <Text style={[styles.modeOptionText, active && styles.modeOptionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SensorStatusCard({ status, isHeld, onStart }: { status: SensorStatus; isHeld: boolean; onStart: () => void }) {
  const config = useMemo(() => {
    if (status === "ready") {
      return { title: isHeld ? "Đang giữ kết quả" : "Cảm biến đang hoạt động", detail: "Nghiêng nhẹ thiết bị để căn chỉnh.", icon: isHeld ? "pause-circle-outline" : "sensors", tone: "ready" as const };
    }
    if (status === "permission") {
      return { title: "Cần cấp quyền cảm biến", detail: "Chạm nút bên dưới để cho phép đo chuyển động.", icon: "screen-rotation", tone: "notice" as const };
    }
    if (status === "denied") {
      return { title: "Chưa được cấp quyền", detail: "Hãy bật quyền Motion & Orientation trong cài đặt trình duyệt.", icon: "lock-outline", tone: "warning" as const };
    }
    if (status === "unsupported") {
      return { title: "Không tìm thấy cảm biến", detail: "Mở ứng dụng trên điện thoại có cảm biến chuyển động để đo chính xác.", icon: "sensors-off", tone: "warning" as const };
    }
    if (status === "error") {
      return { title: "Chưa thể đọc cảm biến", detail: "Kiểm tra quyền thiết bị rồi thử kết nối lại.", icon: "error-outline", tone: "warning" as const };
    }
    return { title: "Đang tìm cảm biến…", detail: "Giữ thiết bị ổn định trong giây lát.", icon: "sensors", tone: "notice" as const };
  }, [isHeld, status]);

  return (
    <View style={[styles.sensorStatus, config.tone === "warning" && styles.sensorStatusWarning]}>
      <View style={[styles.statusIcon, config.tone === "ready" ? styles.statusIconReady : styles.statusIconQuiet]}>
        <MaterialIcons name={config.icon as ComponentProps<typeof MaterialIcons>["name"]} size={19} color={config.tone === "ready" ? colors.acid : colors.secondary} />
      </View>
      <View style={styles.statusCopy}>
        <View style={styles.statusHeadingRow}>
          <Text style={styles.statusTitle}>{config.title}</Text>
          {status === "ready" && !isHeld ? <View style={styles.liveDot} /> : null}
        </View>
        <Text style={styles.statusDetail}>{config.detail}</Text>
      </View>
      {(status === "permission" || status === "denied" || status === "waiting" || status === "error") && Platform.OS === "web" ? (
        <Pressable accessibilityRole="button" onPress={onStart} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>{status === "permission" ? "Cho phép" : "Thử lại"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CenterInstrument({ angles, active, size }: { angles: LevelAngles; active: boolean; size: number }) {
  const center = size / 2;
  const radius = size * 0.384;
  const dx = clamp(angles.x / 11, -1, 1) * radius * 0.73;
  const dy = clamp(angles.y / 11, -1, 1) * radius * -0.73;
  const labelColor = active ? "#E4EAE2" : "#AAB4AC";

  return (
    <View style={[styles.centerInstrument, { width: size, height: size }]} accessibilityLabel="Thước thủy tròn">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius + size * 0.018} fill="#1D2A23" />
        <Circle cx={center} cy={center} r={radius} fill="none" stroke="#526258" strokeWidth="1.3" />
        <Circle cx={center} cy={center} r={radius * 0.69} fill="none" stroke="#39483F" strokeWidth="1" />
        <Circle cx={center} cy={center} r={radius * 0.38} fill="none" stroke="#39483F" strokeWidth="1" />
        <Line x1={center - radius - 18} y1={center} x2={center + radius + 18} y2={center} stroke="#506057" strokeWidth="1" />
        <Line x1={center} y1={center - radius - 18} x2={center} y2={center + radius + 18} stroke="#506057" strokeWidth="1" />
        <Line x1={center - 9} y1={center} x2={center + 9} y2={center} stroke={colors.acid} strokeWidth="1.5" />
        <Line x1={center} y1={center - 9} x2={center} y2={center + 9} stroke={colors.acid} strokeWidth="1.5" />
        <Circle cx={center} cy={center} r="3" fill={colors.acid} />
        <Circle
          cx={center + dx}
          cy={center + dy}
          r={size * 0.0685}
          fill={active ? colors.acid : "#8D9B91"}
          fillOpacity={active ? 0.96 : 0.62}
          stroke={active ? "#F1FFC2" : "#CAD1CB"}
          strokeWidth="2"
        />
        <Circle cx={center + dx - size * 0.02} cy={center + dy - size * 0.02} r={size * 0.014} fill="#FFFFFF" fillOpacity="0.42" />
      </Svg>
      <View style={[styles.edgeLabelLeft, { left: size * 0.03, top: size * 0.474 }]}>
        <Text style={[styles.edgeLabel, { color: labelColor }]}>X</Text>
      </View>
      <View style={[styles.edgeLabelTop, { top: size * 0.015, left: size / 2 - 4 }]}>
        <Text style={[styles.edgeLabel, { color: labelColor }]}>Y</Text>
      </View>
    </View>
  );
}

function AxisMeter({ label, direction, angle, active, vertical = false }: { label: string; direction: string; angle: number; active: boolean; vertical?: boolean }) {
  const normalizedAngle = clamp(angle / 12, -1, 1) * 45;
  const marker = `${vertical ? 50 - normalizedAngle : 50 + normalizedAngle}%` as `${number}%`;
  return (
    <View style={styles.axisMeter}>
      <View style={styles.axisHeader}>
        <View>
          <Text style={styles.axisTitle}>{label}</Text>
          <Text style={styles.axisDirection}>{direction}</Text>
        </View>
        <Text style={[styles.axisValue, active ? styles.axisValueActive : styles.axisValueInactive]}>{active ? signedAngle(angle) : "—.—°"}</Text>
      </View>
      {vertical ? (
        <View style={styles.axisVerticalRuler}>
          <View style={styles.axisVerticalScale}>
            <Text style={styles.axisScaleTextVertical}>+10°</Text>
            <Text style={styles.axisScaleTextVertical}>0°</Text>
            <Text style={styles.axisScaleTextVertical}>−10°</Text>
          </View>
          <View style={styles.axisTrackVertical}>
            <View style={styles.axisTrackLineVertical} />
            {[10, 30, 50, 70, 90].map((point) => <View key={point} style={[styles.axisTickVertical, { top: `${point}%` as `${number}%` }]} />)}
            <View style={styles.axisZeroVertical} />
            <View style={[styles.axisMarkerHaloVertical, { top: marker }, !active && styles.axisMarkerDisabled]} />
            <View style={[styles.axisMarkerVertical, { top: marker }, !active && styles.axisMarkerDisabled]} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.axisTrack}>
            <View style={styles.axisTrackLine} />
            {[10, 30, 50, 70, 90].map((point) => <View key={point} style={[styles.axisTick, { left: `${point}%` as `${number}%` }]} />)}
            <View style={[styles.axisMarkerHalo, { left: marker }, !active && styles.axisMarkerDisabled]} />
            <View style={[styles.axisMarker, { left: marker }, !active && styles.axisMarkerDisabled]} />
            <View style={styles.axisZero} />
          </View>
          <View style={styles.axisScale}>
            <Text style={styles.axisScaleText}>−10°</Text>
            <Text style={styles.axisScaleText}>0°</Text>
            <Text style={styles.axisScaleText}>+10°</Text>
          </View>
        </>
      )}
    </View>
  );
}

function AngleReadout({ label, axis, angle, active }: { label: string; axis: string; angle: number; active: boolean }) {
  return (
    <View style={styles.angleReadout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <View style={styles.readoutValueRow}>
        <Text style={[styles.readoutValue, !active && styles.readoutValueMuted]}>{active ? signedAngle(angle) : "—.—°"}</Text>
        <Text style={styles.readoutAxis}>{axis}</Text>
      </View>
    </View>
  );
}

function ActionButton({ icon, label, onPress, active = false, disabled = false }: {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, active && styles.actionButtonActive, disabled && styles.actionButtonDisabled, pressed && !disabled && styles.pressed]}
    >
      <MaterialIcons name={icon} size={20} color={active ? colors.ink : colors.secondary} />
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SettingsSheet({ visible, threshold, onThresholdChange, onReset, onClose }: {
  visible: boolean;
  threshold: number;
  onThresholdChange: (value: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} accessibilityLabel="Đóng cài đặt" />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeading}>
            <View>
              <Text style={styles.sheetEyebrow}>TÙY CHỈNH DỤNG CỤ</Text>
              <Text style={styles.sheetTitle}>Độ chính xác</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={21} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={styles.sheetLabel}>Ngưỡng nhận biết cân bằng</Text>
          <Text style={styles.sheetDescription}>Độ lệch nhỏ hơn ngưỡng sẽ được tính là cân bằng.</Text>
          <View style={styles.thresholdRow}>
            {thresholds.map((value) => {
              const selected = value === threshold;
              return (
                <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onThresholdChange(value)} style={[styles.thresholdOption, selected && styles.thresholdOptionSelected]}>
                  <Text style={[styles.thresholdValue, selected && styles.thresholdValueSelected]}>{value.toFixed(value < 1 ? 1 : 0)}°</Text>
                  <Text style={[styles.thresholdHint, selected && styles.thresholdHintSelected]}>{value <= 0.5 ? "Chính xác" : value === 1 ? "Tiêu chuẩn" : "Thoáng"}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sheetDivider} />
          <Pressable accessibilityRole="button" onPress={() => { onReset(); onClose(); }} style={styles.resetButton}>
            <View style={styles.resetIcon}><MaterialIcons name="restart-alt" size={20} color={colors.secondary} /></View>
            <View style={styles.resetCopy}>
              <Text style={styles.resetTitle}>Khôi phục mốc mặc định</Text>
              <Text style={styles.resetSubtitle}>Đưa độ nghiêng tham chiếu về 0°</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <Text style={styles.sheetFootnote}>Mốc hiệu chuẩn hiện tại chỉ lưu trong phiên đo này.</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const splitLayout = width >= 820 || (width > height && width >= 700);
  const instrumentSize = Math.max(210, Math.min(292, splitLayout ? width - 456 : width - 78));
  const { angles: rawAngles, status, startWebSensor } = useLevelSensor();
  const [mode, setMode] = useState<Mode>("center");
  const [planeAxis, setPlaneAxis] = useState<PlaneAxis>("y");
  const [baseline, setBaseline] = useState<LevelAngles>({ x: 0, y: 0 });
  const [heldAngles, setHeldAngles] = useState<LevelAngles | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const previousBalanced = useRef(false);

  const liveAngles = useMemo(
    () => ({ x: wrapAngle(rawAngles.x - baseline.x), y: wrapAngle(rawAngles.y - baseline.y) }),
    [baseline, rawAngles.x, rawAngles.y],
  );
  const shownAngles = heldAngles ?? liveAngles;
  const sensorActive = status === "ready";
  const balanced = sensorActive && Math.abs(shownAngles.x) <= threshold && Math.abs(shownAngles.y) <= threshold;

  useEffect(() => {
    if (balanced && !previousBalanced.current) {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate([35, 35, 55]);
        }
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    }
    previousBalanced.current = balanced;
  }, [balanced]);

  const toggleHold = () => setHeldAngles((current) => current ? null : { x: liveAngles.x, y: liveAngles.y });
  const calibrate = () => {
    if (!sensorActive || heldAngles) return;
    setBaseline({ x: rawAngles.x, y: rawAngles.y });
  };
  const restoreDefault = () => setBaseline({ x: 0, y: 0 });
  const connectionStatus = sensorActive
    ? heldAngles ? "ĐANG GIỮ" : balanced ? "ĐÃ CÂN BẰNG" : "ĐANG ĐO"
    : "CHỜ CẢM BIẾN";

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} style={styles.safeArea} containerClassName="bg-[#F2F4EF]" className="bg-[#F2F4EF]">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.scrollContent, splitLayout && styles.scrollContentWide]} showsVerticalScrollIndicator={false}>
        <View style={[styles.pageContent, splitLayout && styles.pageContentWide]}>
          <View style={[styles.introColumn, splitLayout && styles.introColumnWide]}>
            <View style={styles.topBar}>
              <View style={styles.brandLockup}>
                <BrandMark />
                <View>
                  <Text style={styles.brandName}>CÂN BẰNG</Text>
                  <Text style={styles.brandCaption}>DỤNG CỤ CĂN CHỈNH</Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cài đặt độ chính xác" onPress={() => setSettingsVisible(true)} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
                <MaterialIcons name="tune" size={21} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.introBlock}>
              <View style={styles.eyebrowRow}><View style={styles.eyebrowRule} /><Text style={styles.eyebrow}>ĐO CHUẨN, CĂN NHẸ</Text></View>
              <Text style={styles.headline}>Tìm đúng tâm.{"\n"}Giữ đúng mặt phẳng.</Text>
              <Text style={styles.subheadline}>Đặt điện thoại lên bề mặt cần căn chỉnh.</Text>
            </View>

            <ModeSwitch mode={mode} onChange={setMode} />
            {splitLayout ? (
              <View style={styles.landscapeTip}>
                <MaterialIcons name="screen-rotation-alt" size={18} color={colors.secondary} />
                <Text style={styles.landscapeTipText}>Chọn tab trục X hoặc Y để căn từng hướng trên mặt phẳng.</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.measureColumn, splitLayout && styles.measureColumnWide]}>
            <SensorStatusCard status={status} isHeld={Boolean(heldAngles)} onStart={() => void startWebSensor()} />

            <View style={styles.instrumentCard}>
              <View style={styles.instrumentHeading}>
                <View>
                  <Text style={styles.instrumentEyebrow}>{mode === "center" ? "THƯỚC THỦY TRÒN" : `THƯỚC TRỤC ${planeAxis.toUpperCase()}`}</Text>
                  <Text style={styles.instrumentTitle}>{mode === "center" ? "Căn vào tâm" : planeAxis === "x" ? "Căn ngang" : "Căn dọc"}</Text>
                </View>
                <View style={[styles.instrumentState, balanced && styles.instrumentStateBalanced]}>
                  <View style={[styles.stateDot, balanced && styles.stateDotBalanced]} />
                  <Text style={[styles.stateText, balanced && styles.stateTextBalanced]}>{connectionStatus}</Text>
                </View>
              </View>

              {mode === "center" ? (
                <CenterInstrument angles={shownAngles} active={sensorActive} size={instrumentSize} />
              ) : (
                <View style={styles.planeInstrument}>
                  <PlaneAxisSwitch axis={planeAxis} onChange={setPlaneAxis} />
                  <AxisMeter
                    label={planeAxis === "x" ? "TRỤC X" : "TRỤC Y"}
                    direction={planeAxis === "x" ? "Nghiêng ngang" : "Nghiêng dọc"}
                    angle={shownAngles[planeAxis]}
                    active={sensorActive}
                    vertical={planeAxis === "y"}
                  />
                </View>
              )}

              {mode === "plane" ? (
                <View style={styles.readoutRow}>
                  <AngleReadout label={planeAxis === "x" ? "NGANG" : "DỌC"} axis={planeAxis.toUpperCase()} angle={shownAngles[planeAxis]} active={sensorActive} />
                  <View style={styles.readoutDivider} />
                  <View style={styles.thresholdReadout}>
                    <Text style={styles.readoutLabel}>SAI SỐ</Text>
                    <Text style={styles.thresholdReadoutValue}>±{threshold.toFixed(threshold < 1 ? 1 : 0)}°</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.readoutRow}>
                  <AngleReadout label="NGANG" axis="X" angle={shownAngles.x} active={sensorActive} />
                  <View style={styles.readoutDivider} />
                  <AngleReadout label="DỌC" axis="Y" angle={shownAngles.y} active={sensorActive} />
                  <View style={styles.readoutDivider} />
                  <View style={styles.thresholdReadout}>
                    <Text style={styles.readoutLabel}>SAI SỐ</Text>
                    <Text style={styles.thresholdReadoutValue}>±{threshold.toFixed(threshold < 1 ? 1 : 0)}°</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.actionRow}>
              <ActionButton icon="my-location" label="Hiệu chuẩn" onPress={calibrate} disabled={!sensorActive || Boolean(heldAngles)} />
              <ActionButton icon={heldAngles ? "play-arrow" : "pause"} label={heldAngles ? "Tiếp tục đo" : "Giữ số đo"} onPress={toggleHold} active={Boolean(heldAngles)} disabled={!sensorActive && !heldAngles} />
            </View>

            <View style={[styles.balanceHint, balanced && styles.balanceHintActive]}>
              <View style={[styles.balanceHintMark, balanced && styles.balanceHintMarkActive]}>
                <MaterialIcons name={balanced ? "check" : "info-outline"} size={17} color={balanced ? colors.ink : colors.secondary} />
              </View>
              <Text style={[styles.balanceHintText, balanced && styles.balanceHintTextActive]}>
                {balanced
                  ? "Tốt lắm — bề mặt đã nằm trong ngưỡng cân bằng."
                  : sensorActive
                    ? "Đưa bong bóng về vòng tâm; rung báo khi đạt ngưỡng."
                    : "Chỉ số sẽ xuất hiện khi cảm biến chuyển động được bật."}
              </Text>
            </View>
            <Text style={styles.sessionNote}>Đo theo thời gian thực · Mốc hiệu chuẩn chỉ lưu trong phiên này</Text>
          </View>
        </View>
      </ScrollView>

      <SettingsSheet visible={settingsVisible} threshold={threshold} onThresholdChange={setThreshold} onReset={restoreDefault} onClose={() => setSettingsVisible(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  scrollContentWide: { alignItems: "center", paddingHorizontal: 28, paddingTop: 20 },
  pageContent: { width: "100%", maxWidth: 540, alignSelf: "center", gap: 20 },
  pageContentWide: { maxWidth: 1100, flexDirection: "row", alignItems: "center", gap: 34, flex: 1 },
  introColumn: { gap: 20 },
  introColumnWide: { width: 330, justifyContent: "center", paddingVertical: 24 },
  measureColumn: { gap: 14 },
  measureColumnWide: { flex: 1, maxWidth: 650, alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: { backgroundColor: colors.acid, alignItems: "center", justifyContent: "center" },
  brandName: { color: colors.ink, fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  brandCaption: { marginTop: 3, color: colors.muted, fontSize: 8, fontWeight: "700", letterSpacing: 1.2 },
  settingsButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#E7EBE4", alignItems: "center", justifyContent: "center" },
  introBlock: { gap: 9, paddingTop: 5 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrowRule: { width: 19, height: 2, backgroundColor: "#9DB453", borderRadius: 2 },
  eyebrow: { color: "#66745C", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  headline: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -0.9 },
  subheadline: { color: colors.secondary, fontSize: 13, lineHeight: 19 },
  modeSwitch: { minHeight: 52, flexDirection: "row", backgroundColor: "#E7EBE5", borderRadius: 17, padding: 4, gap: 4 },
  modeOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 10 },
  modeOptionActive: { backgroundColor: colors.ink },
  modeOptionText: { color: colors.secondary, fontSize: 12, fontWeight: "700" },
  modeOptionTextActive: { color: colors.softWhite },
  axisTabSwitch: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 15, backgroundColor: "#101914" },
  axisTabOption: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 11 },
  axisTabOptionActive: { backgroundColor: colors.acid },
  axisTabLabel: { color: "#D3DAD3", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  axisTabLabelActive: { color: colors.ink },
  axisTabCaption: { color: "#A1AEA3", fontSize: 8, marginTop: 2, fontWeight: "700", letterSpacing: 0.8 },
  axisTabCaptionActive: { color: "#52604A" },
  landscapeTip: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 14, backgroundColor: "#E8ECE5" },
  landscapeTipText: { flex: 1, color: colors.secondary, fontSize: 11, lineHeight: 16 },
  sensorStatus: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16, backgroundColor: "#E7EBE4" },
  sensorStatusWarning: { backgroundColor: "#F4E8E1" },
  statusIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusIconReady: { backgroundColor: colors.ink },
  statusIconQuiet: { backgroundColor: "#DCE2DA" },
  statusCopy: { flex: 1, gap: 3 },
  statusHeadingRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  statusDetail: { color: colors.secondary, fontSize: 10, lineHeight: 14 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#6F9D35" },
  permissionButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: colors.ink },
  permissionButtonText: { color: colors.softWhite, fontSize: 10, fontWeight: "800" },
  instrumentCard: { overflow: "hidden", backgroundColor: colors.card, borderRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, boxShadow: "0px 10px 18px rgba(29, 42, 35, 0.12)" },
  instrumentHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  instrumentEyebrow: { color: "#A1AEA3", fontSize: 8, fontWeight: "800", letterSpacing: 1.3 },
  instrumentTitle: { color: colors.softWhite, fontSize: 16, fontWeight: "800", marginTop: 4 },
  instrumentState: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.cardElevated, borderRadius: 99 },
  instrumentStateBalanced: { backgroundColor: colors.acid },
  stateDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#D9A35F" },
  stateDotBalanced: { backgroundColor: colors.ink },
  stateText: { color: "#CCD5CD", fontSize: 7, letterSpacing: 0.5, fontWeight: "900" },
  stateTextBalanced: { color: colors.ink },
  centerInstrument: { alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 1, marginBottom: 2 },
  edgeLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  edgeLabelLeft: { position: "absolute" },
  edgeLabelTop: { position: "absolute" },
  readoutRow: { flexDirection: "row", alignItems: "center", paddingTop: 13, borderTopWidth: 1, borderTopColor: "#35443A" },
  angleReadout: { flex: 1, gap: 5 },
  readoutLabel: { color: "#9FAA9F", fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  readoutValueRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  readoutValue: { color: colors.softWhite, fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: -0.6 },
  readoutValueMuted: { color: "#78877B" },
  readoutAxis: { color: "#9FAA9F", fontSize: 8, fontWeight: "800" },
  readoutDivider: { width: 1, height: 28, backgroundColor: "#35443A", marginHorizontal: 13 },
  thresholdReadout: { width: 46, alignItems: "flex-end", gap: 5 },
  thresholdReadoutValue: { color: colors.acid, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  planeInstrument: { paddingTop: 18, paddingBottom: 20, gap: 24 },
  axisMeter: { paddingVertical: 5 },
  axisHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  axisTitle: { color: colors.softWhite, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  axisDirection: { color: "#A1AEA3", fontSize: 9, marginTop: 4 },
  axisValue: { fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: -0.6 },
  axisValueActive: { color: colors.acid },
  axisValueInactive: { color: "#78877B" },
  axisTrack: { height: 28, justifyContent: "center" },
  axisTrackLine: { position: "absolute", left: 0, right: 0, height: 4, borderRadius: 4, backgroundColor: "#35443A" },
  axisTick: { position: "absolute", width: 1, height: 10, backgroundColor: "#7D897E", top: 9 },
  axisZero: { position: "absolute", width: 1, height: 19, left: "50%", top: 4, backgroundColor: "#CFD8CE" },
  axisMarkerHalo: { position: "absolute", width: 22, height: 22, borderRadius: 11, marginLeft: -11, top: 3, backgroundColor: colors.acid, opacity: 0.22 },
  axisMarker: { position: "absolute", width: 12, height: 12, borderRadius: 6, marginLeft: -6, top: 8, backgroundColor: colors.acid, borderWidth: 2, borderColor: "#F4FFC9" },
  axisMarkerDisabled: { backgroundColor: "#849087", borderColor: "#B6C0B7", opacity: 0.58 },
  axisScale: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  axisScaleText: { color: "#89968C", fontSize: 8, fontVariant: ["tabular-nums"] },
  axisVerticalRuler: { flexDirection: "row", alignSelf: "center", alignItems: "stretch", gap: 12, height: 240 },
  axisVerticalScale: { justifyContent: "space-between", alignItems: "flex-end", paddingVertical: 1 },
  axisScaleTextVertical: { color: "#89968C", fontSize: 8, fontVariant: ["tabular-nums"], width: 30, textAlign: "right" },
  axisTrackVertical: { position: "relative", width: 28, height: 240 },
  axisTrackLineVertical: { position: "absolute", top: 0, bottom: 0, left: 12, width: 4, borderRadius: 4, backgroundColor: "#35443A" },
  axisTickVertical: { position: "absolute", width: 10, height: 1, left: 9, backgroundColor: "#7D897E" },
  axisZeroVertical: { position: "absolute", width: 20, height: 1, left: 4, top: "50%", backgroundColor: "#CFD8CE" },
  axisMarkerHaloVertical: { position: "absolute", width: 22, height: 22, borderRadius: 11, marginLeft: -11, marginTop: -11, left: "50%", backgroundColor: colors.acid, opacity: 0.22 },
  axisMarkerVertical: { position: "absolute", width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6, left: "50%", backgroundColor: colors.acid, borderWidth: 2, borderColor: "#F4FFC9" },
  actionRow: { flexDirection: "row", gap: 11 },
  actionButton: { flex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#E7EBE4", borderWidth: 1, borderColor: "#E0E5DD" },
  actionButtonActive: { backgroundColor: colors.acid, borderColor: colors.acid },
  actionButtonDisabled: { opacity: 0.48 },
  actionLabel: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  actionLabelActive: { color: colors.ink },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  balanceHint: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "#E8ECE5" },
  balanceHintActive: { backgroundColor: "#E5F0CB" },
  balanceHintMark: { width: 25, height: 25, borderRadius: 9, backgroundColor: "#DAE1D7", alignItems: "center", justifyContent: "center" },
  balanceHintMarkActive: { backgroundColor: colors.acid },
  balanceHintText: { flex: 1, color: colors.secondary, fontSize: 10, lineHeight: 15, fontWeight: "600" },
  balanceHintTextActive: { color: colors.ink },
  sessionNote: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: "center", paddingHorizontal: 5 },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14, 20, 17, 0.30)" },
  modalScrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  sheet: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: Platform.OS === "web" ? 30 : 38, backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#CDD4CA", alignSelf: "center", marginBottom: 21 },
  sheetHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  sheetEyebrow: { color: "#72806A", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800", marginTop: 5 },
  closeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#E5E9E2" },
  sheetLabel: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  sheetDescription: { color: colors.secondary, fontSize: 11, marginTop: 5, marginBottom: 15 },
  thresholdRow: { flexDirection: "row", gap: 8 },
  thresholdOption: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: "#F9FAF7" },
  thresholdOptionSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  thresholdValue: { color: colors.ink, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  thresholdValueSelected: { color: colors.acid },
  thresholdHint: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  thresholdHintSelected: { color: "#D4DDD5" },
  sheetDivider: { height: 1, backgroundColor: colors.line, marginVertical: 20 },
  resetButton: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 },
  resetIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#E5E9E2" },
  resetCopy: { flex: 1, gap: 4 },
  resetTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  resetSubtitle: { color: colors.secondary, fontSize: 9 },
  sheetFootnote: { color: colors.muted, fontSize: 9, textAlign: "center", marginTop: 20 },
});
