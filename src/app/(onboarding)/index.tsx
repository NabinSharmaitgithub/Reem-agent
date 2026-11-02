import { useRouter } from "expo-router";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Mail,
  Shield,
  Smartphone,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/modules/auth/AuthProvider";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Reem",
    description: "Your AI agent for device automation and task execution.",
    icon: Smartphone,
  },
  {
    id: "permissions",
    title: "Permissions",
    description:
      "Reem needs accessibility, microphone, and overlay permissions to control your device.",
    icon: Shield,
  },
  {
    id: "account",
    title: "Account",
    description:
      "Sign in to sync your settings, memory, and Pro subscription across devices.",
    icon: Mail,
  },
  {
    id: "voice",
    title: "Voice",
    description:
      "Enable press-and-hold voice input or wake-word detection for hands-free control.",
    icon: CheckCircle,
  },
  {
    id: "done",
    title: "Ready",
    description: "You're all set! Start automating with Reem.",
    icon: ArrowRight,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { signInAnonymously } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const nextStep = async () => {
    if (isLast) {
      // Complete onboarding - sign in anonymously if not already
      try {
        setBusy(true);
        await signInAnonymously();
      } catch {
        // Ignore errors, continue anyway
      } finally {
        setBusy(false);
      }
      router.replace("/");
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          {/* Progress indicator */}
          <View className="mb-sp-8">
            <View className="flex-row gap-sp-1">
              {STEPS.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-1 w-sp-4 rounded-full ${
                    idx < stepIndex
                      ? "bg-primary"
                      : "bg-border dark:bg-background-dark"
                  }`}
                />
              ))}
            </View>
            <Text className="text-xs text-muted-foreground mt-sp-2 text-center">
              Step {stepIndex + 1} of {STEPS.length}
            </Text>
          </View>

          <View className="flex-row items-center gap-sp-3 mb-sp-6">
            <View
              className={`w-sp-10 h-sp-10 rounded-full flex items-center justify-center ${
                stepIndex === STEPS.length - 1
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-primary/10"
              }`}
            >
              <step.icon className="w-sp-6 h-sp-6" />
            </View>
            <Text className="font-bold text-foreground text-lg">
              {step.title}
            </Text>
          </View>
          <Text className="text-muted-foreground text-lg mb-sp-6">
            {step.description}
          </Text>

          {step.id === "permissions" && (
            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-4">
                <Text className="font-medium text-foreground mb-sp-3">
                  Required permissions:
                </Text>
                <View className="space-y-sp-2">
                  <View className="flex-row items-center gap-sp-3">
                    <Shield className="w-sp-5 h-sp-5 text-primary shrink-0" />
                    <Text className="text-sm text-foreground">
                      Accessibility Service
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-sp-3">
                    <MicIcon className="w-sp-5 h-sp-5 text-primary shrink-0" />
                    <Text className="text-sm text-foreground">
                      Microphone & Speech Recognition
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-sp-3">
                    <OverlayIcon className="w-sp-5 h-sp-5 text-primary shrink-0" />
                    <Text className="text-sm text-foreground">
                      Display Over Other Apps
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-sp-3">
                    <Clock className="w-sp-5 h-sp-5 text-primary shrink-0" />
                    <Text className="text-sm text-foreground">
                      Exact Alarms & Boot Receiver
                    </Text>
                  </View>
                </View>
                <Separator className="my-sp-3" />
                <Text className="text-xs text-muted-foreground">
                  All processing happens locally on your device. Reem does not
                  upload screen data or audio to any server.
                </Text>
              </View>
            </Card>
          )}

          {step.id === "account" && (
            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-4">
                <Text className="font-medium text-foreground mb-sp-3">
                  Sign in to continue
                </Text>
                <Button
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await signInAnonymously();
                    } catch {
                      // Continue even if sign-in fails
                    } finally {
                      setBusy(false);
                    }
                    nextStep();
                  }}
                  disabled={busy}
                  className="w-full"
                  loading={busy}
                >
                  Continue as guest
                </Button>
                <Button
                  variant="outline"
                  onPress={() => router.push("/auth/sign-in")}
                  className="w-full mt-sp-2"
                >
                  Sign in with email
                </Button>
              </View>
            </Card>
          )}

          {step.id === "voice" && (
            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-4">
                <Text className="font-medium text-foreground mb-sp-3">
                  Voice input options
                </Text>
                <View className="space-y-sp-3">
                  <TouchableOpacity
                    onPress={nextStep}
                    className="flex-row items-center justify-between px-sp-3 py-sp-2 rounded-lg border border-border dark:border-border-dark"
                  >
                    <Text className="text-sm text-foreground">
                      Press-and-hold voice
                    </Text>
                    <ArrowRightIcon className="w-sp-4 h-sp-4 text-muted-foreground" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/settings/wake-word")}
                    className="flex-row items-center justify-between px-sp-3 py-sp-2 rounded-lg border border-border dark:border-border-dark"
                  >
                    <Text className="text-sm text-foreground">
                      Wake-word detection
                    </Text>
                    <ArrowRightIcon className="w-sp-4 h-sp-4 text-muted-foreground" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}

          <View className="flex-row justify-between mt-sp-6">
            {!isLast && (
              <Button
                variant="outline"
                onPress={() => {
                  if (stepIndex > 0) setStepIndex((prev) => prev - 1);
                }}
                disabled={stepIndex === 0}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                onPress={nextStep}
                disabled={busy}
                className="w-sp-64"
                loading={busy}
              >
                Get started
              </Button>
            ) : (
              <Button
                onPress={nextStep}
                disabled={busy}
                className="w-sp-64"
                loading={busy}
              >
                Next
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function OverlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
