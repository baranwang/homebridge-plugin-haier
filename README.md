<p align="center">

<img src="https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# 海尔智家 Homebridge 插件

目前支持的设备：

- [x] 空调（经过测试的有卡萨帝的壁挂空调和海尔的风管机，如果有不支持的型号可以提 issue）
- [x] 热水器 (感谢 [@zwb124](https://github.com/zwb124) 提供设备支持)
- [x] 冰箱

计划支持的设备：

- [ ] 更多……

## 自定义配置

```jsonc
{
  "name": "homebridge-plugin-haier",
  "platform": "HaierHomebridgePlugin",
  "username": "你的海尔账号",
  "password": "你的海尔密码",
  "familyId": "你的家庭 ID",
  "deviceId": "你的设备 ID",
  "disabledDevices": [], // 禁用的设备 ID
  "customConfig": {
    "hotWater": {
      "zeroColdWaterMode": "4" // 开启零冷水时使用的模式，1: 单次循环, 2: 定时循环, 3: 水动循环, 4: 云智慧循环, 10: 半管循环
    }
  }
}
