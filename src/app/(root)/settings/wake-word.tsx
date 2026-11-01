import { Mic, MicOff, Trophy } from "lucide-react-native";
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useWakeWord } from "@/modules/wake-word/useWakeWord";

export default function WakeWordSettingsScreen() {
  const {
    available,
    enabled,
    listening,
    mode,
    phrase,
    sensitivity,
    accessKey,
    setEnabled,
    setMode,
    setPhrase,
    setSensitivity,
    setAccessKey,
  } = useWakeWord();

  const supported = Platform.OS === "android";

  if (!supported) {
    return (
      <Container>
        <Card className="p-sp-6">
          <Text className="text-foreground">
            Wake word detection is only available on Android.
          </Text>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="mb-sp-6">
            <Text className="font-bold text-foreground text-lg mb-sp-2">
              Wake Word Detection
            </Text>
            <Text className="text-muted-foreground text-sm">
              Say &quot;Reem&quot; to wake the assistant hands-free. Choose
              between the built-in STT engine (works offline) or Picovoice
              Porcupine (more accurate, requires an access key).
            </Text>
          </View>

          {!available && (
            <Card className="mb-sp-4 overflow-hidden">
              <View className="px-sp-4 py-sp-4">
                <Text className="text-sm text-destructive">
                  Wake word detection is not available on this device.
                </Text>
              </View>
            </Card>
          )}

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Wake word enabled
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Listen for &quot;Reem&quot; in the background
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                disabled={!available}
              />
            </View>
            <Separator />

            <View className="px-sp-4 py-sp-3">
              <Text className="text-sm font-medium text-foreground mb-sp-3">
                Detection engine
              </Text>
              <View className="space-y-sp-2">
                <TouchableOpacity
                  onPress={() => setMode("stt")}
                  className={`flex-row items-center justify-between px-sp-3 py-sp-2 rounded-lg border ${
                    mode === "stt"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background dark:bg-background-dark"
                  }`}
                >
                  <Text className="text-sm text-foreground">
                    STT Engine (offline, default)
                  </Text>
                  <Mic
                    className={`w-sp-4 h-sp-4 ${mode === "stt" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode("porcupine")}
                  className={`flex-row items-center justify-between px-sp-3 py-sp-2 rounded-lg border ${
                    mode === "porcupine"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background dark:bg-background-dark"
                  }`}
                >
                  <Text className="text-sm text-foreground">
                    Porcupine (Picovoice, more accurate)
                  </Text>
                  <Trophy
                    className={`w-sp-4 h-sp-4 ${mode === "porcupine" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {mode === "porcupine" && (
              <View className="px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
                <Text className="text-sm font-medium text-foreground mb-sp-3">
                  Picovoice access key
                </Text>
                <Input
                  placeholder="Enter your Picovoice access key"
                  value={accessKey ?? ""}
                  onChangeText={setAccessKey}
                  secureTextEntry
                  className="mb-sp-3"
                />
                <Text className="text-xs text-muted-foreground">
                  Get your access key from the Picovoice Console. Cached locally
                  for 24 hours.
                </Text>
              </View>
            )}

            <View className="px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
              <Text className="text-sm font-medium text-foreground mb-sp-3">
                Wake word phrase
              </Text>
              <Input
                placeholder="e.g. reem"
                value={phrase}
                onChangeText={setPhrase}
                className="mb-sp-3"
              />
              <Text className="text-xs text-muted-foreground">
                The phrase to listen for in the background.
              </Text>
            </View>

            <View className="px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
              <Text className="text-sm font-medium text-foreground mb-sp-3">
                Sensitivity
              </Text>
              <View className="flex-row items-center gap-sp-3">
                <Text className="text-xs text-muted-foreground w-sp-16">
                  Low
                </Text>
                <View className="flex-1 h-sp-1 bg-border dark:bg-background-dark rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary"
                    style={{ width: `${sensitivity * 100}%` }}
                  />
                </View>
                <Text className="text-xs text-muted-foreground w-sp-16">
                  High
                </Text>
              </View>
              <Input
                placeholder="0.0 - 1.0"
                value={sensitivity.toString()}
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n) && n >= 0 && n <= 1) setSensitivity(n);
                }}
                keyboardType="numeric"
                className="w-sp-40"
              />
            </View>
          </Card>

          <Card>
            <View className="p-sp-4">
              <Text className="font-semibold text-foreground mb-sp-3">
                How it works
              </Text>
              <View className="space-y-sp-3">
                <View className="flex-row items-start gap-sp-3">
                  <Mic className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      The wake word detector runs continuously in the background
                      (when enabled).
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <MicOff className="w-sp-5 h-sp-5 text-muted-foreground shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      When the wake word is detected, Reem opens and starts
                      listening for your instruction.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Trophy className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Porcupine is more accurate but requires a Picovoice access
                      key and internet access. STT works offline.
                    </Text>
                  </View>
                </View>
              </View>
              <Separator className="my-sp-4" />
              <Text className="text-sm text-muted-foreground">
                Privacy: Wake word audio is processed locally on your device. No
                audio is uploaded to any server.
              </Text>
            </View>
          </Card>

          <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
            <Text className="text-sm text-foreground">Status</Text>
            <Text
              className={`text-xs font-medium ${enabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
            >
              {listening ? "Listening" : enabled ? "Enabled" : "Disabled"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}
