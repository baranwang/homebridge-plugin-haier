import type { CharacteristicProps, CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';
import { isNumber } from '@shared';

export class AirConditionerAccessory extends BaseAccessory {
  async init() {
    this.setServices('thermostat', this.platform.Service.Thermostat);

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
    thermostatService
      .getCharacteristic(CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    thermostatService
      .getCharacteristic(TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    thermostatService.getCharacteristic(CurrentTemperature).onGet(this.getCurrentTemperature.bind(this));

    thermostatService
      .getCharacteristic(TargetTemperature)
      .setProps({ ...this.targetTemperatureProps })
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    thermostatService.getCharacteristic(TemperatureDisplayUnits).onGet(this.getTemperatureDisplayUnits.bind(this));

    if (this.hasIndoorHumidity) {
      thermostatService.getCharacteristic(CurrentRelativeHumidity).onGet(this.getCurrentRelativeHumidity.bind(this));
    }
    if (this.hasTargetHumidity) {
      thermostatService.getCharacteristic(TargetRelativeHumidity).onGet(this.getTargetRelativeHumidity.bind(this));
    }
    //#endregion
  }

  onDevDigitalModelUpdate() {
    const {
      CurrentHeatingCoolingState,
      TargetHeatingCoolingState,
      CurrentTemperature,
      TargetTemperature,
      CurrentRelativeHumidity,
      TargetRelativeHumidity,
    } = this.Characteristic;

    const thermostatService = this.services.thermostat;

    if (!thermostatService) {
      return;
    }

    if (isNumber(this.targetTemperature)) {
      thermostatService
        .getCharacteristic(TargetTemperature)
        .setProps({ ...this.targetTemperatureProps })
        .updateValue(this.targetTemperature);
    }

    if (isNumber(this.currentTemperature)) {
      thermostatService.getCharacteristic(CurrentTemperature).updateValue(this.currentTemperature);
    }

    thermostatService.getCharacteristic(CurrentHeatingCoolingState).updateValue(this.getCurrentHeatingCoolingState());

    thermostatService.getCharacteristic(TargetHeatingCoolingState).updateValue(this.getTargetHeatingCoolingState());

    if (this.hasIndoorHumidity) {
      thermostatService.getCharacteristic(CurrentRelativeHumidity).updateValue(this.getCurrentRelativeHumidity());
    }

    if (this.hasTargetHumidity) {
      thermostatService.getCharacteristic(TargetRelativeHumidity).updateValue(this.getTargetRelativeHumidity());
    }
  }

  private get hasIndoorHumidity() {
    return Boolean(this.devDigitalModelPropertiesMap.indoorHumidity);
  }

  private get hasTargetHumidity() {
    return Boolean(this.devDigitalModelPropertiesMap.targetHumidity);
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

  private get targetTemperatureProps():
    | Pick<CharacteristicProps, 'minValue' | 'maxValue' | 'minStep' | 'validValueRanges'>
    | undefined {
    const valueRange = this.devDigitalModelPropertiesMap.targetTemp?.valueRange;
    if (!valueRange || valueRange.type !== 'STEP') {
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

  getTargetHeatingCoolingState() {
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

  setTargetHeatingCoolingState(value: CharacteristicValue) {
    const { TargetHeatingCoolingState } = this.Characteristic;
    if (value === TargetHeatingCoolingState.OFF) {
      this.sendCommands({ onOffStatus: 'false' });
      return;
    }
    const modeMap = {
      [TargetHeatingCoolingState.AUTO]: '0',
      [TargetHeatingCoolingState.COOL]: '1',
      [TargetHeatingCoolingState.HEAT]: '4',
    };
    const operationMode = modeMap[value as keyof typeof modeMap];
    if (operationMode) {
      this.sendCommands({ onOffStatus: 'true' }, { operationMode });
      return;
    }
    this.platform.log.warn('Unsupported TargetHeatingCoolingState:', value);
  }

  getCurrentTemperature() {
    return this.currentTemperature;
  }

  getTargetTemperature() {
    return this.targetTemperature;
  }

  setTargetTemperature(value: CharacteristicValue) {
    const { minValue = 10, maxValue = 38 } = this.targetTemperatureProps ?? {};
    const targetTemperature = Math.min(Math.max(Number.parseFloat(value.toString()), minValue), maxValue).toString();
    const args: Record<string, string>[] = [{ targetTemperature }];
    if (!this.onOffStatus) {
      args.unshift({ onOffStatus: 'true' });
    }
    this.sendCommands(...args);
  }

  getTemperatureDisplayUnits() {
    if (this.devDigitalModelPropertiesMap.tempUnit?.value === '2') {
      return this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }
    return this.Characteristic.TemperatureDisplayUnits.CELSIUS;
  }

  getCurrentRelativeHumidity() {
    return this.getPropertyValue<number>('indoorHumidity');
  }

  getTargetRelativeHumidity() {
    return this.getPropertyValue<number>('targetHumidity');
  }
}
