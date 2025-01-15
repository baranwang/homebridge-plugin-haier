import type { CharacteristicProps, CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';

export class AirConditionerAccessory extends BaseAccessory {
  async init() {
    this.setServices('thermostat', this.platform.Service.Thermostat)

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

    const thermostatService = this.services.thermostat;

    //#region Thermostat
    thermostatService.getCharacteristic(CurrentHeatingCoolingState).onGet(this.getCurrentHeatingCoolingState.bind(this));

    thermostatService
      .getCharacteristic(TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    thermostatService.getCharacteristic(CurrentTemperature).onGet(this.getCurrentTemperature.bind(this));

    thermostatService
      .getCharacteristic(TargetTemperature)
      .setProps(this.targetTemperatureProps)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this))

    thermostatService.getCharacteristic(TemperatureDisplayUnits).onGet(this.getTemperatureDisplayUnits.bind(this));

    if (this.devDigitalModelPropertiesMap.indoorHumidity) {
      thermostatService.getCharacteristic(CurrentRelativeHumidity).onGet(this.getCurrentRelativeHumidity.bind(this));
    }
    if (this.devDigitalModelPropertiesMap.targetHumidity) {
      thermostatService.getCharacteristic(TargetRelativeHumidity).onGet(this.getTargetRelativeHumidity.bind(this));
    }
    //#endregion
  }

  onDevDigitalModelUpdate() {
    this.services.thermostat?.getCharacteristic(this.Characteristic.TargetTemperature).setProps(this.targetTemperatureProps);
  }

  private get targetTemperatureProps(): Partial<CharacteristicProps> {
    const { minValue, maxValue, step } =
      this.devDigitalModelPropertiesMap?.targetTemperature?.valueRange.dataStep ?? {};
    return {
      minValue: Number.parseFloat(minValue ?? '10'),
      maxValue: Number.parseFloat(maxValue ?? '38'),
      minStep: Number.parseFloat(step ?? '0.1'),
    };
  }

  private get onOffStatus() {
    return this.getPropertyValue<boolean>('onOffStatus', false);
  }

  private get currentTemperature() {
    return this.getPropertyValue<number>('indoorTemperature');
  }

  private get targetTemperature() {
    return this.getPropertyValue<number>('targetTemperature');
  }

  async getCurrentHeatingCoolingState() {
    await this.getDevDigitalModel();
    const { CurrentHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return CurrentHeatingCoolingState.OFF;
    }
    switch (this.devDigitalModelPropertiesMap.operationMode?.value) {
      case '1':
        return CurrentHeatingCoolingState.COOL;
      case '4':
        return CurrentHeatingCoolingState.HEAT;
      default: {
        if (this.currentTemperature ?? 0 > (this.targetTemperature ?? 0)) {
          return CurrentHeatingCoolingState.COOL;
        }
        return CurrentHeatingCoolingState.HEAT;
      }
    }
  }

  async getTargetHeatingCoolingState() {
    await this.getDevDigitalModel();
    const { TargetHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return TargetHeatingCoolingState.OFF;
    }
    switch (this.devDigitalModelPropertiesMap.operationMode?.value) {
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
    const operationMode = modeMap[value as keyof typeof modeMap];
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
    return this.getPropertyValue<number>('indoorHumidity');
  }

  async getTargetRelativeHumidity() {
    await this.getDevDigitalModel();
    return this.getPropertyValue<number>('targetHumidity');
  }
}
