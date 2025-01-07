import RcSelect from 'rc-select';
import { useMemo } from 'react';

import './select.css';

type RcSelectProps = React.ComponentProps<typeof RcSelect>;

export interface SelectProps extends RcSelectProps {}

export const Select: React.FC<SelectProps> = ({ value, options, ...rest }) => {
  const arrayValue = useMemo(() => (Array.isArray(value) ? value : [value]), [value]);

  const selectOptions = useMemo(
    () =>
      options?.map((item) => ({
        ...item,
        className: arrayValue.includes(item.value) ? 'dropdown-item active' : 'dropdown-item',
      })),
    [options, arrayValue],
  );

  return (
    <RcSelect
      {...rest}
      value={value}
      showSearch={false}
      className="form-control"
      dropdownClassName="dropdown-menu"
      options={selectOptions}
    />
  );
};
