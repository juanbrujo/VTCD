const fs = require('fs');
const { EventEmitter } = require('events');

const pages = JSON.parse(fs.readFileSync('./config/pages.json', 'utf8'));

EventEmitter.defaultMaxListeners = 25;

const date = new Date();
const dateFormat = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getDate()}/${date.toLocaleTimeString('es-ES', {hour12: false})}`;

const base = 'https://nueva.afpmodelo.cl';
const dir = `screenshots/${base.split('//')[1]}/${dateFormat}`;

const res = ['360x740', '1280x1024'];
const delay = 2;

(async () => {
  const Pageres = (await import('pageres')).default;

  for (const page of pages) {
    (async () => {
      console.log(`Comenzando ${page.name}`);
      await new Pageres({
        delay: delay,
        filename: `${page.name}-<%= size %>`,
        format: 'jpg',
      })
        .source(`${base}${page.url}`, res)
        .destination(dir)
        .run();

      console.log(`Terminado ${page.name}`);
    })();
  }
})();
