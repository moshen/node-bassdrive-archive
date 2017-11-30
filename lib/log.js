const chalk = require('chalk');

module.exports = {
  info: function(str, ...args) {
    console.log(chalk.blue(str, ...args));
  },
  warn: function(str, ...args) {
    console.error(chalk.yellow(str, ...args));
  },
  error: function(str, ...args) {
    console.error(chalk.red(str, ...args));
  }
};
