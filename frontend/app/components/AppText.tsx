import { ReactNode } from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";

type AppTextWeight = "regular" | "semibold" | "bold";

type AppTextProps = Omit<TextProps, "style"> & {
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  weight?: AppTextWeight;
};

const fontFamilyByWeight: Record<AppTextWeight, string> = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

export default function AppText({
  weight = "regular",
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: fontFamilyByWeight[weight] }, style]}
    />
  );
}
