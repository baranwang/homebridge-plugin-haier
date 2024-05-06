import { BaseAccessory } from './base';

import type { CharacteristicProps, CharacteristicValue } from 'homebridge';

export class AirConditionerAccessory extends BaseAccessory {
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
      CurrentRelativeHumidity,
      TargetRelativeHumidity,
    } = this.Characteristic;

    //#region Thermostat
    this.services.thermostat
      .getCharacteristic(CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.services.thermostat
      .getCharacteristic(TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.services.thermostat.getCharacteristic(CurrentTemperature).onGet(this.getCurrentTemperature.bind(this));

    this.services.thermostat
      .getCharacteristic(TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this))
      .setProps(this.targetTemperatureProps);

    this.services.thermostat
      .getCharacteristic(TemperatureDisplayUnits)
      .onGet(this.getTemperatureDisplayUnits.bind(this));

    if (this.devProps.indoorHumidity) {
      this.services.thermostat
        .getCharacteristic(CurrentRelativeHumidity)
        .onGet(this.getCurrentRelativeHumidity.bind(this));
    }
    if (this.devProps.targetHumidity) {
      this.services.thermostat
        .getCharacteristic(TargetRelativeHumidity)
        .onGet(this.getTargetRelativeHumidity.bind(this));
    }
    //#endregion
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
    const onOffStatus: boolean = JSON.parse(this.devProps.onOffStatus);
    return onOffStatus;
  }

  private get currentTemperature() {
    const indoorTemperature: number = JSON.parse(this.devProps.indoorTemperature);
    return indoorTemperature;
  }

  private get targetTemperature() {
    const targetTemperature: number = JSON.parse(this.devProps.targetTemperature);
    return targetTemperature;
  }

  get currentHeatingCoolingState() {
    const { CurrentHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return CurrentHeatingCoolingState.OFF;
    }
    const mode: string = this.devProps.operationMode;
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

  async getCurrentHeatingCoolingState() {
    await this.getDevDigitalModel();
    return this.currentHeatingCoolingState;
  }

  get targetHeatingCoolingState() {
    const { TargetHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return TargetHeatingCoolingState.OFF;
    }
    const mode: string = this.devProps.operationMode;
    switch (mode) {
      case '1':
        return TargetHeatingCoolingState.COOL;
      case '4':
        return TargetHeatingCoolingState.HEAT;
      default:
        return TargetHeatingCoolingState.AUTO;
    }
  }

  async getTargetHeatingCoolingState() {
    await this.getDevDigitalModel();
    return this.targetHeatingCoolingState;
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    const { TargetHeatingCoolingState } = this.Characteristic;

    if (value === TargetHeatingCoolingState.OFF) {
      this.devProps.onOffStatus = 'false';
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

  get currentRelativeHumidity() {
    const indoorHumidity: number = JSON.parse(this.devProps.indoorHumidity);
    return indoorHumidity;
  }

  async getCurrentRelativeHumidity() {
    await this.getDevDigitalModel();
    return this.currentRelativeHumidity;
  }

  get targetRelativeHumidity() {
    const targetHumidity: number = JSON.parse(this.devProps.targetHumidity);
    return targetHumidity;
  }

  async getTargetRelativeHumidity() {
    await this.getDevDigitalModel();
    return this.targetRelativeHumidity;
  }

  onDevDigitalModelUpdate() {
    if (!this.services.thermostat) {
      return;
    }
    const {
      TargetTemperature,
      CurrentTemperature,
      CurrentHeatingCoolingState,
      TargetHeatingCoolingState,
      CurrentRelativeHumidity,
      TargetRelativeHumidity,
    } = this.Characteristic;

    this.services.thermostat
      .getCharacteristic(TargetTemperature)
      .setProps(this.targetTemperatureProps)
      .updateValue(this.targetTemperature);

    this.services.thermostat.updateCharacteristic(TargetTemperature, this.targetTemperature);
    this.services.thermostat.updateCharacteristic(CurrentTemperature, this.currentTemperature);

    this.services.thermostat.updateCharacteristic(CurrentHeatingCoolingState, this.currentHeatingCoolingState);

    this.services.thermostat.updateCharacteristic(TargetHeatingCoolingState, this.targetHeatingCoolingState);

    if (this.devProps.indoorHumidity) {
      this.services.thermostat.updateCharacteristic(CurrentRelativeHumidity, this.currentRelativeHumidity);
    }
    if (this.devProps.targetHumidity) {
      this.services.thermostat.updateCharacteristic(TargetRelativeHumidity, this.targetRelativeHumidity);
    }
  }
}
