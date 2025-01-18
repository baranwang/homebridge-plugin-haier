import { isNumber } from '@shared';
import { type CharacteristicProps, type CharacteristicValue, Perms } from 'homebridge';
import { BaseAccessory } from './base';

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

    if (this.getPropertyValue<number>('zeroColdWaterFuncExist')) {
      this.setServices('switch', this.platform.Service.Switch, '零冷水');

      this.services.switch
        .getCharacteristic(this.Characteristic.On)
        .onGet(this.getZeroColdWaterStatus.bind(this))
        .onSet(this.setZeroColdWaterStatus.bind(this));
    }

    if (this.devDigitalModelPropertiesMap.flowStatus) {
      this.setServices('flowStatus', this.platform.Service.Valve, '水流状态');
      this.services.flowStatus
        .getCharacteristic(this.Characteristic.Active)
        .setProps({ perms: [Perms.PAIRED_READ] })
        .onGet(() =>
          this.getPropertyValue<boolean>('flowStatus')
            ? this.Characteristic.Active.ACTIVE
            : this.Characteristic.Active.INACTIVE,
        );

      this.services.flowStatus
        .getCharacteristic(this.Characteristic.InUse)
        .onGet(() =>
          this.getPropertyValue<boolean>('flowStatus')
            ? this.Characteristic.InUse.IN_USE
            : this.Characteristic.InUse.NOT_IN_USE,
        );
    }
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

    if (this.getPropertyValue<number>('zeroColdWaterFuncExist')) {
      this.services.switch?.getCharacteristic(this.Characteristic.On).updateValue(this.getZeroColdWaterStatus());
    }
  }

  private get onOffStatus() {
    return this.getPropertyValue<boolean>('onOffStatus');
  }

  private get targetTemperature() {
    return this.getPropertyValue<number>('targetTemp');
  }

  private get targetTemperatureProps():
    | Pick<CharacteristicProps, 'minValue' | 'maxValue' | 'minStep' | 'validValueRanges'>
    | undefined {
    const valueRange = this.devDigitalModelPropertiesMap.targetTemp?.valueRange;
    if (!valueRange || valueRange.type !== 'STEP' || !valueRange.dataStep) {
      return undefined;
    }
    const minValue = Number.parseFloat(valueRange.dataStep.minValue);
    const maxValue = Number.parseFloat(valueRange.dataStep.maxValue);
    const minStep = Number.parseFloat(valueRange.dataStep.step);
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

  setTargetHeatingCoolingState(value: CharacteristicValue) {
    return this.sendCommands({ onOffStatus: (!!value).toString() });
  }

  getTargetTemperature() {
    return this.targetTemperature;
  }

  setTargetTemperature(value: CharacteristicValue) {
    const { minValue = 0, maxValue = 100 } = this.targetTemperatureProps ?? {};
    const targetTemp = Math.min(Math.max(Number.parseFloat(value.toString()), minValue), maxValue).toString();
    return this.sendCommands({ targetTemp });
  }

  getZeroColdWaterStatus() {
    return !!this.getPropertyValue<number>('zeroColdWaterStatus');
  }

  setZeroColdWaterStatus(value: CharacteristicValue) {
    const enableMode = this.platform.config.customConfig?.hotWater?.zeroColdWaterMode ?? '4';
    return this.sendCommands({ zeroColdWaterStatus: value ? enableMode : '0' });
  }
}
