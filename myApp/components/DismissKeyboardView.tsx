import { Keyboard, TouchableWithoutFeedback, View, ViewStyle } from "react-native";

type DismissKeyboardViewProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Wraps content so that tapping anywhere on the screen (outside focused input) dismisses the keyboard.
 * Use on screens that have TextInput / keyboard.
 */
export function DismissKeyboardView({ children, style }: DismissKeyboardViewProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
