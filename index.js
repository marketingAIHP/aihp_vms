import React from "react";
import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

function App() {
  const context = require.context("./apps/mobile/app");
  return <ExpoRoot context={context} />;
}

registerRootComponent(App);
