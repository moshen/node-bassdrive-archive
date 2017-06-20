#!/usr/bin/env node
var Promise = require('bluebird'),
    request = require('request'),
    cheerio = require('cheerio'),
    _       = require('lodash'),
    moment  = require('moment'),
    mkdirp  = Promise.promisify(require('mkdirp')),
    fs      = require('fs'),
    path    = require('path'),
    chalk   = require('chalk'),
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
    argv    = yargs.argv;

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

var log = {
  info: function(str) {
    console.log(chalk.blue(str));
  },
  warn: function(str) {
    console.error(chalk.yellow(str));
  },
  error: function(str) {
    console.error(chalk.red(str));
  }
};

function doGet(url) {
  return new Promise(function(resolve, reject) {
    request({method: 'GET', uri: url}, function(err, res, body) {
      if(err) {
        reject(err);
        return;
      }

      if(res.statusCode !== 200) {
        reject('Request Failed: ' + url + ' - ' + res.statusCode);
        return;
      }

      resolve(body);
    });
  });
}

function getLinks(url) {
  return doGet(url).then(function(body) {
    return _(cheerio.load(body)('a')).map(function(v) {
      return v.attribs.href;
    }).filter(function(v) {
      return v !== '/' && v.slice(0,4) !== 'http' && url.indexOf(v) < 0;
    }).value();
  }).catch(function(err) {
    if(argv.v) {
      log.warn(err);
    }
    return [];
  });
}

function spiderForMp3(url) {
  return getLinks(url).map(function(part) {
    if(part.slice(part.length-4) === '.mp3') {
      mp3s.push(url + part);
      return Promise.resolve();
    } else {
      return spiderForMp3(url + part);
    }
  });
}

spiderForMp3('http://archives.bassdrivearchive.com').then(function(){
  log.info(mp3s.length + ' total bassdrive mp3s found');
  return Promise.resolve(mp3s);
})
.then(function(mp3s){
  mp3s = _(mp3s).map(function(mp3) {
    var splitMp3 = mp3.split('/'),
        filename = splitMp3[splitMp3.length-1],
        filedate = filename.match(/[0-9]{4}\.[0-9]{2}\.[0-9]{2}/);

    return {
      url: mp3,
      date: filedate === null ? null :
        moment(filedate[0], 'YYYY.MM.DD')
    };
  }).filter(function(mp3) {
    return mp3.date ? mp3.date.isBetween(start, end) : false;
  }).map(function(mp3) {
    mp3.path = argv.d + decodeURIComponent(mp3.url).slice(7);
    mp3.dir  = path.normalize(mp3.path.slice(0, mp3.path.lastIndexOf('/')));
    mp3.path = path.normalize(mp3.path);
    return mp3;
  }).sortBy(function(mp3) {
    return +mp3.date;
  }).value();

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
      _.each(mp3s.slice(argv.m), function(mp3) {
        log.warn('Over max: ' + mp3.path);
      });
    }
    return mp3s.slice(0, argv.m);
  }

  return mp3s;
})
.map(function(mp3) {
  if(argv.n) {
    return mp3;
  } else {
    return mkdirp(mp3.dir).then(function(){
      return mp3;
    });
  }
})
.map(function(mp3) {
  return new Promise(function(resolve, reject) {
    log.info('Downloading: ' + mp3.path);
    if(argv.n) {
      resolve(mp3);
    } else {
      request.get(mp3.url).pipe(fs.createWriteStream(mp3.path)).on('finish', function() {
        resolve(mp3);
      }).on('error', function(err) {
        reject(err);
      });
    }
  });
}, {concurrency: argv.c}).all();

