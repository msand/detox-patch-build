const _ = require('lodash');
const Environment = require('../../utils/environment');
const path = require('path');
const exec = require('../../utils/exec').execWithRetriesAndLogs;
const egrep = require('../../utils/pipeCommands').search.fragment;
const fsext = require('../../utils/fsext');

class AAPT {

  constructor() {
    this.aaptBin = null;
  }

  async _prepare() {
    if (!this.aaptBin) {
      const sdkPath = Environment.getAndroidSDKPath();
      const buildToolsDirs = await fsext.getDirectories(path.join(sdkPath, 'build-tools'));
      const latestBuildToolsVersion = _.last(buildToolsDirs);
      this.aaptBin = path.join(sdkPath, 'build-tools', latestBuildToolsVersion, 'aapt');
    }
  }

  async getPackageName(apkPath) {
    await this._prepare();
    const process = await exec(
      `${this.aaptBin} dump badging "${apkPath}" | ${egrep("package: name=")}`,
      undefined, undefined, 1
    );

    const packageName = new RegExp(/package: name='([^']+)'/g).exec(process.stdout);
    return packageName[1];
  }
}

module.exports = AAPT;
