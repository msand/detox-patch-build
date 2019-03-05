#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const cp = require('child_process');
const fs = require('fs-extra');
const _ = require('lodash');
const environment = require('../src/utils/environment');
const buildDefaultArtifactsRootDirpath = require('../src/artifacts/utils/buildDefaultArtifactsRootDirpath');
const DetoxConfigError = require('../src/errors/DetoxConfigError');
const config = require(path.join(process.cwd(), 'package.json')).detox;

program
  .allowUnknownOption()
  .option('-o, --runner-config [config]',
    `Test runner config file, defaults to e2e/mocha.opts for mocha and e2e/config.json' for jest`)
  .option('-s, --specs [relativePath]',
    `Root of test folder`)
  .option('-l, --loglevel [value]',
    'Log level: fatal, error, warn, info, verbose, trace')
  .option('--no-color',
    'Disable colors in log output')
  .option('-c, --configuration [device configuration]',
    'Select a device configuration from your defined configurations, if not supplied, and there\'s only one configuration, detox will default to it', getDefaultConfiguration())
  .option('-r, --reuse',
    'Reuse existing installed app (do not delete and re-install) for a faster run.')
  .option('-u, --cleanup',
    'Shutdown simulator when test is over, useful for CI scripts, to make sure detox exists cleanly with no residue')
  .option('-d, --debug-synchronization [value]',
    'When an action/expectation takes a significant amount of time use this option to print device synchronization status.'
    + 'The status will be printed if the action takes more than [value]ms to complete')
  .option('-a, --artifacts-location [path]',
    '[EXPERIMENTAL] Artifacts (logs, screenshots, etc) root directory.', 'artifacts')
  .option('--record-logs [failing|all|none]',
    '[EXPERIMENTAL] Save logs during each test to artifacts directory. Pass "failing" to save logs of failing tests only.')
  .option('--take-screenshots [failing|all|none]',
    '[EXPERIMENTAL] Save screenshots before and after each test to artifacts directory. Pass "failing" to save screenshots of failing tests only.')
  .option('--record-videos [failing|all|none]',
    '[EXPERIMENTAL] Save screen recordings of each test to artifacts directory. Pass "failing" to save recordings of failing tests only.')
  .option('-p, --platform [ios/android]',
    '[DEPRECATED], platform is deduced automatically. Run platform specific tests. Runs tests with invert grep on \':platform:\', '
    + 'e.g test with substring \':ios:\' in its name will not run when passing \'--platform android\'')
  .option('-f, --file [path]',
    'Specify test file to run')
  .option('-H, --headless',
    '[Android Only] Launch Emulator in headless mode. Useful when running on CI.')
  .option('-w, --workers <n>',
    '[iOS Only] Specifies number of workers the test runner should spawn, requires a test runner with parallel execution support (Detox CLI currently supports Jest)', 1)
  .option('-n, --device-name [name]',
    'Override the device name specified in a configuration. Useful for running a single build configuration on multiple devices.')
  .parse(process.argv);

program.artifactsLocation = buildDefaultArtifactsRootDirpath(program.configuration, program.artifactsLocation);

clearDeviceRegistryLockFile();

if (!program.configuration) {
  throw new DetoxConfigError(`Cannot determine which configuration to use.
  Use --configuration to choose one of the following: ${_.keys(config.configurations).join(', ')}`);
}

if (!config.configurations[program.configuration]) {
  throw new DetoxConfigError(`Cannot determine configuration '${program.configuration}'.
    Available configurations: ${_.keys(config.configurations).join(', ')}`);
}

const testFolder = getConfigFor(['file', 'specs'], 'e2e');
const runner = getConfigFor(['testRunner'], 'mocha');
const runnerConfig = getConfigFor(['runnerConfig'], getDefaultRunnerConfig());
const platform = (config.configurations[program.configuration].type).split('.')[0];

if (platform === 'android' && program.workers !== 1) {
  throw new DetoxConfigError('Can not use -w, --workers. Parallel test execution is only supported on iOS currently');
}

if (typeof program.debugSynchronization === "boolean") {
  program.debugSynchronization = 3000;
}

function run() {
  switch (runner) {
    case 'mocha':
      runMocha();
      break;
    case 'jest':
      runJest();
      break;
    default:
      throw new Error(`${runner} is not supported in detox cli tools. You can still run your tests with the runner's own cli tool`);
  }
}

function collectExtraArgs() {
  const parsed = program.parseOptions(program.normalize(process.argv.slice(2)));

  if (parsed && Array.isArray(parsed.unknown) && parsed.unknown.length > 0) {
    return parsed.unknown.join(' ');
  }

  return '';
}

