import { BaseAccessory } from './base';

import type { CharacteristicProps, CharacteristicValue } from 'homebridge';

export class AirConditionerAccessory extends BaseAccessory {
  constructor(platform, accessory) {
    super(platform, accessory);
    this.init();
  }

  async init() {
    await this.getDevDigitalModel();

    this.generateServices([this.platform.Service.Thermostat]);

    const {
      CurrentHeatingCoolingState,
      TargetHeatingCoolingState,
      CurrentTemperature,
      TargetTemperature,
      TemperatureDisplayUnits,
      CurrentRelativeHumidity,
      TargetRelativeHumidity,
    } = this.Characteristic;

    //#region Thermostat
    this.services[0].getCharacteristic(CurrentHeatingCoolingState).onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.services[0]
      .getCharacteristic(TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.services[0].getCharacteristic(CurrentTemperature).onGet(this.getCurrentTemperature.bind(this));

    this.services[0]
      .getCharacteristic(TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this))
      .setProps(this.targetTemperatureProps);

    this.services[0].getCharacteristic(TemperatureDisplayUnits).onGet(this.getTemperatureDisplayUnits.bind(this));

    if (this.devDigitalModelPropertiesMap.indoorHumidity) {
      this.services[0].getCharacteristic(CurrentRelativeHumidity).onGet(this.getCurrentRelativeHumidity.bind(this));
    }
    if (this.devDigitalModelPropertiesMap.targetHumidity) {
      this.services[0].getCharacteristic(TargetRelativeHumidity).onGet(this.getTargetRelativeHumidity.bind(this));
    }
    //#endregion
  }

  onDevDigitalModelUpdate() {
    this.services[0].getCharacteristic(this.Characteristic.TargetTemperature).setProps(this.targetTemperatureProps);
  }

  private get targetTemperatureProps(): Partial<CharacteristicProps> {
    const { minValue, maxValue, step } =
      this.devDigitalModelPropertiesMap?.targetTemperature?.valueRange.dataStep ?? {};
    return {
      minValue: minValue ? Number(minValue) : 10,
      maxValue: maxValue ? Number(maxValue) : 38,
      minStep: step ? Number(step) : 0.1,
    };
  }

  private get onOffStatus() {
    const onOffStatus: boolean = JSON.parse(this.devDigitalModelPropertiesMap.onOffStatus.value);
    return onOffStatus;
  }

  private get currentTemperature() {
    const indoorTemperature: number = JSON.parse(this.devDigitalModelPropertiesMap.indoorTemperature.value);
    return indoorTemperature;
  }

  private get targetTemperature() {
    const targetTemperature: number = JSON.parse(this.devDigitalModelPropertiesMap.targetTemperature.value);
    return targetTemperature;
  }

  async getCurrentHeatingCoolingState() {
    await this.getDevDigitalModel();
    const { CurrentHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return CurrentHeatingCoolingState.OFF;
    }
    const mode: string = this.devDigitalModelPropertiesMap.operationMode.value;
    switch (mode) {
      case '1':
        return CurrentHeatingCoolingState.COOL;
      case '4':
        return CurrentHeatingCoolingState.HEAT;
      default: {
        if (this.currentTemperature > this.targetTemperature) {
          return CurrentHeatingCoolingState.COOL;
        } else {
          return CurrentHeatingCoolingState.HEAT;
        }
      }
    }
  }

  async getTargetHeatingCoolingState() {
    await this.getDevDigitalModel();
    const { TargetHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return TargetHeatingCoolingState.OFF;
    }
    const mode: string = this.devDigitalModelPropertiesMap.operationMode.value;
    switch (mode) {
      case '1':
        return TargetHeatingCoolingState.COOL;
      case '4':
        return TargetHeatingCoolingState.HEAT;
      default:
        return TargetHeatingCoolingState.AUTO;
    }
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    const { TargetHeatingCoolingState } = this.Characteristic;

    if (value === TargetHeatingCoolingState.OFF) {
      await this.sendCommands({ onOffStatus: 'false' });
      return;
    }
    const modeMap = {
      [TargetHeatingCoolingState.AUTO]: '0',
      [TargetHeatingCoolingState.COOL]: '1',
      [TargetHeatingCoolingState.HEAT]: '4',
    };
    const operationMode = modeMap[value as number];
    if (operationMode) {
      await this.sendCommands({ onOffStatus: 'true' }, { operationMode });
      return;
    }
    this.platform.log.warn('Unsupported TargetHeatingCoolingState:', value);
  }

  async getCurrentTemperature() {
    await this.getDevDigitalModel();
    return this.currentTemperature;
  }

  async getTargetTemperature() {
    await this.getDevDigitalModel();
    return this.targetTemperature;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    const args: Record<string, unknown>[] = [{ targetTemperature: value.toString() }];
    if (!this.onOffStatus) {
      args.unshift({ onOffStatus: 'true' });
    }
    await this.sendCommands(...args);
  }

  async getTemperatureDisplayUnits() {
    await this.getDevDigitalModel();
    if (this.devDigitalModelPropertiesMap.tempUnit?.value === '2') {
      return this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }
    return this.Characteristic.TemperatureDisplayUnits.CELSIUS;
  }

  async getCurrentRelativeHumidity() {
    await this.getDevDigitalModel();
    const indoorHumidity: number = JSON.parse(this.devDigitalModelPropertiesMap.indoorHumidity.value);
    return indoorHumidity;
  }

  async getTargetRelativeHumidity() {
    await this.getDevDigitalModel();
    const targetHumidity: number = JSON.parse(this.devDigitalModelPropertiesMap.targetHumidity.value);
    return targetHumidity;
  }
}
