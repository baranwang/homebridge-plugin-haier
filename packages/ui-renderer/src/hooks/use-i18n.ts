import { useMemo } from 'react';

import { useRequest } from 'ahooks';

import en from '../lang/en.json';
import zh from '../lang/zh-CN.json';

export function useI18n() {
  const { data: lang } = useRequest(() => window.homebridge.i18nCurrentLang());

  const { data: uiI18n } = useRequest(() => window.homebridge.i18nGetTranslation());

  const pluginI18n = useMemo(() => {
    return lang === 'zh-CN' ? zh : en;
  }, [lang]);

  const i18n = useMemo(() => {
    return new Proxy(uiI18n ?? {}, {
      get(target, key) {
        if (key in pluginI18n) {
          return pluginI18n[key as keyof typeof pluginI18n];
        }
        return Reflect.get(target, key);
      },
    });
  }, [uiI18n, pluginI18n]);

  return { i18n };
}
