import { useEffect } from 'react';

import { useRequest } from 'ahooks';

import type { HaierApi } from '@hb-haier/shared';

export function useFamilyList({ username, password }: { username?: string; password?: string }) {
  const { data: familyList, loading } = useRequest(
    () => {
      return window.homebridge.request('/family', { username, password }) as ReturnType<HaierApi['getFamilyList']>;
    },
    {
      ready: !!username && !!password,
      refreshDeps: [username, password],
      debounceWait: 500,
      onError: error => {
        console.error('error', error.name, error.message);
        window.homebridge.toast.error(error.message);
      },
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
    loading,
  };
}
