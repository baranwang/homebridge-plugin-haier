import { useEffect } from 'react';

import { useRequest } from 'ahooks';
import RcForm from 'rc-field-form';
import { Form } from 'react-bootstrap';

import { FormField } from './components/form-field';

import { useFamilyList } from './hooks/use-family-list';
import { useDevices } from './hooks/use-devices';

import { Select } from './components/select';

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
    console.log(allValues);
    const configs = pluginConfigs ? [...pluginConfigs] : [];
    configs[0] = allValues;
    window.homebridge.updatePluginConfig(configs);
  };

  return (
    <RcForm form={form} onValuesChange={handleValuesChange}>
      <FormField name="name" label="Name" initialValue="HaierHomebridgePlugin" rules={[{ required: true }]}>
        <Form.Control type="text" placeholder="Enter name" required />
      </FormField>
      <FormField name="username" label={i18n?.['login.label_username'] ?? 'Username'} rules={[{ required: true }]}>
        <Form.Control type="text" placeholder="Enter username" required />
      </FormField>
      <FormField name="password" label={i18n?.['login.label_password'] ?? 'Password'} rules={[{ required: true }]}>
        <Form.Control type="password" placeholder="Enter password" required />
      </FormField>
      <FormField name="familyId" label={i18n?.['accessories.control.label_home'] ?? 'Family'}>
        <Select
          options={familyList?.map(item => ({
            label: item.familyName,
            value: item.familyId,
          }))}
        />
      </FormField>
      <FormField name="disabledDevices" label="Disabled Devices">
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
