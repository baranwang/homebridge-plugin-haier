import { HaierApi } from '@hb-haier/shared';
import { useRequest } from 'ahooks';
import { useEffect } from 'react';

export function useDevices(familyId?: string) {
  const { data: devices, loading } = useRequest(
    () => {
      return window.homebridge.request('/device', { familyId }) as ReturnType<HaierApi['getDevicesByFamilyId']>;
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
    loading,
  };
}
