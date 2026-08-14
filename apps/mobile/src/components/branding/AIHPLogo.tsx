import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";

export function AIHPLogo({
  size = "md",
  onDark = false
}: {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  const scale = size === "sm" ? 0.82 : size === "lg" ? 1.18 : 1;
  const textColor = onDark ? colors.pureWhite : colors.navyInk;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: 42 * scale,
            lineHeight: 46 * scale
          }
        ]}
      >
        A
      </Text>
      <Text
        style={[
          styles.text,
          styles.iText,
          {
            fontSize: 42 * scale,
            lineHeight: 46 * scale
          }
        ]}
      >
        I
      </Text>
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: 42 * scale,
            lineHeight: 46 * scale
          }
        ]}
      >
        HP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  text: {
    fontWeight: "900",
    letterSpacing: 0.8
  },
  iText: {
    color: colors.primary,
    marginHorizontal: 1
  }
});
