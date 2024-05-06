export interface CheckboxGroupProps {
  value?: string[];
  options?: { label?: string; value: string }[];
  onChange?: (value: string[]) => void;
}
export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ value, options, onChange }) => {
  const handleItemChange = (itemValue: string, checked: boolean) => {
    let newValue = value ? [...value] : [];
    if (checked) {
      newValue.push(itemValue);
    } else {
      newValue = newValue?.filter(v => v !== itemValue);
    }
    onChange?.(newValue);
  };
  return (
    <>
      {options?.map(item => (
        <label key={item.value} className="hb-uix-switch">
          <input
            type="checkbox"
            checked={value?.includes(item.value)}
            onChange={e => handleItemChange(item.value, e.target.checked)}
          />
          <span>{item.label}</span>
          <span className="hb-uix-slider hb-uix-round" />
        </label>
      ))}
    </>
  );
};
