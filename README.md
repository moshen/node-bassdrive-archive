# bassdrive-archive

This is a small command line tool written to download a subset of the enormous
collection of bassdrive archives available on
[archives.bassdrivearchive.com](http://archives.bassdrivearchive.com).

## Install

    npm install -g bassdrive-archive

## Usage

    Usage: bassdrive-archive [-hvn] [-s <YYYY-MM-DD>] [-e <YYYY-MM-DD>] [-m <num>]
    [-d <dir>]
    
    Options:
      -h, --help     Display help text and exit
      -n, --noop     Lists operations, but doesn't do anything
      -v, --verbose  Print all info/warnings/errors
      -s, --start    Start date to filter by.  Format YYYY-MM-DD, default: 2 weeks
                     ago                                     [default: "2015-03-16"]
      -e, --end      End date to filter by.  Format YYYY-MM-DD, default: today
                                                             [default: "2015-03-30"]
      -d, --dir      Directory to put bassdrive archives in          [default: "./"]
      -m, --max      Max number of mp3s to download in chronological order

By default, running `bassdrive-archive` will download the last two weeks of
archives into `./`.  Two weeks usually amounts to ~2GB.

## License

[MIT](http://colken.mit-license.org/), see LICENSE file.

