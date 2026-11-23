import { createContext, useContext, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Icon, type IconName } from "./Icon";

export const light = {
  bg: "#f7f4ec",
  surface: "#fffdf8",
  secondary: "#eeeee4",
  text: "#26342c",
  muted: "#788078",
  line: "#e3e2d8",
  sage: "#627d69",
  soft: "#dfe9df",
  terra: "#c37352",
};
export const night = {
  bg: "#171d19",
  surface: "#202823",
  secondary: "#29322c",
  text: "#f2efe6",
  muted: "#a5aea7",
  line: "#354038",
  sage: "#91ad97",
  soft: "#33443a",
  terra: "#d58b69",
};
export const Theme = createContext(light);
export const useColors = () => useContext(Theme);
export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  grow: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
});
export function T({
  children,
  size = 15,
  bold = false,
  color,
  title = false,
}: {
  children: ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  title?: boolean;
}) {
  const c = useColors();
  return (
    <Text
      style={{
        color: color ?? c.text,
        fontSize: size,
        fontFamily: title ? "Manrope" : bold ? "DMBold" : "DM",
        letterSpacing: title ? -size * 0.035 : 0,
      }}
    >
      {children}
    </Text>
  );
}
export function Box({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 17,
          padding: 15,
          gap: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  children,
  onPress,
  label,
  style,
  disabled = false,
  selected,
}: {
  children: ReactNode;
  onPress: () => void;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.center,
        { padding: 11, minHeight: 44, borderRadius: 12 },
        style,
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function Badge({
  name,
  size = 34,
  color,
  background,
}: {
  name: IconName;
  size?: number;
  color?: string;
  background?: string;
}) {
  const c = useColors();
  return (
    <View
      style={[
        s.center,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: background ?? c.soft,
        },
      ]}
    >
      <Icon name={name} color={color ?? c.sage} size={size * 0.54} />
    </View>
  );
}
export function Header({
  caption,
  title,
  children,
}: {
  caption: string;
  title: string;
  children?: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={s.between}>
      <View style={s.grow}>
        <T size={13} color={c.muted}>
          {caption}
        </T>
        <T title size={27}>
          {title}
        </T>
      </View>
      {children}
    </View>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  const c = useColors();
  return (
    <Box
      style={{
        minHeight: 170,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.bg,
        borderStyle: "dashed",
        gap: 4,
      }}
    >
      <Badge name="check" size={38} />
      <T bold>{title}</T>
        <T size={13} color={c.muted}>
        {detail}
      </T>
    </Box>
  );
}
