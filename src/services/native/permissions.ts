// Web-first permission helper powered by the standard Permissions API.

export type PermissionName = 'notifications' | 'camera' | 'microphone';
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

async function checkPermission(name: PermissionName): Promise<PermissionStatus> {
  if (typeof navigator === 'undefined' || !navigator.permissions) return 'unavailable';

  const permNameMap: Record<PermissionName, PermissionDescriptor['name']> = {
    notifications: 'notifications',
    camera: 'camera',
    microphone: 'microphone',
  };

  try {
    const result = await navigator.permissions.query({
      name: permNameMap[name] as PermissionDescriptor['name'],
    });
    return result.state as PermissionStatus;
  } catch {
    return 'unavailable';
  }
}

async function requestNotificationPermission(): Promise<PermissionStatus> {
  if (typeof Notification === 'undefined') return 'unavailable';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result as PermissionStatus;
}

async function hasNotificationPermission(): Promise<boolean> {
  return (await checkPermission('notifications')) === 'granted';
}

async function hasCameraPermission(): Promise<boolean> {
  return (await checkPermission('camera')) === 'granted';
}

async function hasMicrophonePermission(): Promise<boolean> {
  return (await checkPermission('microphone')) === 'granted';
}

export const permissions = {
  checkPermission,
  requestNotificationPermission,
  hasNotificationPermission,
  hasCameraPermission,
  hasMicrophonePermission,
};
