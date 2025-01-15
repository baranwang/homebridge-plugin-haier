import type { DevDigitalModelProperty } from '@shared';
import { BiMap, inspectToString } from '@shared';
import type { CharacteristicValue } from 'homebridge';
import { BaseAccessory } from './base';

const serviceConfig = {
  refrigerator: {
    displayName: '冷藏室',
    currentTempKey: 'refrigeratorTemperatureC',
    targetTempKey: 'refrigeratorTargetTempLevel',
  },
  freezer: {
    displayName: '冷冻室',
    currentTempKey: 'freezerTemperatureC',
    targetTempKey: 'freezerTargetTempLevel',
  },
  vtRoom: {
    displayName: '变温室',
    currentTempKey: 'vtRoomTemperature',
    targetTempKey: 'vtRoomTargetTempLevel',
  },
};

export class FridgeAccessory extends BaseAccessory {
  async init() {
    await this.getDevDigitalModel();

    Object.entries(serviceConfig).forEach(([serviceName, { displayName, currentTempKey, targetTempKey }]) => {
      this.createTemperatureService(serviceName, displayName, currentTempKey, targetTempKey);
    });
  }

  getActive() {
    return this.deviceInfo.baseInfo.isOnline ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
  }

  getCurrentHeaterCoolerState() {
    return this.deviceInfo.baseInfo.isOnline
      ? this.Characteristic.CurrentHeaterCoolerState.COOLING
      : this.Characteristic.CurrentHeaterCoolerState.INACTIVE;
  }

  parseTemperature(temperatureStr?: string): number {
    return temperatureStr ? Number.parseInt(temperatureStr) : 0;
  }

  onDevDigitalModelUpdate() {
    Object.entries(serviceConfig).forEach(([serviceName, { currentTempKey, targetTempKey }]) => {
      const service = this.services[serviceName];
      if (!service) return;

      const currentTempProperty = this.devDigitalModelPropertiesMap[currentTempKey];
      const targetTempProperty = this.devDigitalModelPropertiesMap[targetTempKey];
      if (!currentTempProperty || !targetTempProperty) return;
      const temperatureMap = this.extractCelsiusDataMapping(targetTempProperty.valueRange.dataList);

      service
        .getCharacteristic(this.Characteristic.CurrentTemperature)
        .updateValue(this.parseTemperature(currentTempProperty.value));
      service
        .getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
        .updateValue(temperatureMap.get(targetTempProperty.value) ?? 0);
    });
  }

  createTemperatureService(serviceName: string, displayName: string, currentTempKey: string, targetTempKey: string) {
    const currentTempProperty = this.devDigitalModelPropertiesMap[currentTempKey];
    const targetTempProperty = this.devDigitalModelPropertiesMap[targetTempKey];

    if (!currentTempProperty || !targetTempProperty) return;
    this.setServices(serviceName, this.platform.Service.HeaterCooler, displayName);

    const temperatureMap = this.extractCelsiusDataMapping(targetTempProperty.valueRange.dataList);
    const targetTempValues = Array.from(temperatureMap.values());
    const minValue = Math.min(...targetTempValues);
    const maxValue = Math.max(...targetTempValues);
    const minStep = this.calculateStep(targetTempValues);
    const service = this.services[serviceName];

    service.getCharacteristic(this.Characteristic.Active).onGet(this.getActive.bind(this));

    service
      .getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentHeaterCoolerState.bind(this))
      .setValue(this.Characteristic.CurrentHeaterCoolerState.COOLING);

    service
      .getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .setValue(this.Characteristic.TargetHeaterCoolerState.COOL)
      .setProps({
        minValue: this.Characteristic.TargetHeaterCoolerState.COOL,
        maxValue: this.Characteristic.TargetHeaterCoolerState.COOL,
        validValues: [this.Characteristic.TargetHeaterCoolerState.COOL],
      })
      .onGet(() => this.Characteristic.TargetHeaterCoolerState.COOL)
      .onSet(() => {
        // 冰箱没有开关机的功能，只有制冷
        service
          .getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
          .updateValue(this.Characteristic.TargetHeaterCoolerState.COOL);
        service
          .getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
          .updateValue(this.Characteristic.CurrentHeaterCoolerState.COOLING);
      })
      .setValue(this.Characteristic.TargetHeaterCoolerState.COOL);

    service
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => this.parseTemperature(currentTempProperty.value));

    service
      .getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
      .setValue(temperatureMap.get(targetTempProperty.value) ?? 0)
      .setProps({
        minValue,
        maxValue,
        minStep,
        validValues: targetTempValues,
      })
      .onGet(() => temperatureMap.get(targetTempProperty.value) ?? 0)
      .onSet((value) => {
        const targetLevel = temperatureMap.getKey(Number.parseInt(value.toString()));
        if (targetLevel) {
          this.sendCommands({ [targetTempKey]: targetLevel });
        }
      });
  }

  private extractCelsiusDataMapping(dataList: DevDigitalModelProperty['valueRange']['dataList']) {
    const celsiusRegex = /(-?\d+)℃/;
    const mapping = new BiMap<string, number>();
    dataList.forEach((item) => {
      const match = item.desc.match(celsiusRegex); // 匹配摄氏度
      if (match) {
        const celsius = match[1]; // 获取摄氏度的值
        mapping.set(item.data, Number.parseInt(celsius, 10));
      }
    });
    return mapping;
  }

  private calculateStep(targetTempValues: number[]) {
    const step = Math.min(
      ...targetTempValues.map((value, index, array) => {
        if (index === 0) {
          return array[index + 1] - value;
        }
        return value - array[index - 1];
      }),
    );
    return step;
  }
}
