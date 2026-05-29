import { Asset } from "expo-asset";
import { useEffect, useState } from "react";
import { Image, Platform } from "react-native";
import { SRGBColorSpace, Texture, TextureLoader } from "three";

import { images } from "@/constants/images";

async function resolveBundledAsset(assetModule: number): Promise<Asset> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  return asset;
}

/** Native EXGL path — same payload shape R3F expects (no DOM / expo-three). */
async function loadNativeTexture(assetModule: number): Promise<Texture> {
  const asset = await resolveBundledAsset(assetModule);
  const uri = asset.localUri ?? asset.uri;

  let width = asset.width ?? 0;
  let height = asset.height ?? 0;

  if ((!width || !height) && uri) {
    const size = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
      },
    );
    width = size.width;
    height = size.height;
  }

  const texture = new Texture();
  texture.colorSpace = SRGBColorSpace;
  (texture as Texture & { isDataTexture?: boolean }).isDataTexture = true;
  texture.image = {
    data: asset,
    width,
    height,
  } as unknown as TexImageSource;
  texture.needsUpdate = true;
  return texture;
}

async function loadWebTexture(assetModule: number): Promise<Texture> {
  const asset = await resolveBundledAsset(assetModule);
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("Missing globe texture URI");

  return new Promise((resolve, reject) => {
    new TextureLoader().load(
      uri,
      (map) => {
        map.colorSpace = SRGBColorSpace;
        map.needsUpdate = true;
        resolve(map);
      },
      undefined,
      reject,
    );
  });
}

export async function loadGlobeTextureAsset(
  assetModule: number = images.earthTopography as number,
): Promise<Texture> {
  if (Platform.OS === "web") {
    return loadWebTexture(assetModule);
  }
  return loadNativeTexture(assetModule);
}

/**
 * Loads the equirectangular earth image for the 3D globe.
 * Uses expo-asset + EXGL-native texture payload (no expo-three / DOM APIs).
 */
export function useGlobeTexture() {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let disposed = false;
    let loaded: Texture | null = null;

    void loadGlobeTextureAsset()
      .then((map) => {
        if (disposed) {
          map.dispose();
          return;
        }
        loaded = map;
        setTexture(map);
      })
      .catch((error) => {
        console.warn("[GlobeView] Failed to load earth texture", error);
      });

    return () => {
      disposed = true;
      loaded?.dispose();
    };
  }, []);

  return texture;
}
