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

    if (this.deviceProps.tankWateringStatus) {
      this.generateServices({
        valve: {
          service: this.platform.Service.Valve,
          subName: '浴缸注水',
        },
      });

      this.services.valve
        .getCharacteristic(Active)
        .onGet(() => (this.deviceProps.tankWateringStatus === 'true' ? Active.ACTIVE : Active.INACTIVE))
        .onSet(value => {
          this.deviceProps.tankWateringStatus = (!!value).toString();
        });

      this.services.valve
        .getCharacteristic(InUse)
        .onGet(() => (this.deviceProps.tankWaterLevel === 'false' ? InUse.NOT_IN_USE : InUse.IN_USE));

      this.services.valve.getCharacteristic(ValveType).onGet(() => ValveType.WATER_FAUCET);

      this.services.valve.getCharacteristic(Name).onGet(() => '浴缸注水');
    }
  }

  private get targetTemperatureProps() {
    if (!this.deviceAttr?.targetTemp?.valueRange) {
      return {};
    }
    const { dataStep } = this.deviceAttr.targetTemp.valueRange;
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
    return this.deviceProps.onOffStatus === 'true';
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
    this.deviceProps.onOffStatus = value === this.Characteristic.TargetHeatingCoolingState.OFF ? 'false' : 'true';
  }

  async getTargetTemperature() {
    await this.getDevDigitalModel();
    return Number(this.deviceProps.targetTemp);
  }

  setTargetTemperature(characteristicValue: CharacteristicValue) {
    const value = characteristicValue as number;
    if (!this.isOn) {
      this.setTargetHeatingCoolingState(this.Characteristic.TargetHeatingCoolingState.HEAT);
    }
    const { minValue = value, maxValue = value } = this.targetTemperatureProps;
    const targetTemp = Math.min(Math.max(value, minValue), maxValue).toString();
    try {
      this.deviceProps.targetTemp = targetTemp;
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
      Number(this.deviceProps.targetTemp),
    );
  }
}
