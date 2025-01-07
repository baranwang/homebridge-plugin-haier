import RcForm from 'rc-field-form';
import { Suspense, use, useEffect } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { createRoot } from 'react-dom/client';
import { FormField } from './components/form-field';
import { useDevices } from './hooks/use-devices';
import { useFamilyList } from './hooks/use-family-list';

interface Settings {
  name: string;
  username: string;
  password: string;
  familyId?: string;
  disabledDevices?: string[];
}

const App: React.FC<{
  defaultConfigPromise: ReturnType<typeof window.homebridge.getPluginConfig>;
}> = ({ defaultConfigPromise }) => {
  const [form] = RcForm.useForm<Settings>();

  const pluginConfigs = use(defaultConfigPromise);

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

  useEffect(() => {
    if (!devices?.length) {
      return;
    }
    const disabledDevicesForm = window.homebridge.createForm(
      {
        schema: {
          type: 'object',
          properties: {
            disabledDevices: {
              type: 'array',
              title: 'Disabled Devices',
              items: {
                type: 'string',
                anyOf: devices.map((item) => ({
                  title: `${item.extendedInfo.room} - ${item.baseInfo.deviceName}`,
                  enum: [item.baseInfo.deviceId],
                })),
              },
            },
          },
        },
      },
      {
        disabledDevices: pluginConfigs?.[0].disabledDevices,
      },
    );
    disabledDevicesForm.onChange((change) => {
      const configs = pluginConfigs ? [...pluginConfigs] : [];
      configs[0] = { ...configs[0], ...change };
      window.homebridge.updatePluginConfig(configs);
    });
  }, [devices]);

  const handleValuesChange = (_: any, allValues: Settings) => {
    const configs = pluginConfigs ? [...pluginConfigs] : [];
    configs[0] = allValues;
    window.homebridge.updatePluginConfig(configs);
  };

  return (
    <RcForm form={form} onValuesChange={handleValuesChange}>
      <FormField name="name" label="Name" initialValue="HaierHomebridgePlugin" rules={[{ required: true }]}>
        <Form.Control className="custom-input" type="text" placeholder="Enter name" required />
      </FormField>
      <FormField name="username" label="Username" rules={[{ required: true }]}>
        <Form.Control className="custom-input" type="text" placeholder="Enter username" required />
      </FormField>
      <FormField name="password" label="Password" rules={[{ required: true }]}>
        <Form.Control className="custom-input" type="password" placeholder="Enter password" required />
      </FormField>
      <RcForm.Field name="familyId">
        <input type="hidden" />
      </RcForm.Field>
      {(!!familyList || !!familyId) && (
        <FormField name="familyId" label="Family">
          <Form.Control as="select" className="custom-select" type="select" required>
            {familyList?.map((item) => (
              <option key={item.familyId} value={item.familyId}>
                {item.familyName}
              </option>
            ))}
          </Form.Control>
        </FormField>
      )}
    </RcForm>
  );
};

const root = createRoot(document.querySelector('#root') as HTMLElement);
root.render(
  <Suspense fallback={<Spinner animation="border" />}>
    <App defaultConfigPromise={window.homebridge.getPluginConfig()} />
  </Suspense>,
);
