import type { DevDigitalModelProperty } from '@shared';
import { BiMap, inspectToString } from '@shared';
import type { CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';

export class FridgeAccessory extends BaseAccessory {
  async init() {
    await this.getDevDigitalModel();

    this.createTemperatureService(
      'refrigerator',
      '冷藏室',
      'refrigeratorTemperatureC',
      'refrigeratorTargetTempLevel'
    );

    this.createTemperatureService(
      'freezer',
      '冷冻室',
      'freezerTemperatureC',
      'freezerTargetTempLevel'
    );

    this.createTemperatureService(
      'vtRoom',
      '变温室',
      'vtRoomTemperature',
      'vtRoomTargetTempLevel'
    );
  }

  getActive() {
    return this.deviceInfo.baseInfo.isOnline ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
  }

  parseTemperature(temperatureStr?: string): number {
    return temperatureStr ? Number.parseInt(temperatureStr, 10) : 0;
  }

  onDevDigitalModelUpdate() { }

  createTemperatureService(serviceName: string,
    displayName: string,
    currentTempKey: string,
    targetTempKey: string) {
    const currentTempProperty = this.devDigitalModelPropertiesMap[currentTempKey];
    const targetTempProperty = this.devDigitalModelPropertiesMap[targetTempKey];

    if (!currentTempProperty || !targetTempProperty) return;

    const temperatureMap = this.extractCelsiusDataMapping(targetTempProperty.valueRange.dataList);

    this.setServices(serviceName, this.platform.Service.HeaterCooler, displayName);
    const service = this.services[serviceName];

    service
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.getActive.bind(this));

    service
      .getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .setValue(this.Characteristic.CurrentHeaterCoolerState.COOLING);

    service
      .getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .setProps({
        minValue: this.Characteristic.TargetHeaterCoolerState.COOL,
        maxValue: this.Characteristic.TargetHeaterCoolerState.COOL,
        validValues: [this.Characteristic.TargetHeaterCoolerState.COOL],
      })
      .setValue(this.Characteristic.TargetHeaterCoolerState.COOL);

    service
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({
        maxValue: Number.parseInt(currentTempProperty.valueRange.dataStep.maxValue),
        minValue: Number.parseInt(currentTempProperty.valueRange.dataStep.minValue),
        minStep: Number.parseInt(currentTempProperty.valueRange.dataStep.step),
      })
      .onGet(() => this.parseTemperature(currentTempProperty.value));

    service
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .setProps({
        minValue: Math.min(...Array.from(temperatureMap.values())),
        maxValue: Math.max(...Array.from(temperatureMap.values())),
      })
      .onGet(() => temperatureMap.get(targetTempProperty.value) ?? 0)
      .onSet(async (value: CharacteristicValue) => {
        const targetLevel = temperatureMap.getKey(Number.parseInt(value.toString(), 10));
        if (targetLevel) {
          await this.sendCommands({ [targetTempKey]: targetLevel });
        }
      });
  }

  private extractCelsiusDataMapping(dataList: DevDigitalModelProperty['valueRange']['dataList']) {
    const celsiusRegex = /(-?\d+)℃/;
    const mapping = new BiMap<string, number>();
    dataList.forEach(item => {
      const match = item.desc.match(celsiusRegex); // 匹配摄氏度
      if (match) {
        const celsius = match[1]; // 获取摄氏度的值
        mapping.set(item.data, Number.parseInt(celsius, 10));
      }
    });
    return mapping;
  }
}
