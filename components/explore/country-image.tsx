import {
  Image,
  type ImageContentFit,
  type ImageContentPosition,
  type ImageStyle,
} from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type StyleProp } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { EXPLORE_FEED_BODY_BG } from "@/constants/explore-feed-layout";
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
};

export function CountryImage({
  uri,
  flag,
  iso2,
  style,
  contentFit = "cover",
  contentPosition = "center",
  flagSize = { width: 56, height: 38 },
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

  const showFlag = !shownUri && (!normalizedUri || failed);

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

      {shownUri ? (
        <Image
          source={imageSource(shownUri)}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          contentPosition={contentPosition}
          recyclingKey={shownUri}
          cachePolicy="memory-disk"
          transition={{ duration: 200, effect: "cross-dissolve" }}
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: EXPLORE_FEED_BODY_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackBehindPhoto: {
    backgroundColor: "transparent",
  },
});
