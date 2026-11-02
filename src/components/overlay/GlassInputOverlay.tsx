import { Mic, Send, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type GlassInputOverlayProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
};

/**
 * GlassInputOverlay - A glassmorphism-style overlay input box.
 *
 * A full-screen, semi-transparent blurred overlay with a centered glass card
 * containing a text input and send button. Designed to be triggered from the
 * floating button or wake word for quick voice/text input from any screen.
 *
 * Features:
 *   - Glassmorphism backdrop (semi-transparent background with blur hint)
 *   - Input field with auto-focus
 *   - Send button and microphone button
 *   - Animated slide-up entrance
 *   - X close button
 */
export function GlassInputOverlay({
  visible,
  onClose,
  onSubmit,
}: GlassInputOverlayProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation effect
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const [inputText, setInputText] = useState("");

  const handleKeyPress = () => {
    handleSubmit();
  };

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    onSubmit(inputText);
    setInputText("");
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <TouchableOpacity
        onPress={onClose}
        style={[styles.backdrop, { opacity: fadeAnim }]}
      />

      {/* Glass card */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Reem</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask Reem…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="sentences"
            autoCorrect={false}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={handleKeyPress}
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
          >
            <Send size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Mic button */}
        <TouchableOpacity
          style={styles.micButton}
          onPress={() => {
            // Voice input would be triggered from the parent
            onClose();
          }}
        >
          <Mic size={20} strokeWidth={2} />
        </TouchableOpacity>

        {/* Hint text */}
        <Text style={styles.hint}>
          Type your request or tap the mic for voice input
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  card: {
    width: "92%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#000000",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    backgroundColor: "#208AEF",
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  micButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "rgba(32, 138, 239, 0.15)",
    borderRadius: 14,
    alignItems: "center",
  },
  hint: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
  },
});

export default GlassInputOverlay;
