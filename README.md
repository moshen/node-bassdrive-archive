# bassdrive-archive

This is a small command line tool written to download a subset of the enormous
collection of bassdrive archives available on
[archives.bassdrivearchive.com](http://archives.bassdrivearchive.com).

## Install

    npm install -g bassdrive-archive

## Usage

    Usage:  [-hvn] [-s <YYYY-MM-DD>] [-e <YYYY-MM-DD>] [-m <num>] [-d <dir>]

    Options:
      -h, --help     Display help text and exit                            [boolean]
      -n, --noop     Lists operations, but doesn't do anything             [boolean]
      -v, --verbose  Print all info/warnings/errors                        [boolean]
      --version      Print version: 1.1.0                                  [boolean]
      -s, --start    Start date to filter by.  Format YYYY-MM-DD, default: 2 weeks
                     ago                           [string]  [default: "2015-03-29"]
      -e, --end      End date to filter by.  Format YYYY-MM-DD, default: today
                                                   [string]  [default: "2015-04-12"]
      -d, --dir      Directory to put bassdrive archives in
                                                           [string]  [default: "./"]
      -m, --max      Max number of mp3s to download in chronological order

By default, running `bassdrive-archive` will download the last two weeks of
archives into `./`.  Two weeks usually amounts to ~2GB.

## License

[MIT](http://colken.mit-license.org/), see LICENSE file.

