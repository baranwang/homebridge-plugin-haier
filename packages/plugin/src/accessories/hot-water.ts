import { CharacteristicProps, CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';

export class HotWaterAccessory extends BaseAccessory {
  constructor(platform, accessory) {
    super(platform, accessory);
    this.init();
  }

  async init() {
    this.generateServices([this.platform.Service.Thermostat]);

    await this.getDevDigitalModel();

    //#region Thermostat
    this.services[0]
      .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.services[0]
      .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this)) // 与 CurrentHeatingCoolingState 保持一致
      .onSet(this.setTargetHeatingCoolingState.bind(this))
      .setProps({
        validValues: [
          this.Characteristic.TargetHeatingCoolingState.OFF,
          this.Characteristic.TargetHeatingCoolingState.HEAT,
        ],
      });

    this.services[0]
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(this.getTargetTemperature.bind(this)); // 与 TargetTemperature 保持一致

    this.services[0]
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this))
      .setProps(this.targetTemperatureProps);

    this.services[0]
      .getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.Characteristic.TemperatureDisplayUnits.CELSIUS);
    //#endregion
  }

  private get onOffStatus() {
    const onOffStatus: boolean = JSON.parse(this.devDigitalModelPropertiesMap.onOffStatus.value);
    return onOffStatus;
  }

  private get targetTemperature() {
    return this.devDigitalModelPropertiesMap.targetTemp.value;
  }

  private set targetTemperature(value: string) {
    this.devDigitalModelPropertiesMap.targetTemp.value = value;
  }

  private get targetTemperatureProps() {
    const { dataStep } = this.devDigitalModelPropertiesMap.targetTemp.valueRange;
    const minValue = Number(dataStep.minValue);
    const maxValue = Number(dataStep.maxValue);
    const minStep = Number(dataStep.step);
    return {
      minValue,
      maxValue,
      minStep,
      validValueRanges: [minValue, maxValue] as CharacteristicProps['validValueRanges'],
    };
  }

  getCurrentHeatingCoolingState() {
    return this.onOffStatus
      ? this.Characteristic.CurrentHeatingCoolingState.HEAT
      : this.Characteristic.CurrentHeatingCoolingState.OFF;
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    await this.sendCommands({ onOffStatus: (!!value).toString() });
  }

  getTargetTemperature() {
    return Number(this.targetTemperature);
  }

  async setTargetTemperature(value: CharacteristicValue) {
    const { minValue, maxValue } = this.targetTemperatureProps;
    const targetTemp = Math.min(Math.max(value as number, minValue), maxValue).toString();
    try {
      await this.sendCommands({ targetTemp });
      this.targetTemperature = targetTemp;
    } catch (error) {}
  }
}
