const colors = require('colors');

exports.consoleLog = function(message) {
	console.log(message.bgBlue.black);
}

exports.consoleError = function(message) {
	console.log(message.bgRed.black);
}

exports.consoleCheck = function(message) {
	console.log(message.bgGreen.black);
}

exports.consoleInfo = function(message) {
    console.log(message.bgCyan.black);
}

exports.consoleWarn = function(message) {
    console.log(message.bgYellow.black);
}
