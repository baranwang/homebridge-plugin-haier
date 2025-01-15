import type { CharacteristicProps, CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';
import { isNumber, safeJsonParse } from '@shared';

export class HotWaterAccessory extends BaseAccessory {
  async init() {
    this.setServices('thermostat', this.platform.Service.Thermostat);

    await this.getDevDigitalModel();

    //#region Thermostat
    this.services.thermostat
      .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.services.thermostat
      .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [
          this.Characteristic.TargetHeatingCoolingState.OFF,
          this.Characteristic.TargetHeatingCoolingState.HEAT,
        ],
      })
      .onGet(this.getCurrentHeatingCoolingState.bind(this)) // 与 CurrentHeatingCoolingState 保持一致
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.services.thermostat
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(this.getTargetTemperature.bind(this)); // 与 TargetTemperature 保持一致

    this.services.thermostat
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .setProps({ ...this.targetTemperatureProps })
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.services.thermostat
      .getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.Characteristic.TemperatureDisplayUnits.CELSIUS);
    //#endregion
  }

  onDevDigitalModelUpdate() {
    const thermostatService = this.services.thermostat;

    if (!thermostatService) {
      return;
    }
    if (isNumber(this.targetTemperature)) {
      thermostatService
        .getCharacteristic(this.Characteristic.TargetTemperature)
        .setProps({ ...this.targetTemperatureProps })
        .updateValue(this.targetTemperature);

      thermostatService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.targetTemperature);
    }
  }

  private get onOffStatus() {
    const onOffStatus = safeJsonParse<boolean>(this.devDigitalModelPropertiesMap.onOffStatus?.value ?? 'false');
    return onOffStatus;
  }

  private get targetTemperature() {
    return this.getPropertyValue<number>('targetTemp');
  }

  private get targetTemperatureProps():
    | Pick<CharacteristicProps, 'minValue' | 'maxValue' | 'minStep' | 'validValueRanges'>
    | undefined {
    const { dataStep } = this.devDigitalModelPropertiesMap.targetTemp?.valueRange ?? {};
    if (!dataStep) {
      return undefined;
    }
    const minValue = Number.parseFloat(dataStep.minValue);
    const maxValue = Number.parseFloat(dataStep.maxValue);
    const minStep = Number.parseFloat(dataStep.step);
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
    this.sendCommands({ onOffStatus: (!!value).toString() });
  }

  getTargetTemperature() {
    return this.targetTemperature;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    const { minValue = 0, maxValue = 100 } = this.targetTemperatureProps ?? {};
    const targetTemp = Math.min(Math.max(Number.parseFloat(value.toString()), minValue), maxValue).toString();
    this.sendCommands({ targetTemp });
  }
}
