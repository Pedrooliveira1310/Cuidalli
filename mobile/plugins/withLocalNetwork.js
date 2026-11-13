const { withAndroidManifest } = require("expo/config-plugins");
module.exports = function withLocalNetwork(config) {
  return withAndroidManifest(config, config => {
    // A validação em src/server.ts restringe HTTP a endereços privados.
    config.modResults.manifest.application[0].$["android:usesCleartextTraffic"] = "true";
    return config;
  });
};
