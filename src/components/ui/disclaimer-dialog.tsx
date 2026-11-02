/**
 * DisclaimerDialog
 *
 * Displays an experimental AI assistant disclaimer. Shown once per session
 * (or can be forced to show again). Explains that Reem is an experimental
 * AI assistant and users should verify important information.
 */

import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export type DisclaimerDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  forceShow?: boolean;
};

export function DisclaimerDialog({
  visible,
  onDismiss,
  forceShow = false,
}: DisclaimerDialogProps) {
  const [hasSeen, setHasSeen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHasSeen(false);
      return;
    }
    // Only show once per session unless forced
    if (!forceShow && hasSeen) return;
    setHasSeen(true);
  }, [visible, forceShow, hasSeen]);

  if (!visible) return null;

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      open={visible}
    >
      <DrawerContent showCloseButton showHandle>
        <DrawerHeader>
          <DrawerTitle>About Reem</DrawerTitle>
          <DrawerDescription>
            Important information about using this AI assistant.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody contentContainerClassName="gap-sp-3">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-sp-3">
              <Text className="font-sans text-sm text-foreground dark:text-foreground-dark">
                Reem is an experimental AI assistant built to help you with
                tasks, answer questions, and automate your device.
              </Text>
              <Text className="font-sans text-sm text-foreground dark:text-foreground-dark">
                <Text className="font-semibold">Important:</Text> Reem can make
                mistakes. Please verify important information before relying on
                it, especially for medical, legal, or financial decisions.
              </Text>
              <Text className="font-sans text-sm text-foreground dark:text-foreground-dark">
                Reem processes your input locally where possible, but some
                features may send data to cloud AI providers. Review your
                privacy settings to control what is shared.
              </Text>
              <Text className="font-sans text-sm text-foreground dark:text-foreground-dark">
                By using Reem, you agree to our Terms of Service and Privacy
                Policy.
              </Text>
            </View>
          </ScrollView>
        </DrawerBody>
        <DrawerFooter className="flex-row items-center justify-end gap-sp-2">
          <Button variant="outline" onPress={() => onDismiss()}>
            Got it
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
