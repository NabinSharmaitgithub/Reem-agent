import { useRouter } from "expo-router";
import { Lock, Mail, UserPlus } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/modules/auth/AuthProvider";

export default function RegisterScreen() {
  const router = useRouter();
  const { registerWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      await registerWithEmail(email, password);
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Registration failed", error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View className="px-sp-4 pt-sp-10 pb-sp-8">
            <View className="mb-sp-8">
              <View className="flex-row items-center gap-sp-2 mb-sp-4">
                <UserPlus className="w-sp-6 h-sp-6 text-primary" />
                <Text className="font-bold text-foreground text-2xl">
                  Create account
                </Text>
              </View>
              <Text className="text-muted-foreground text-sm">
                Join Reem to sync your settings, memory, and Pro subscription
                across devices.
              </Text>
            </View>

            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-4 space-y-sp-4">
                <View className="flex-row items-center gap-sp-3">
                  <Mail className="w-sp-5 h-sp-5 text-muted-foreground" />
                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="next"
                    className="flex-1"
                  />
                </View>
                <View className="flex-row items-center gap-sp-3">
                  <Lock className="w-sp-5 h-sp-5 text-muted-foreground" />
                  <Input
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    returnKeyType="next"
                    className="flex-1"
                  />
                </View>
                <View className="flex-row items-center gap-sp-3">
                  <Lock className="w-sp-5 h-sp-5 text-muted-foreground" />
                  <Input
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    className="flex-1"
                  />
                </View>
                <Button
                  onPress={handleRegister}
                  disabled={busy}
                  className="w-full"
                  loading={busy}
                >
                  Create account
                </Button>
                <Text className="text-xs text-center text-muted-foreground">
                  Already have an account?{" "}
                  <TouchableOpacity
                    onPress={() => router.push("/auth/sign-in")}
                    className="text-primary font-medium underline"
                  >
                    Sign in
                  </TouchableOpacity>
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}
