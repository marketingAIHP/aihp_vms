const React = require("react");
const { ExpoRoot } = require("./apps/mobile/node_modules/expo-router");

function App() {
  const context = require.context("./apps/mobile/app");
  return React.createElement(ExpoRoot, { context });
}

module.exports = App;
module.exports.default = App;
