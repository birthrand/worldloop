// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // @react-three/fiber uses Three.js props on JSX primitives (mesh, materials, etc.)
      'react/no-unknown-property': [
        'warn',
        {
          ignore: [
            'attach',
            'args',
            'map',
            'emissive',
            'emissiveIntensity',
            'roughness',
            'metalness',
            'transparent',
            'depthWrite',
            'depthTest',
            'side',
            'geometry',
            'object',
            'intensity',
            'position',
            'castShadow',
            'receiveShadow',
          ],
        },
      ],
    },
  },
]);
