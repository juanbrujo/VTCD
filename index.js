/**
 * VTCD - Visual Test Critical after Deploy
 * Automated screenshot testing tool for critical website pages
 *
 * This tool captures screenshots of specified pages at multiple resolutions
 * and saves them with organized filenames for visual regression testing.
 */

const fs = require('fs');
const { EventEmitter } = require('events');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const cliProgress = require('cli-progress');
const { Sluggin } = require('sluggin');
const version = require('./package.json').version;

const config = JSON.parse(fs.readFileSync('./config/pages.json', 'utf8'));
const { baseUrl, pages } = config;

EventEmitter.defaultMaxListeners = 25;

/**
 * Emoji constants used throughout the CLI for visual feedback
 * @type {Object<string, string>}
 */
const EMOJIS = {
  start: '🚀',
  success: '✅',
  error: '❌',
  processing: '⏳',
  complete: '🎉',
  info: 'ℹ️',
  arrow: '→',
};

/**
 * Formats a Date object into separate date and time strings
 * @param {Date} date - The date to format
 * @returns {Object} Object containing dateStr (YYYYMMDD) and timeStr (HH:MM)
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${year}${month}${day}`,
    timeStr: `${hours}:${minutes}`,
  };
}

/**
 * Prompts the user with an interactive question and returns their answer
 * @param {string} query - The question to display to the user
 * @returns {Promise<string>} The user's answer in lowercase
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

/**
 * Verifies that Chrome/Chromium browser is installed in Puppeteer's cache directory
 * Exits the process with error if browser is not found
 * @async
 * @throws {process.exit} Exits with code 1 if Chrome is not installed
 */
async function checkBrowserInstallation() {
  const cacheDir = path.join(process.env.HOME || process.env.USERPROFILE, '.cache/puppeteer');
  const chromePaths = [
    path.join(cacheDir, 'chrome'),
    path.join(cacheDir, 'chrome-headless-shell'),
  ];

  const hasBrowser = chromePaths.some(dirPath => {
    if (!fs.existsSync(dirPath)) return false;
    const contents = fs.readdirSync(dirPath);
    return contents.length > 0 && contents.some(f => !f.startsWith('.'));
  });

  if (!hasBrowser) {
    console.error(`\n${EMOJIS.error} ${chalk.red('Error: Chrome browser is not installed')}\n`);
    console.log(chalk.yellow('Install Chrome with:'));
    console.log(chalk.cyan('  pnpm dlx puppeteer browsers install chrome\n'));
    process.exit(1);
  }
}

/**
 * Captures screenshots of a single page at multiple resolutions
 * Displays a progress bar showing real-time capture status and elapsed time
 * @async
 * @param {Function} Pageres - Pageres class for taking screenshots
 * @param {Object} page - Page configuration object with name and url properties
 * @param {string} baseUrl - Base URL for the website
 * @param {string} outputDir - Directory path where screenshots will be saved
 * @param {string[]} resolutions - Array of resolution sizes (e.g., ['360x740', '1280x1024'])
 * @param {number} delay - Seconds to wait after page load before capturing
 * @param {Object} timestamp - Timestamp object with dateStr and timeStr properties
 * @returns {Promise<Object>} Result object with success flag, page data, and optional error message
 */
async function captureScreenshot(Pageres, page, baseUrl, outputDir, resolutions, delay, timestamp) {
  try {
    const pageSlug = Sluggin(page.name);
    const filename = `${timestamp.dateStr}_${timestamp.timeStr}_${pageSlug}-<%= size %>`;
    const startTime = Date.now();

    const progressBar = new cliProgress.SingleBar({
      format: `${EMOJIS.processing} {name} | {bar} | {value}/{total} ~ {time}s.`,
      hideCursor: true,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      barsize: 15,
      stopOnComplete: true,
      noTTYOutput: true,
    });

    progressBar.start(resolutions.length, 0, { name: chalk.cyan(page.name), time: '0' });

    for (let i = 0; i < resolutions.length; i++) {
      await new Pageres({
        delay: delay,
        filename: filename,
        format: 'jpg',
      })
        .source(`${baseUrl}${page.url}`, [resolutions[i]])
        .destination(outputDir)
        .run();

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      progressBar.update(i + 1, { time: elapsed });
    }

    progressBar.stop();

    return { success: true, page };
  } catch (error) {
    return { success: false, page, error: error.message };
  }
}

/**
 * Main application flow
 * Orchestrates the screenshot capture process:
 * 1. Displays welcome message with configured pages
 * 2. Prompts user for confirmation
 * 3. Verifies browser installation
 * 4. Captures screenshots for each page sequentially
 * 5. Displays summary of successful and failed captures
 */
(async () => {
  console.log(`\n${EMOJIS.start} ${chalk.cyan.bold('Visual Test Critical Deploy')} v${version}\n`);
  console.log(chalk.gray('─'.repeat(50)));

  let domain = baseUrl.split('//')[1];
  if (domain.startsWith('www.')) {
    domain = domain.slice(4);
  }
  const dirName = domain.replace(/\./g, '_');

  const date = new Date();
  const timestamp = formatDate(date);

  console.log(chalk.blue.italic(`\n📁 Domain: ${domain}`));
  console.log(chalk.gray(`📅 Date: ${timestamp.dateStr} ${timestamp.timeStr}`));
  console.log(chalk.cyan(`\n📋 URLs to process (${pages.length}):\n`));

  pages.forEach((page, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${EMOJIS.arrow} ${page.name}`));
    console.log(chalk.gray(`     ${baseUrl}${page.url}`));
  });

  console.log('\n' + chalk.gray('─'.repeat(50)));
  const answer = await askQuestion(chalk.yellow('\n❓ Begin processing? [Y/n]: '));

  if (answer === 'n' || answer === 'no') {
    console.log(chalk.yellow('\n⊘ Cancelled by user\n'));
    process.exit(0);
  }

  console.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

  await checkBrowserInstallation();
  const Pageres = (await import('pageres')).default;

  const outputDir = `screenshots/${dirName}`;
  const resolutions = ['360x740', '1280x1024'];
  const delay = 2;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const result = await captureScreenshot(Pageres, page, baseUrl, outputDir, resolutions, delay, timestamp);
    results.push(result);
  }

  console.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    if (result.success) {
      console.log(`${EMOJIS.success} ${chalk.green(result.page.name)}`);
    } else {
      console.log(`${EMOJIS.error} ${chalk.red(result.page.name)} - ${chalk.gray(result.error)}`);
    }
  });

  console.log('\n' + chalk.gray('─'.repeat(50)) + '\n');
  console.log(chalk.bold(`${EMOJIS.complete} Completado!\n`));
  console.log(chalk.green(`✓ Exitosos: ${successful}`));
  if (failed > 0) {
    console.log(chalk.red(`✗ Errores: ${failed}`));
  }
  console.log(chalk.blue.italic(`📸 Screenshots guardados en: ${outputDir}\n`));
})();
