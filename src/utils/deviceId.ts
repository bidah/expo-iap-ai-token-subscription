import * as Device from 'expo-device';

/**
 * Get a unique device identifier
 *
 * Uses various device properties to generate a unique ID.
 * Falls back to 'unknown-device' if no identifier can be determined.
 *
 * Note: This ID may change if the user reinstalls the app or resets their device.
 * For production apps, consider using a more persistent identifier or user authentication.
 */
export async function getDeviceId(): Promise<string> {
  // Use a combination of device identifiers for uniqueness
  const deviceId =
    Device.osBuildId ||
    Device.osInternalBuildId ||
    Device.modelId ||
    'unknown-device';

  return deviceId;
}

/**
 * Get device information for logging/debugging
 */
export function getDeviceInfo(): Record<string, string | null> {
  return {
    brand: Device.brand,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    modelId: Device.modelId,
    osName: Device.osName,
    osVersion: Device.osVersion,
    osBuildId: Device.osBuildId,
    osInternalBuildId: Device.osInternalBuildId,
    deviceType: Device.deviceType?.toString() ?? null,
    isDevice: Device.isDevice?.toString() ?? null,
  };
}
