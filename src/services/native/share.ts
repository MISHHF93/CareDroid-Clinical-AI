// Web-first sharing helper. Uses the Web Share API with a clipboard fallback.

async function canShare(): Promise<boolean> {
  return typeof navigator !== 'undefined' && Boolean(navigator.share);
}

async function shareText(text: string, title = 'Share'): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title, text });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

async function shareConversation(conversationTitle: string, messages: string): Promise<void> {
  const text = `CareDroid conversation: ${conversationTitle}\n\n${messages}`;
  await shareText(text, 'Share Conversation');
}

export const share = { canShare, shareText, shareConversation };