function getConfigFor(keys, fallback) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyKebabCase = camelToKebabCase(key);
    const result = program[key] || config[key] || config[keyKebabCase];
    if (result) return result;
  }

  return fallback;
}

function camelToKebabCase(string) {
  return string.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function runMocha() {
  const loglevel = program.loglevel ? `--loglevel ${program.loglevel}` : '';
  const configuration = program.configuration ? `--configuration ${program.configuration}` : '';
  const cleanup = program.cleanup ? `--cleanup` : '';
  const reuse = program.reuse ? `--reuse` : '';
  const artifactsLocation = program.artifactsLocation ? `--artifacts-location "${program.artifactsLocation}"` : '';
  const configFile = runnerConfig ? `--opts ${runnerConfig}` : '';
  const platformString = platform ? `--grep ${getPlatformSpecificString(platform)} --invert` : '';
  const logs = program.recordLogs ? `--record-logs ${program.recordLogs}` : '';
  const screenshots = program.takeScreenshots ? `--take-screenshots ${program.takeScreenshots}` : '';
  const videos = program.recordVideos ? `--record-videos ${program.recordVideos}` : '';
  const headless = program.headless ? `--headless` : '';
  const color = program.color ? '' : '--no-colors';
  const deviceName = program.deviceName ? `--device-name "${program.deviceName}"` : '';

  const debugSynchronization = program.debugSynchronization ? `--debug-synchronization ${program.debugSynchronization}` : '';
  const binPath = path.join('node_modules', '.bin', 'mocha');
  const command = `${binPath} ${testFolder} ${configFile} ${configuration} ${loglevel} ${color} ` +
    `${cleanup} ${reuse} ${debugSynchronization} ${platformString} ${headless} ` +
    `${logs} ${screenshots} ${videos} ${artifactsLocation} ${deviceName} ${collectExtraArgs()}`;

  console.log(command);
  cp.execSync(command, {stdio: 'inherit'});
}

function runJest() {
  const configFile = runnerConfig ? `--config=${runnerConfig}` : '';

  const platformString = platform ? shellQuote(`--testNamePattern=^((?!${getPlatformSpecificString(platform)}).)*$`) : '';
  const binPath = path.join('node_modules', '.bin', 'jest');
  const quotedTestFolder = `"${testFolder}"`
  const color = program.color ? '' : ' --no-color';
  const command = `${binPath} ${quotedTestFolder} ${configFile}${color} --maxWorkers=${program.workers} ${platformString} ${collectExtraArgs()}`;
  const detoxEnvironmentVariables = {
    configuration: program.configuration,
    loglevel: program.loglevel,
    cleanup: program.cleanup,
    reuse: program.reuse,
    debugSynchronization: program.debugSynchronization,
    headless: program.headless,
    artifactsLocation: program.artifactsLocation,
    recordLogs: program.recordLogs,
    takeScreenshots: program.takeScreenshots,
    recordVideos: program.recordVideos,
    deviceName: program.deviceName
  };

  console.log(printEnvironmentVariables(detoxEnvironmentVariables) + command);
  cp.execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...detoxEnvironmentVariables,
    },
  });
}

function printEnvironmentVariables(envObject) {
  return Object.entries(envObject).reduce((cli, [key, value]) => {
    if (value === null || value === undefined || value === '') {
      return cli;
    }

    return `${cli}${key}=${JSON.stringify(value)} `;
  }, '');
}

function getDefaultRunnerConfig() {
  let defaultConfig;
  switch (runner) {
    case 'mocha':
      defaultConfig = 'e2e/mocha.opts';
      break;
    case 'jest':
      defaultConfig = 'e2e/config.json';
      break;
    default:
      console.log(`Missing 'runner-config' value in detox config in package.json, using '${defaultConfig}' as default for ${runner}`);
  }

  return defaultConfig;
}

function getPlatformSpecificString(platform) {
  let platformRevertString;
  if (platform === 'ios') {
    platformRevertString = ':android:';
  } else if (platform === 'android') {
    platformRevertString = ':ios:';
  }

  return platformRevertString;
}

function clearDeviceRegistryLockFile() {
  const lockFilePath = environment.getDeviceLockFilePath();
  fs.ensureFileSync(lockFilePath);
  fs.writeFileSync(lockFilePath, '[]');
}

function getDefaultConfiguration() {
  if (_.size(config.configurations) === 1) {
    return _.keys(config.configurations)[0];
  }
}

// This is very incomplete, don't use this for user input!
function shellQuote(input) {
  return process.platform !== 'win32' ? `'${input}'` : `"${input}"`;
}

run();
