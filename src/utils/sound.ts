// Sound is disabled in Expo Go because the native audio module is not available.
// When you build the final APK, uncomment the real implementation below.
// For now, every call is a silent no-op so the app never crashes.

export async function playNotificationSound(
  _type: "attendance" | "academic" | "fee" = "attendance"
): Promise<void> {
  // No-op in Expo Go. Real implementation goes here after building the APK.
  return;
}

export async function isSoundEnabled(): Promise<boolean> {
  return false;
}

export async function setSoundEnabled(_value: boolean): Promise<void> {
  return;
}