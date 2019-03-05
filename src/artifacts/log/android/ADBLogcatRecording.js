const Artifact = require('../../templates/artifact/Artifact');
const DetoxRuntimeError = require('../../../errors/DetoxRuntimeError');
const { interruptProcess } = require('../../../utils/exec');
const retry = require('../../../utils/retry');
const sleep = require('../../../utils/sleep');

class ADBLogcatRecording extends Artifact {
  constructor({
    adb,
    deviceId,
    pid,
    pathToLogOnDevice,
  }) {
    super();
    this.adb = adb;

    this.deviceId = deviceId;
    this.pid = pid;

    this.pathToLogOnDevice = pathToLogOnDevice;
    this.processPromise = null;

    this._waitUntilLogFileIsCreated = null;
    this._waitWhileLogIsOpenedByLogcat = null;
  }

  async doStart({ pid } = {}) {
    if (pid) {
      this.pid = pid;
    }

    const now = await this.adb.now(this.deviceId);

    await this._waitWhileLogIsOpenedByLogcat; // in case if log recording restarted
    this.processPromise = this.adb.logcat(this.deviceId, {
      file: this.pathToLogOnDevice,
      pid: this.pid,
      time: now,
    });

    this._waitUntilLogFileIsCreated = sleep(300).then(() => {
      return retry(() => this._assertLogIsCreated());
    });
  }

  async doStop() {
    try {
      await this._waitUntilLogFileIsCreated;
    } finally {
      if (this.processPromise) {
        const processPromise = this.processPromise;

        this._waitWhileLogIsOpenedByLogcat = sleep(300)
          .then(() => interruptProcess(processPromise))
          .then(() => { this.processPromise = null; });
      }
    }
  }

  async doSave(artifactPath) {
    await this._waitWhileLogIsOpenedByLogcat;
    await this.adb.pull(this.deviceId, this.pathToLogOnDevice, artifactPath);
    await this.adb.rm(this.deviceId, this.pathToLogOnDevice);
  }

  async doDiscard() {
    await this._waitWhileLogIsOpenedByLogcat;
    await this.adb.rm(this.deviceId, this.pathToLogOnDevice);
  }

  async _assertLogIsCreated() {
    const size = await this.adb.getFileSize(this.deviceId, this.pathToLogOnDevice);

    if (size < 0) {
      throw new DetoxRuntimeError({
        message: `The log is not being recorded on device (${this.deviceId}) at path: ${this.pathToLogOnDevice}`,
      });
    }
  }
}

module.exports = ADBLogcatRecording;