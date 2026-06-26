// TypeScript replacement for ShareManager.kt
// Uses @capacitor/share on native Android; Web Share API with clipboard fallback on web.

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

async function canShare(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== 'undefined' && !!navigator.share;
}

async function shareText(text: string, title = 'Share'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text, dialogTitle: title });
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

async function shareConversation(conversationTitle: string, messages: string): Promise<void> {
  const text = `CareDroid conversation: ${conversationTitle}\n\n${messages}`;
  await shareText(text, 'Share Conversation');
}

export const share = { canShare, shareText, shareConversation };
