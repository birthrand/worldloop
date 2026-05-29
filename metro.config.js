const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// three ships both a CJS (`three.cjs`) and an ESM (`three.module.js`) build via its
// `exports` map. With Metro package-exports enabled, `import` consumers (our code)
// resolve to the ESM build while `require` consumers (@react-three/fiber/native)
// resolve to the CJS build -> two THREE instances. That breaks instanceof checks and
// crashes the native GL renderer during pan/zoom + camera flights. Pin the bare
// `three` specifier to a single build file so only one instance is ever bundled.
const threeSingleton = path.resolve(
  __dirname,
  "node_modules/three/build/three.module.js",
);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three") {
    return { type: "sourceFile", filePath: threeSingleton };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config);
