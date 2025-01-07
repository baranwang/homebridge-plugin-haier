import type { HaierApi } from '@shared';
import { useRequest } from 'ahooks';
import { useEffect } from 'react';

export function useFamilyList({ username, password }: { username?: string; password?: string }) {
  const { data: familyList, loading } = useRequest(
    () => {
      return window.homebridge.request('/family', { username, password }) as ReturnType<HaierApi['getFamilyList']>;
    },
    {
      ready: !!username && !!password,
      refreshDeps: [username, password],
      debounceWait: 1000,
      onError: (error) => {
        window.homebridge.toast.error(error.message);
      }
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
    familyList,
  };
}
