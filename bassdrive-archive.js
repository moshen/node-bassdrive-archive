#!/usr/bin/env node
var Promise = require('bluebird'),
    request = require('request'),
    moment  = require('moment'),
    mkdirp  = Promise.promisify(require('mkdirp')),
    fs      = require('fs'),
    path    = require('path'),
    pjson   = require('./package.json'),
    yargs   = require('yargs')
      .usage('Usage: $0 [-hvn] [-s <YYYY-MM-DD>] [-e <YYYY-MM-DD>] [-m <num>] [-d <dir>] [-c <num>]')
      .option('h', {
        alias: 'help',
        demand: false,
        describe: 'Display help text and exit',
        type: 'boolean'
      })
      .option('n', {
        alias: 'noop',
        demand: false,
        describe: "Lists operations, but doesn't do anything",
        type: 'boolean'
      })
      .option('v', {
        alias: 'verbose',
        demand: false,
        describe: 'Print all info/warnings/errors',
        type: 'boolean'
      })
      .option('version', {
        demand: false,
        describe: 'Print version: ' + pjson.version,
        type: 'boolean'
      })
      .option('s', {
        alias: 'start',
        demand: false,
        default: moment().subtract(2, 'weeks').format('YYYY-MM-DD'),
        describe: 'Start date to filter by.  Format YYYY-MM-DD, default: 2 weeks ago',
        type: 'string'
      })
      .option('e', {
        alias: 'end',
        demand: false,
        default: moment().format('YYYY-MM-DD'),
        describe: 'End date to filter by.  Format YYYY-MM-DD, default: today',
        type: 'string'
      })
      .option('d', {
        alias: 'dir',
        demand: false,
        default: './',
        describe: 'Directory to put bassdrive archives in',
        type: 'string'
      })
      .option('m', {
        alias: 'max',
        demand: false,
        describe: 'Max number of mp3s to download in chronological order',
        type: 'number'
      })
      .option('c', {
        alias: 'concurrency',
        demand: false,
        describe: 'Number of concurrent downloads',
        type: 'number',
        default: 1
      }),
    argv    = yargs.argv,
    log     = require('./lib/log'),
    spider  = require('bassdrive-archive-spider')({
      onError: err => {
        if (argv.v) {
          log.warn(err, err && err.stack ? err.stack : 'No stacktrace');
        }

        return [];
      }
    });

if(argv.h) {
  yargs.showHelp();
  process.exit(0);
}
if(argv.version) {
  console.log('bassdrive-archive version: ' + pjson.version);
  process.exit(0);
}

var start = moment(argv.s),
    end = moment(argv.e),
    mp3s = [];

if(argv.m && argv.m > 0) {
  argv.m = Math.round(argv.m);
} else {
  argv.m = null;
}

log.info('Looking for bassdrive archives...');

Promise.resolve(spider())
.then(([_, mp3s]) => {
  log.info(mp3s.length + ' total bassdrive mp3s found');
  return mp3s;
})
.then(function(mp3s){
  mp3s = mp3s.filter(mp3 => mp3.date ? mp3.date.isBetween(start, end) : false)
  .map(mp3 => {
    mp3.path = argv.d + decodeURIComponent(mp3.url).slice(7);
    mp3.dir  = path.normalize(mp3.path.slice(0, mp3.path.lastIndexOf('/')));
    mp3.path = path.normalize(mp3.path);
    return mp3;
  })
  .sort((a, b) => +a.date - +b.date);

  log.info(
    mp3s.length +
    ' bassdrive mp3s found between ' +
    start.format('YYYY-MM-DD') +
    ' and ' +
    end.format('YYYY-MM-DD'));
  return mp3s;
})
.filter(function(mp3) {
  var exists = fs.existsSync(mp3.path);
  if(exists) {
    log.warn('File Exists, Skipping: ' + mp3.path);
  }
  return !exists;
})
.then(function(mp3s) {
  if(argv.m && argv.m < mp3s.length) {
    if(argv.v) {
      log.warn(mp3s.length - argv.m + ' mp3s over specified max, the following will NOT be downloaded');
      mp3s.slice(argv.m).forEach(mp3 => {
        log.warn('Over max: ' + mp3.path);
      });
    }
    return mp3s.slice(0, argv.m);
  }

  return mp3s;
})
.map(function(mp3) {
  return new Promise(function(resolve, reject) {
    log.info('Downloading: ' + mp3.path);

    if(argv.n) {
      resolve(mp3);
    } else {
      mkdirp(mp3.dir)
      .then(() => request.get(mp3.url).pipe(fs.createWriteStream(mp3.path))
        .on('finish', () => resolve(mp3))
        .on('error', reject)
      )
      .catch(reject);
    }
  });
}, {concurrency: argv.c})
.all();
