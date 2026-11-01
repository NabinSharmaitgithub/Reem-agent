/**
 * DeveloperMessageDialog
 *
 * Displays a developer message fetched from Firebase Remote Config
 * (developer_message key). Shown as a dismissible dialog in the conversational
 * UI. The message is fetched once on mount and cached for the session.
 */

import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";

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
import { remoteConfig } from "@/modules/auth/firebase";

export type DeveloperMessageDialogProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function DeveloperMessageDialog({
  visible,
  onDismiss,
}: DeveloperMessageDialogProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLoaded(false);
      setMessage(null);
      return;
    }

    if (loaded) return;

    const fetchMessage = async () => {
      try {
        await remoteConfig.fetchAndActivate();
        const value = remoteConfig.getValue("developer_message");
        const msg = value.asString();
        if (msg && msg.trim()) {
          setMessage(msg);
        }
      } catch {
        // Silently fail - remote config is optional
      } finally {
        setLoaded(true);
      }
    };

    fetchMessage();
  }, [visible, loaded]);

  if (!visible || !loaded || !message) {
    return null;
  }

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      open={visible}
    >
      <DrawerContent showCloseButton showHandle>
        <DrawerHeader>
          <DrawerTitle>Developer Message</DrawerTitle>
          <DrawerDescription>
            Message from the Reem development team.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody contentContainerClassName="gap-sp-3">
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-sm text-foreground dark:text-foreground-dark">
              {message}
            </Text>
          </ScrollView>
        </DrawerBody>
        <DrawerFooter className="flex-row items-center justify-end gap-sp-2">
          <Button variant="outline" onPress={() => onDismiss()}>
            Dismiss
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
