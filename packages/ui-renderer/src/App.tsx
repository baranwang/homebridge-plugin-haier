import { useEffect } from 'react';

import { PLATFORM_NAME } from '@hb-haier/shared/constants';
import { useRequest } from 'ahooks';
import RcForm from 'rc-field-form';
import { Form } from 'react-bootstrap';

import { FormField } from './components/form-field';
import { Select } from './components/select';
import { useDevices } from './hooks/use-devices';
import { useFamilyList } from './hooks/use-family-list';

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

  const { familyList } = useFamilyList({ username, password });
  const familyId = RcForm.useWatch('familyId', form);
  const { devices } = useDevices(familyId);

  const handleValuesChange = (_: any, allValues: any) => {
    const configs = pluginConfigs ? [...pluginConfigs] : [];
    configs[0] = allValues;
    window.homebridge.updatePluginConfig(configs);
  };

  return (
    <RcForm form={form} onValuesChange={handleValuesChange}>
      <FormField
        name="name"
        label={i18n?.['accessories.label_name'] ?? 'Name'}
        initialValue={PLATFORM_NAME}
        rules={[{ required: true }]}
      >
        <Form.Control type="text" placeholder="Enter name" required />
      </FormField>
      <FormField name="username" label={i18n?.['login.label_username'] ?? 'Username'} rules={[{ required: true }]}>
        <Form.Control type="text" placeholder="Enter username" required />
      </FormField>
      <FormField name="password" label={i18n?.['login.label_password'] ?? 'Password'} rules={[{ required: true }]}>
        <Form.Control type="password" placeholder="Enter password" required />
      </FormField>
      <FormField name="familyId" label={i18n?.['accessories.control.label_home'] ?? 'Family'} hidden={!familyList}>
        <Form.Control as="select" custom>
          <option value="" disabled>
            Select a Family
          </option>
          {familyList?.map(item => (
            <option key={item.familyId} value={item.familyId}>
              {item.familyName}
            </option>
          ))}
        </Form.Control>
      </FormField>
      <FormField name="disabledDevices" label="Disabled Devices" hidden={!devices}>
        <Select
          mode="multiple"
          options={devices?.map(item => ({
            label: `${item.extendedInfo.room} - ${item.baseInfo.deviceName}`,
            value: item.baseInfo.deviceId,
          }))}
        />
      </FormField>
    </RcForm>
  );
}

export default App;
