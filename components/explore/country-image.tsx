import {
  Image,
  type ImageContentFit,
  type ImageContentPosition,
  type ImageStyle,
} from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View, type StyleProp } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { SKELETON_COLOR_HERO } from "@/components/explore/skeleton-bone";
import { EXPLORE_SWIPE_CARD_IMAGE_FALLBACK } from "@/constants/explore-swipe-layout";
import { normalizeImageUrl } from "@/lib/normalize-image-url";

const WIKIMEDIA_HEADERS = {
  "User-Agent": "WorldLoop/1.0 (Expo; country discovery app)",
};

function imageSource(uri: string) {
  return {
    uri,
    headers: uri.includes("wikimedia.org") ? WIKIMEDIA_HEADERS : undefined,
  };
}

const warmedUris = new Set<string>();
const inflightPrefetches = new Map<string, Promise<void>>();

export function isCountryImageReady(uri: string | undefined): boolean {
  const normalized = uri ? normalizeImageUrl(uri) : null;
  return normalized ? warmedUris.has(normalized) : false;
}

/** Warm disk/memory cache; resolves when safe to paint without a navy flash. */
export function prefetchCountryImage(uri: string | undefined): Promise<void> {
  const normalized = uri ? normalizeImageUrl(uri) : null;
  if (!normalized) return Promise.resolve();

  if (warmedUris.has(normalized)) return Promise.resolve();

  const existing = inflightPrefetches.get(normalized);
  if (existing) return existing;

  const promise = Image.prefetch(normalized, {
    headers: imageSource(normalized).headers,
    cachePolicy: "memory-disk",
  })
    .then(() => {
      warmedUris.add(normalized);
    })
    .finally(() => {
      inflightPrefetches.delete(normalized);
    });

  inflightPrefetches.set(normalized, promise);
  return promise;
}

function ImageLoadSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.skeleton, { opacity: pulse }]}
    />
  );
}

type CountryImageProps = {
  /** Hero / thumbnail photo URL (Unsplash, Pexels, Wikimedia — not flagcdn). */
  uri: string | undefined;
  /** flagcdn URL — used only for the fallback flag badge. */
  flag: string;
  iso2?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
  flagSize?: { width: number; height: number };
  showSkeleton?: boolean;
  onLoadStateChange?: (loaded: boolean) => void;
};

export function CountryImage({
  uri,
  flag,
  iso2,
  style,
  contentFit = "cover",
  contentPosition = "center",
  flagSize = { width: 56, height: 38 },
  showSkeleton = false,
  onLoadStateChange,
}: CountryImageProps) {
  const normalizedUri = useMemo(
    () => (uri ? normalizeImageUrl(uri) : null),
    [uri],
  );

  const [shownUri, setShownUri] = useState<string | null>(() => {
    const initial = uri ? normalizeImageUrl(uri) : null;
    return initial && warmedUris.has(initial) ? initial : null;
  });
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!normalizedUri) {
      setShownUri(null);
      setFailed(false);
      return;
    }

    if (normalizedUri === shownUri) {
      return;
    }

    const requestId = ++requestRef.current;
    setFailed(false);

    if (warmedUris.has(normalizedUri)) {
      setShownUri(normalizedUri);
      return;
    }

    void prefetchCountryImage(normalizedUri).then(() => {
      if (requestRef.current !== requestId) return;
      setShownUri(normalizedUri);
    });
  }, [normalizedUri, shownUri]);

  useEffect(() => {
    if (!onLoadStateChange) return;

    if (!normalizedUri || failed) {
      onLoadStateChange(true);
      return;
    }

    if (shownUri === normalizedUri || warmedUris.has(normalizedUri)) {
      onLoadStateChange(true);
      return;
    }

    onLoadStateChange(false);
  }, [failed, normalizedUri, onLoadStateChange, shownUri]);

  const showFlag = !shownUri && (!normalizedUri || failed);
  const showLoadingSkeleton =
    showSkeleton && Boolean(normalizedUri) && !shownUri && !failed;

  return (
    <View style={style} className="overflow-hidden">
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.fallback,
          shownUri ? styles.fallbackBehindPhoto : null,
        ]}
      >
        {showFlag ? (
          <FlagBadge
            flag={flag}
            iso2={iso2}
            width={flagSize.width}
            height={flagSize.height}
          />
        ) : null}
      </View>

      {showLoadingSkeleton ? <ImageLoadSkeleton /> : null}

      {shownUri ? (
        <Image
          source={imageSource(shownUri)}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          contentPosition={contentPosition}
          recyclingKey={shownUri}
          cachePolicy="memory-disk"
          transition={
            warmedUris.has(shownUri)
              ? undefined
              : { duration: 200, effect: "cross-dissolve" }
          }
          onLoad={() => onLoadStateChange?.(true)}
          onError={() => {
            setFailed(true);
            onLoadStateChange?.(true);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackBehindPhoto: {
    backgroundColor: "transparent",
  },
  skeleton: {
    backgroundColor: SKELETON_COLOR_HERO,
  },
});
