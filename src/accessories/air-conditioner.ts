import { isNumber } from '@shared';
import type { CharacteristicProps, CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';

enum HaierAcOperationMode {
  AUTO = '0',
  COOL = '1',
  DEHUMIDIFY = '2',
  HEAT = '4',
  FAN = '6',
}

export class AirConditionerAccessory extends BaseAccessory {
  init() {
    const thermostatService = this.setServices('thermostat', this.platform.Service.Thermostat);

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
    return Boolean(this.deviceProperties.indoorHumidity);
  }

  private get hasTargetHumidity() {
    return Boolean(this.deviceProperties.targetHumidity);
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
    const valueRange = this.deviceProperties.targetTemp?.valueRange;
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
    const { CurrentHeatingCoolingState } = this.Characteristic;
    if (!this.onOffStatus) {
      return CurrentHeatingCoolingState.OFF;
    }
    switch (this.deviceProperties.operationMode?.value) {
      case HaierAcOperationMode.COOL:
        return CurrentHeatingCoolingState.COOL;
      case HaierAcOperationMode.HEAT:
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
    switch (this.deviceProperties.operationMode?.value) {
      case HaierAcOperationMode.COOL:
        return TargetHeatingCoolingState.COOL;
      case HaierAcOperationMode.HEAT:
        return TargetHeatingCoolingState.HEAT;
      default:
        return TargetHeatingCoolingState.AUTO;
    }
  }

  setTargetHeatingCoolingState(value: CharacteristicValue) {
    const { TargetHeatingCoolingState } = this.Characteristic;
    if (value === TargetHeatingCoolingState.OFF) {
      return this.sendCommands({ onOffStatus: 'false' });
    }
    const modeMap = {
      [TargetHeatingCoolingState.AUTO]: HaierAcOperationMode.AUTO,
      [TargetHeatingCoolingState.COOL]: HaierAcOperationMode.COOL,
      [TargetHeatingCoolingState.HEAT]: HaierAcOperationMode.HEAT,
    };
    const operationMode = modeMap[value as keyof typeof modeMap];
    if (operationMode) {
      return this.sendCommands({ onOffStatus: 'true' }, { operationMode });
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
    return this.sendCommands(...args);
  }

  getTemperatureDisplayUnits() {
    if (this.deviceProperties.tempUnit?.value === '2') {
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
