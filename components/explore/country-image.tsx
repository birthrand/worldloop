import { Image, type ImageContentFit, type ImageStyle } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type StyleProp } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
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

/** Warm the disk/memory cache so hero swaps do not flash. */
export function prefetchCountryImage(uri: string | undefined) {
  const normalized = uri ? normalizeImageUrl(uri) : null;
  if (!normalized) return;

  void Image.prefetch(normalized, {
    headers: imageSource(normalized).headers,
    cachePolicy: "memory-disk",
  });
}

type CountryImageProps = {
  /** Hero / thumbnail photo URL (Unsplash, Pexels, Wikimedia — not flagcdn). */
  uri: string | undefined;
  /** flagcdn URL — used only for the fallback flag badge. */
  flag: string;
  iso2?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  flagSize?: { width: number; height: number };
};

export function CountryImage({
  uri,
  flag,
  iso2,
  style,
  contentFit = "cover",
  flagSize = { width: 56, height: 38 },
}: CountryImageProps) {
  const normalizedUri = useMemo(
    () => (uri ? normalizeImageUrl(uri) : null),
    [uri],
  );

  /** URI currently painted — stays on the previous photo until the next is cached. */
  const [shownUri, setShownUri] = useState<string | null>(null);
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

    void Image.prefetch(normalizedUri, {
      headers: imageSource(normalizedUri).headers,
      cachePolicy: "memory-disk",
    }).then(() => {
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
    backgroundColor: "#0b132b",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackBehindPhoto: {
    backgroundColor: "transparent",
  },
});
