import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth';
import { DeviceSchema } from '../types';

export const deviceRoutes = new Elysia({ prefix: '/devices' })
  .use(authMiddleware)

  // Get available media devices
  .get(
    '/media',
    async () => {
      // In a real application, you would use the MediaDevices API
      // For now, we'll return mock data
      const mockDevices = [
        {
          id: 'default-audio-input',
          label: 'Default Microphone',
          kind: 'audioinput' as const,
        },
        {
          id: 'default-audio-output',
          label: 'Default Speaker',
          kind: 'audiooutput' as const,
        },
        {
          id: 'default-video-input',
          label: 'Default Camera',
          kind: 'videoinput' as const,
        },
        {
          id: 'usb-microphone',
          label: 'USB Microphone',
          kind: 'audioinput' as const,
        },
        {
          id: 'usb-camera',
          label: 'USB Camera',
          kind: 'videoinput' as const,
        },
      ];

      return {
        success: true,
        devices: mockDevices,
      };
    },
    {
      detail: {
        tags: ['Devices'],
        summary: 'Get media devices',
        description: 'Get list of available audio and video devices',
      },
    }
  )

  // Get audio input devices
  .get(
    '/audio/input',
    async () => {
      const audioInputDevices = [
        {
          id: 'default-audio-input',
          label: 'Default Microphone',
          kind: 'audioinput' as const,
        },
        {
          id: 'usb-microphone',
          label: 'USB Microphone',
          kind: 'audioinput' as const,
        },
        {
          id: 'bluetooth-headset',
          label: 'Bluetooth Headset',
          kind: 'audioinput' as const,
        },
      ];

      return {
        success: true,
        devices: audioInputDevices,
      };
    },
    {
      detail: {
        tags: ['Devices'],
        summary: 'Get audio input devices',
        description: 'Get list of available audio input devices (microphones)',
      },
    }
  )

  // Get audio output devices
  .get(
    '/audio/output',
    async () => {
      const audioOutputDevices = [
        {
          id: 'default-audio-output',
          label: 'Default Speaker',
          kind: 'audiooutput' as const,
        },
        {
          id: 'usb-speakers',
          label: 'USB Speakers',
          kind: 'audiooutput' as const,
        },
        {
          id: 'bluetooth-headset',
          label: 'Bluetooth Headset',
          kind: 'audiooutput' as const,
        },
      ];

      return {
        success: true,
        devices: audioOutputDevices,
      };
    },
    {
      detail: {
        tags: ['Devices'],
        summary: 'Get audio output devices',
        description: 'Get list of available audio output devices (speakers)',
      },
    }
  )

  // Get video input devices
  .get(
    '/video/input',
    async () => {
      const videoInputDevices = [
        {
          id: 'default-video-input',
          label: 'Default Camera',
          kind: 'videoinput' as const,
        },
        {
          id: 'usb-camera',
          label: 'USB Camera',
          kind: 'videoinput' as const,
        },
        {
          id: 'external-webcam',
          label: 'External Webcam',
          kind: 'videoinput' as const,
        },
      ];

      return {
        success: true,
        devices: videoInputDevices,
      };
    },
    {
      detail: {
        tags: ['Devices'],
        summary: 'Get video input devices',
        description: 'Get list of available video input devices (cameras)',
      },
    }
  )

  // Test device connection
  .post(
    '/test/:deviceId',
    async ({ params: { deviceId }, set }) => {
      // In a real application, you would test the device connection
      // For now, we'll simulate a test

      const mockDevices = [
        'default-audio-input',
        'default-audio-output',
        'default-video-input',
        'usb-microphone',
        'usb-camera',
        'bluetooth-headset',
        'usb-speakers',
        'external-webcam',
      ];

      if (!mockDevices.includes(deviceId)) {
        set.status = 404;
        return { success: false, message: 'Device not found' };
      }

      // Simulate device test
      const testResult = {
        deviceId,
        status: 'connected',
        capabilities: {
          audio: deviceId.includes('audio'),
          video: deviceId.includes('video'),
        },
        testTimestamp: new Date(),
      };

      return {
        success: true,
        testResult,
      };
    },
    {
      params: t.Object({
        deviceId: t.String(),
      }),
      detail: {
        tags: ['Devices'],
        summary: 'Test device connection',
        description: 'Test if a specific device is working properly',
      },
    }
  );
