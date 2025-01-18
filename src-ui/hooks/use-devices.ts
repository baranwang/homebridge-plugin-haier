import { useRequest } from 'ahooks';
import type HaierIoT from 'haier-iot';
import { useEffect } from 'react';

export function useDevices(familyId?: string) {
  const { data: devices, loading } = useRequest(
    () => {
      return window.homebridge.request('/device') as ReturnType<HaierIoT['getDevicesByFamilyId']>;
    },
    {
      ready: !!familyId,
      refreshDeps: [familyId],
      debounceWait: 500,
    },
  );
  useEffect(() => {
    if (loading) {
      window.homebridge.showSpinner();
    } else {
      window.homebridge.hideSpinner();
    }
  }, [loading]);

  return {
    devices,
  };
}
