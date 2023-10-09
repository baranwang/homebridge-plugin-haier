import { useEffect } from 'react';

import { PLATFORM_NAME } from '@hb-haier/shared';
import { useRequest } from 'ahooks';
import RcForm from 'rc-field-form';
import { Form } from 'react-bootstrap';

import { FormField } from './components/form-field';

import type { HaierApi } from '@hb-haier/api';

function App() {
  const { data: i18n } = useRequest(() => window.homebridge.i18nGetTranslation());

  const [form] = RcForm.useForm();

  const { data: pluginConfigs } = useRequest(() => window.homebridge.getPluginConfig());
  useEffect(() => {
    if (pluginConfigs?.length) {
      form.setFieldsValue(pluginConfigs[0]);
    }
  }, [pluginConfigs]);

  const username = RcForm.useWatch('username', form);
  const password = RcForm.useWatch('password', form);

  const { data: familyList } = useRequest(
    () => {
      return window.homebridge.request('/family/list', { username, password }) as ReturnType<HaierApi['getFamilyList']>;
    },
    {
      ready: !!username && !!password,
      refreshDeps: [username, password],
      debounceWait: 500,
    },
  );

  const handleValuesChange = (_: any, allValues: any) => {
    const configs = pluginConfigs ? [...pluginConfigs] : [];
    configs[0] = allValues;
    window.homebridge.updatePluginConfig(configs);
  };

  return (
    <RcForm form={form} onValuesChange={handleValuesChange}>
      <FormField name="name" label="Name" initialValue={PLATFORM_NAME} rules={[{ required: true }]}>
        <Form.Control type="text" placeholder="Enter name" required />
      </FormField>
      <FormField name="username" label={i18n?.['login.label_username'] ?? 'Username'} rules={[{ required: true }]}>
        <Form.Control type="text" placeholder="Enter username" required />
      </FormField>
      <FormField name="password" label={i18n?.['login.label_password'] ?? 'Password'} rules={[{ required: true }]}>
        <Form.Control type="password" placeholder="Enter password" required />
      </FormField>
      <FormField name="familyId" label={i18n?.['accessories.control.label_home'] ?? 'Family'}>
        <Form.Select bsPrefix="form-control">
          {familyList?.map(family => (
            <option key={family.familyId} value={family.familyId}>
              {family.familyName}
            </option>
          ))}
        </Form.Select>
      </FormField>
    </RcForm>
  );
}

export default App;
