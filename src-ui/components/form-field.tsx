import RcForm from 'rc-field-form';
import { Form } from 'react-bootstrap';

type FieldProps = React.ComponentProps<typeof RcForm.Field>;

export interface FormFieldProps extends FieldProps {
  label?: React.ReactNode;
}
export const FormField: React.FC<FormFieldProps> = ({ label, children, ...rest }) => {
  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <RcForm.Field {...rest}>{children}</RcForm.Field>
    </Form.Group>
  );
};
