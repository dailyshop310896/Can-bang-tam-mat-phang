import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";

export type SensorStatus =
  | "starting"
  | "permission"
  | "waiting"
  | "ready"
  | "unsupported"
  | "denied"
  | "error";

export type LevelAngles = { x: number; y: number };

type OrientationPermissionApi = { requestPermission?: () => Promise<string> };

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function useLevelSensor() {
  const [angles, setAngles] = useState<LevelAngles>({ x: 0, y: 0 });
  const [status, setStatus] = useState<SensorStatus>("starting");
  const listenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const smoothedRef = useRef<LevelAngles>({ x: 0, y: 0 });

  const publishAngles = useCallback((x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const next = {
      x: smoothedRef.current.x + (x - smoothedRef.current.x) * 0.28,
      y: smoothedRef.current.y + (y - smoothedRef.current.y) * 0.28,
    };
    smoothedRef.current = next;
    setAngles(next);
    setStatus("ready");
  }, []);

  const startWebSensor = useCallback(async () => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const browserWindow = window as Window & {
      DeviceOrientationEvent?: OrientationPermissionApi;
    };
    const orientationApi = browserWindow.DeviceOrientationEvent;
    if (!orientationApi) {
      setStatus("unsupported");
      return;
    }

    if (orientationApi.requestPermission) {
      try {
        const result = await orientationApi.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      } catch {
        setStatus("denied");
        return;
      }
    }

    if (listenerRef.current) {
      window.removeEventListener("deviceorientation", listenerRef.current);
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      publishAngles(event.gamma, event.beta);
    };
    listenerRef.current = onOrientation;
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    setStatus("waiting");
  }, [publishAngles]);

  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        setStatus("unsupported");
        return;
      }
      const browserWindow = window as Window & {
        DeviceOrientationEvent?: OrientationPermissionApi;
      };
      const orientationApi = browserWindow.DeviceOrientationEvent;
      if (!orientationApi) {
        setStatus("unsupported");
      } else if (orientationApi.requestPermission) {
        setStatus("permission");
      } else {
        void startWebSensor();
      }
      return () => {
        if (listenerRef.current) {
          window.removeEventListener("deviceorientation", listenerRef.current);
          listenerRef.current = null;
        }
      };
    }

    let cancelled = false;
    let subscription: ReturnType<typeof Accelerometer.addListener> | undefined;
    void (async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (cancelled) return;
        if (!available) {
          setStatus("unsupported");
          return;
        }
        Accelerometer.setUpdateInterval(80);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const roll = toDegrees(Math.atan2(x, z));
          const pitch = toDegrees(Math.atan2(-y, Math.sqrt(x * x + z * z)));
          publishAngles(roll, pitch);
        });
        setStatus("waiting");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [publishAngles, startWebSensor]);

  return { angles, status, startWebSensor };
}
