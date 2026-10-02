const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Lets `require()` calls wrapped in try/catch point at packages that are not
// installed (used for the optional expo-print / expo-sharing PDF download)
// instead of failing the whole bundle.
config.transformer = { ...config.transformer, allowOptionalDependencies: true };

module.exports = withNativeWind(config, { input: './global.css' });
