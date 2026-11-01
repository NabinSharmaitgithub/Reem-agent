import { useAuth } from "@/modules/auth/AuthProvider";
import { useRouter } from "expo-router";
import { Alert, View } from "react-native";
import { useEffect } from "react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sign in",
};

export default function AuthGuardScreen() {
  const router = useRouter();
  const { loading, user, signInAnonymously, initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <Container className="flex-1 items-center justify-center">
        <Button disabled>Loading...</Button>
      </Container>
    );
  }

  if (user) {
    // Auto-redirect anonymous users who just signed in
    router.replace("/");
    return null;
  }

  return (
    <Container className="px-sp-4">
      <View className="flex-1 items-center justify-center gap-sp-4">
        <Button
          onPress={async () => {
            try {
              await signInAnonymously();
              router.replace("/");
            } catch (error: any) {
              Alert.alert("Sign in failed", error?.message ?? String(error));
            }
          }}
          className="w-sp-64"
        >
          Continue as guest
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push("/auth/sign-in")}
          className="w-sp-64"
        >
          Sign in
        </Button>
      </View>
    </Container>
  );
}
