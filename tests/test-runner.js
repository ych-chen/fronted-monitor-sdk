#!/usr/bin/env node

/**
 * Test runner for validating Frontend Monitor SDK
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function runCommand(command, description) {
  log(`\n🔄 ${description}...`, COLORS.blue);
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    log(`✅ ${description} completed successfully`, COLORS.green);
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, COLORS.red);
    log(`Error: ${error.message}`, COLORS.red);
    return false;
  }
}

function checkFiles() {
  log('\n📁 Checking project structure...', COLORS.blue);

  const requiredFiles = [
    'src/index.ts',
    'src/sdk.ts',
    'src/trace/tracer.ts',
    'src/trace/instrumentation/xhr-instrumentation.ts',
    'src/trace/instrumentation/fetch-instrumentation.ts',
    'src/metrics/performance.ts',
    'src/metrics/custom.ts',
    'dist/index.js',
    'dist/index.esm.js',
    'dist/index.umd.js',
    'dist/index.d.ts',
    'package.json',
    'README.md',
    'ARCHITECTURE.md'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(path.resolve(__dirname, '..', file))) {
      log(`  ✓ ${file}`, COLORS.green);
    } else {
      log(`  ❌ ${file}`, COLORS.red);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

function validateBuild() {
  log('\n🏗️  Validating build output...', COLORS.blue);

  const buildFiles = [
    'dist/index.js',
    'dist/index.esm.js',
    'dist/index.umd.js',
    'dist/index.d.ts'
  ];

  let buildValid = true;
  for (const file of buildFiles) {
    const filePath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        log(`  ✓ ${file} (${stats.size} bytes)`, COLORS.green);
      } else {
        log(`  ❌ ${file} (empty file)`, COLORS.red);
        buildValid = false;
      }
    } else {
      log(`  ❌ ${file} (missing)`, COLORS.red);
      buildValid = false;
    }
  }

  return buildValid;
}

async function main() {
  log('🚀 Frontend Monitor SDK Test Runner', COLORS.yellow);
  log('=====================================', COLORS.yellow);

  const results = {
    structure: false,
    build: false,
    typeCheck: false,
    unitTests: false,
    integrationTests: false,
    lint: false
  };

  // Check project structure
  results.structure = checkFiles();

  // Run type checking
  results.typeCheck = runCommand('npm run type-check', 'Type checking');

  // Build the project
  const buildSuccess = runCommand('npm run build', 'Building project');
  results.build = buildSuccess && validateBuild();

  // Run unit tests
  results.unitTests = runCommand('npm test', 'Unit tests');

  // Run integration tests
  results.integrationTests = runCommand('npm run test:integration', 'Integration tests');

  // Run linting
  results.lint = runCommand('npm run lint', 'Code linting');

  // Print results summary
  log('\n📊 Test Results Summary', COLORS.yellow);
  log('========================', COLORS.yellow);

  let totalTests = 0;
  let passedTests = 0;

  for (const [test, passed] of Object.entries(results)) {
    totalTests++;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? COLORS.green : COLORS.red;
    log(`  ${test.padEnd(20)}: ${status}`, color);
    if (passed) passedTests++;
  }

  log(`\n📈 Overall Result: ${passedTests}/${totalTests} tests passed`,
      passedTests === totalTests ? COLORS.green : COLORS.red);

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! The Frontend Monitor SDK is ready for use.', COLORS.green);

    log('\n📋 Next Steps:', COLORS.blue);
    log('  1. Review test coverage report: open coverage/lcov-report/index.html');
    log('  2. Run E2E tests: npm run test:e2e (requires browser setup)');
    log('  3. Test in your application: npm pack and install locally');
    log('  4. Deploy to production when ready');

    process.exit(0);
  } else {
    log('\n🐛 Some tests failed. Please fix the issues before proceeding.', COLORS.red);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Uncaught error: ${error.message}`, COLORS.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`\n💥 Unhandled rejection: ${reason}`, COLORS.red);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  log(`\n💥 Test runner failed: ${error.message}`, COLORS.red);
  process.exit(1);
});