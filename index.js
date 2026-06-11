const fs = require('fs');
const { EventEmitter } = require('events');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const cliProgress = require('cli-progress');
const version = require('./package.json').version;

const config = JSON.parse(fs.readFileSync('./config/pages.json', 'utf8'));
const { baseUrl, pages } = config;

EventEmitter.defaultMaxListeners = 25;

const EMOJIS = {
  start: '🚀',
  success: '✅',
  error: '❌',
  processing: '⏳',
  complete: '🎉',
  info: 'ℹ️',
  arrow: '→',
};

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

async function captureScreenshot(pageres, page, baseUrl, outputDir, resolutions, delay, timestamp) {
  try {
    const pageSlug = slugify(page.name);
    const filename = `${timestamp.dateStr}_${timestamp.timeStr}_${pageSlug}-<%= size %>`;

    const progressBar = new cliProgress.SingleBar({
      format: `${EMOJIS.processing} {name} | {bar} | {value}/{total}`,
      hideCursor: true,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      barsize: 15,
      stopOnComplete: true,
    });

    progressBar.start(resolutions.length, 0, { name: chalk.cyan(page.name) });

    let completed = 0;
    const originalRun = pageres.prototype.run;

    await new pageres({
      delay: delay,
      filename: filename,
      format: 'jpg',
    })
      .source(`${baseUrl}${page.url}`, resolutions)
      .destination(outputDir)
      .run();

    progressBar.update(resolutions.length);
    progressBar.stop();

    return { success: true, page };
  } catch (error) {
    return { success: false, page, error: error.message };
  }
}

(async () => {
  console.log(`\n${EMOJIS.start} ${chalk.cyan.bold('Visual Test Critical Deploy')} v${version}\n`);
  console.log(chalk.gray('─'.repeat(50)));

  const domain = baseUrl.split('//')[1];
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

  const outputDir = `screenshots/${domain}`;
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
