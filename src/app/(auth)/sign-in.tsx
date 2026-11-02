import { useRouter } from "expo-router";
import { Lock, Mail, User } from "lucide-react-native";
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

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithEmail, signInAnonymously } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Sign in failed", error?.message ?? String(error));
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
                <User className="w-sp-6 h-sp-6 text-primary" />
                <Text className="font-bold text-foreground text-2xl">
                  Welcome back
                </Text>
              </View>
              <Text className="text-muted-foreground text-sm">
                Sign in to your Reem account to sync your settings, memory, and
                Pro subscription.
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
                    onSubmitEditing={() => {}}
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
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    className="flex-1"
                  />
                </View>
                <Button
                  onPress={handleSignIn}
                  disabled={busy}
                  className="w-full"
                  loading={busy}
                >
                  Sign in
                </Button>
                <Text className="text-xs text-center text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <TouchableOpacity
                    onPress={() => router.push("/auth/register")}
                    className="text-primary font-medium underline"
                  >
                    Create account
                  </TouchableOpacity>
                </Text>
              </View>
            </Card>

            <Card className="overflow-hidden">
              <View className="px-sp-4 py-sp-4">
                <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-sp-3">
                  Or continue without an account
                </Text>
                <Button
                  variant="outline"
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await signInAnonymously();
                      router.replace("/");
                    } catch (error: any) {
                      Alert.alert(
                        "Sign in failed",
                        error?.message ?? String(error),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="w-full"
                  loading={busy}
                >
                  Continue as guest
                </Button>
                <Text className="text-xs text-center text-muted-foreground mt-sp-3">
                  Guest accounts store data locally and cannot sync across
                  devices.
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}
