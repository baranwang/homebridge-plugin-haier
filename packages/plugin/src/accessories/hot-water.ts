import { CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';

export class HotWaterAccessory extends BaseAccessory {
  constructor(platform, accessory) {
    super(platform, accessory);
    this.init();
  }

  async init() {
    this.generateServices([this.platform.Service.HeaterCooler, this.platform.Service.TemperatureSensor]);

    await this.getDevDigitalModel();

    //#region HeaterCooler
    // 开关
    this.services[0]
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    // 当前状态，只支持加热
    this.services[0]
      .getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
    this.services[0]
      .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .setProps({
        // minValue: this.platform.Characteristic.TargetHeaterCoolerState.HEAT,
        maxValue: this.platform.Characteristic.TargetHeaterCoolerState.HEAT,
        validValues: [this.platform.Characteristic.TargetHeaterCoolerState.HEAT],
      })
      .onGet(() => this.platform.Characteristic.TargetHeaterCoolerState.HEAT);

    // 当前温度
    this.services[0]
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(this.getTargetTemperature.bind(this));

    // 目标温度
    this.services[0]
      .getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .setProps(this.targetTemperatureProps)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));
    //#endregion

    // 进水水温传感器
    this.services[1].getCharacteristic(this.Characteristic.CurrentTemperature).onGet(() => this.inWaterTemperature);
  }

  private get onOffStatus() {
    const onOffStatus: boolean = JSON.parse(this.devDigitalModelPropertiesMap.onOffStatus.value);
    return onOffStatus;
  }

  private get targetTemperature() {
    const targetTemp: number = JSON.parse(this.devDigitalModelPropertiesMap.targetTemp.value);
    return targetTemp;
  }

  private get targetTemperatureProps() {
    const { maxValue, minValue, step } = this.devDigitalModelPropertiesMap.targetTemp.valueRange.dataStep;
    return {
      minValue: Number(minValue),
      maxValue: Number(maxValue),
      minStep: Number(step),
    };
  }

  private get inWaterTemperature() {
    const inWaterTemp: number = JSON.parse(this.devDigitalModelPropertiesMap.inWaterTemp.value);
    return inWaterTemp;
  }

  getActive() {
    return this.onOffStatus ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
  }

  async setActive(value: CharacteristicValue) {
    await this.sendCommands({ onOffStatus: (!!value).toString() });
  }

  getTargetTemperature() {
    return this.targetTemperature;
  }

  setTargetTemperature(value: CharacteristicValue) {
    const { minValue, maxValue } = this.targetTemperatureProps;
    const targetTemp = Math.min(Math.max(value as number, minValue), maxValue).toString();
    this.sendCommands({ targetTemp });
  }
}
