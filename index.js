const fs = require('fs');
const { EventEmitter } = require('events');
const path = require('path');
const chalk = require('chalk');
const cliProgress = require('cli-progress');

const pages = JSON.parse(fs.readFileSync('./config/pages.json', 'utf8'));

EventEmitter.defaultMaxListeners = 25;

const EMOJIS = {
  start: '🚀',
  success: '✅',
  error: '❌',
  processing: '⏳',
  complete: '🎉',
  info: 'ℹ️',
};

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

async function captureScreenshot(pageres, page, baseUrl, outputDir, resolutions, delay) {
  try {
    await new pageres({
      delay: delay,
      filename: `${page.name}-<%= size %>`,
      format: 'jpg',
    })
      .source(`${baseUrl}${page.url}`, resolutions)
      .destination(outputDir)
      .run();

    return { success: true, page };
  } catch (error) {
    return { success: false, page, error: error.message };
  }
}

(async () => {
  console.log(`\n${EMOJIS.start} ${chalk.cyan.bold('Visual Test Critical Deploy')}`);
  console.log(chalk.gray('─'.repeat(50)) + '\n');

  await checkBrowserInstallation();
  const Pageres = (await import('pageres')).default;

  const date = new Date();
  const dateFormat = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getDate()}/${date.toLocaleTimeString('es-ES', {hour12: false})}`;

  const baseUrl = 'https://nueva.afpmodelo.cl';
  const outputDir = `screenshots/${baseUrl.split('//')[1]}/${dateFormat}`;
  const resolutions = ['360x740', '1280x1024'];
  const delay = 2;

  console.log(chalk.blue.italic(`📁 Output: ${outputDir}\n`));

  const results = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = i + 1;
    const totalPages = pages.length;

    const progressPercent = Math.round((pageNum / totalPages) * 100);
    const barLength = 20;
    const filledLength = Math.round((pageNum / totalPages) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(`\r${chalk.cyan('Procesando:')} ${bar} ${pageNum}/${totalPages} (${progressPercent}%)`);

    const result = await captureScreenshot(Pageres, page, baseUrl, outputDir, resolutions, delay);
    results.push(result);
  }

  process.stdout.write('\n');

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
