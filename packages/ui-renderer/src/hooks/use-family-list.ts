import { HaierApi } from '@hb-haier/shared';
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
    familyList,
    loading,
  };
}
