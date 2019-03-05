const _ = require('lodash');
const path = require('path');
const Emulator = require('../android/Emulator');
const EmulatorTelnet = require('../android/EmulatorTelnet');
const DetoxRuntimeError = require('../../errors/DetoxRuntimeError');
const Environment = require('../../utils/environment');
const retry = require('../../utils/retry');
const sleep = require('../../utils/sleep');
const AndroidDriver = require('./AndroidDriver');
const ini = require('ini');
const fs = require('fs');
const os = require('os');

class EmulatorDriver extends AndroidDriver {
  constructor(config) {
    super(config);

    this.emulator = new Emulator();
  }

  async _fixEmulatorConfigIniSkinName(name) {
    const configFile = `${os.homedir()}/.android/avd/${name}.avd/config.ini`;
    const config = ini.parse(fs.readFileSync(configFile, 'utf-8'));

    if (!config['skin.name']) {
      const width = config['hw.lcd.width'];
      const height = config['hw.lcd.height'];

      if (width === undefined || height === undefined) {
        throw new Error(`Emulator with name ${name} has a corrupt config.ini file (${configFile}), try fixing it by recreating an emulator.`);
      }

      config['skin.name'] = `${width}x${height}`;
      fs.writeFileSync(configFile, ini.stringify(config));
    }
    return config;
  }

  async boot(avdName) {
    let adbName = await this._findADBNameByAVDName(avdName, { strict: false });
    const coldBoot = adbName == null;

    // If it's not already running, start it now.
    if (coldBoot) {
      await this.emulator.boot(avdName);
      adbName = await this._findADBNameByAVDName(avdName, { strict: true });
    }

    await this._waitForBootToComplete(adbName);
    await this.emitter.emit('bootDevice', { coldBoot, deviceId: adbName });

    return adbName;
  }

  async _findADBNameByAVDName(avdName, { strict }) {
    const adbDevices = await this.adb.devices();
    const filteredDevices = _.filter(adbDevices, {type: 'emulator', name: avdName});

    if (filteredDevices.length === 1) {
      return filteredDevices[0].adbName;
    }

    if (filteredDevices.length > 1) {
      throw new Error(`Got more than one device corresponding to the name: ${avdName}`);
    }

    if (strict) {
      throw new Error(`Could not find '${avdName}' on the currently ADB attached devices, 
      try restarting adb 'adb kill-server && adb start-server'`);
    }

    return null;
  }

  async acquireFreeDevice(avdName) {
    const avds = await this.emulator.listAvds();

    if (!avds) {
      const avdmanagerPath = path.join(Environment.getAndroidSDKPath(), 'tools', 'bin', 'avdmanager');

      throw new Error(`Could not find any configured Android Emulator. 
      Try creating a device first, example: ${avdmanagerPath} create avd --force --name Nexus_5X_API_24 --abi x86 --package 'system-images;android-24;google_apis_playstore;x86' --device "Nexus 5X"
      or go to https://developer.android.com/studio/run/managing-avds.html for details on how to create an Emulator.`);
    }

    if (_.indexOf(avds, avdName) === -1) {
      throw new Error(`Can not boot Android Emulator with the name: '${avdName}',
      make sure you choose one of the available emulators: ${avds.toString()}`);
    }

    await this._fixEmulatorConfigIniSkinName(avdName);

    const adbName = await this.boot(avdName);
    await this.adb.apiLevel(adbName);
    await this.adb.unlockScreen(adbName);

    return adbName;
  }

  async _waitForBootToComplete(deviceId) {
    await retry({ retries: 120, interval: 5000 }, async () => {
      const isBootComplete = await this.adb.isBootComplete(deviceId);

      if (!isBootComplete) {
        throw new DetoxRuntimeError({
          message: `Android device ${deviceId} has not completed its boot yet.`,
        });
      }
    });
  }

  async shutdown(deviceId) {
    const port = _.split(deviceId, '-')[1];
    const telnet = new EmulatorTelnet();
    await telnet.connect(port);
    await telnet.kill();
    await this.emitter.emit('shutdownDevice', { deviceId });
  }
}

module.exports = EmulatorDriver;
