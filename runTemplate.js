/*jslint plusplus: true, node: true, devel: true */
"use strict";

var htmlParse = require('cheerio'),
    prettyHtml = require('js-beautify').html,
    errorHandler = require('./errorHandler.js');

function makeFileVars(fileObj, varsArray) {
    var contextOut = {},
        $ = htmlParse.load(fileObj.contents);

    varsArray.forEach(function (varIn) {
        var selected = $(varIn.selector);

        if (varIn.command === 'html') {
            contextOut[varIn.name] = selected.html();
        } else {
            contextOut[varIn.name] = selected.attr(varIn.command);
        }

        //check if we are missing a required var
        if (varIn.isMandatory && (typeof contextOut[varIn.name] === 'undefined' || contextOut[varIn.name] === null)) {
            throw new Error('The mandatory variable "' + varIn.name + '" with selector "' + varIn.selector + '" did not select anything in the file "' + fileObj.name + '".');
        }
    });

    //add the default helper vars
    contextOut.fileName = fileObj.name;
    contextOut.fileContents = fileObj.contents;
    return contextOut;
}

module.exports = function runTemplate(fileObj, varsArray, hbTemplate) {
    //get vars from file
    var context = makeFileVars(fileObj, varsArray);

    //run template
    return prettyHtml(hbTemplate(context));
};
