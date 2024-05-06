import { BaseAccessory } from './base';

import type { CharacteristicProps, CharacteristicValue } from 'homebridge';

export class HotWaterAccessory extends BaseAccessory {
  async init() {
    this.generateServices({
      thermostat: this.platform.Service.Thermostat,
    });

    await this.getDevDigitalModel();

    const {
      CurrentHeatingCoolingState,
      TargetHeatingCoolingState,
      CurrentTemperature,
      TargetTemperature,
      TemperatureDisplayUnits,
      Active,
      InUse,
      ValveType,
      Name,
    } = this.Characteristic;

    //#region Thermostat
    this.services.thermostat
      .getCharacteristic(CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.services.thermostat
      .getCharacteristic(TargetHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this)) // 与 CurrentHeatingCoolingState 保持一致
      .onSet(this.setTargetHeatingCoolingState.bind(this))
      .setProps({
        validValues: [TargetHeatingCoolingState.OFF, TargetHeatingCoolingState.HEAT],
      });

    this.services.thermostat.getCharacteristic(CurrentTemperature).onGet(this.getTargetTemperature.bind(this)); // 与 TargetTemperature 保持一致

    this.services.thermostat
      .getCharacteristic(TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this))
      .setProps(this.targetTemperatureProps);

    this.services.thermostat.getCharacteristic(TemperatureDisplayUnits).onGet(() => TemperatureDisplayUnits.CELSIUS);
    //#endregion

    if (this.devProps.tankWateringStatus) {
      this.generateServices({
        valve: {
          service: this.platform.Service.Valve,
          subName: '浴缸注水',
        },
      });

      this.services.valve
        .getCharacteristic(Active)
        .onGet(() => (this.devProps.tankWateringStatus === 'true' ? Active.ACTIVE : Active.INACTIVE))
        .onSet(value => {
          this.devProps.tankWateringStatus = (!!value).toString();
        });

      this.services.valve
        .getCharacteristic(InUse)
        .onGet(() => (this.devProps.tankWaterLevel === 'false' ? InUse.NOT_IN_USE : InUse.IN_USE));

      this.services.valve.getCharacteristic(ValveType).onGet(() => ValveType.WATER_FAUCET);

      this.services.valve.getCharacteristic(Name).onGet(() => '浴缸注水');
    }
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

  private get isOn() {
    return this.devProps.onOffStatus === 'true';
  }

  private get currentHeatingCoolingState() {
    return this.isOn
      ? this.Characteristic.CurrentHeatingCoolingState.HEAT
      : this.Characteristic.CurrentHeatingCoolingState.OFF;
  }

  async getCurrentHeatingCoolingState() {
    await this.getDevDigitalModel();
    return this.currentHeatingCoolingState;
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    this.devProps.onOffStatus = value === this.Characteristic.TargetHeatingCoolingState.OFF ? '0' : '1';
  }

  async getTargetTemperature() {
    await this.getDevDigitalModel();
    return Number(this.devProps.targetTemp);
  }

  setTargetTemperature(value: CharacteristicValue) {
    if (!this.isOn) {
      this.setTargetHeatingCoolingState(this.Characteristic.TargetHeatingCoolingState.HEAT);
    }
    const { minValue, maxValue } = this.targetTemperatureProps;
    const targetTemp = Math.min(Math.max(value as number, minValue), maxValue).toString();
    try {
      this.devProps.targetTemp = targetTemp;
    } catch (error) {}
  }

  onDevDigitalModelUpdate() {
    if (!this.services.thermostat) {
      return;
    }

    this.services.thermostat.updateCharacteristic(
      this.Characteristic.CurrentHeatingCoolingState,
      this.currentHeatingCoolingState,
    );

    this.services.thermostat.updateCharacteristic(
      this.Characteristic.TargetTemperature,
      Number(this.devProps.targetTemp),
    );
  }
}
