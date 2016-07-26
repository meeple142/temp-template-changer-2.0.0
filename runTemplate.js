/*jslint plusplus: true, node: true, devel: true */
"use strict";

var htmlParse = require('cheerio'),
    prettyHtml = require('js-beautify').html,
    errorHandler = require('./errorHandler.js');

function doesExist(thingIn) {
    return typeof thingIn !== 'undefined' && thingIn !== null && thingIn !== '';
}

function checkFileVars(context, varsArray) {
    var errors = [];
    varsArray.forEach(function (varIn) {
        if ((varIn.isMandatory && !doesExist(context[varIn.name])) || context[varIn.name] === false) {
            errors.push({
                name: varIn.name,
                missing: true
            });
        }
    });
    return errors;
}

function makeFileVars(fileObj, varsArray) {
    var contextOut = {},
        $ = htmlParse.load(fileObj.contents);

    varsArray.forEach(function (varIn) {
        var selected = $(varIn.selector);

        if (varIn.command === 'html') {
            contextOut[varIn.name] = selected.html();
        } else if (varIn.command === 'bool') {
            contextOut[varIn.name] = doesExist(selected.html());
        } else {
            contextOut[varIn.name] = selected.attr(varIn.command);
        }

    });

    //add the default helper vars
    contextOut.fileName = fileObj.name;
    contextOut.fileContents = fileObj.contents;
    return contextOut;
}

module.exports = function runTemplate(fileObj, varsArray, hbTemplate) {
    //get vars from file
    var context = makeFileVars(fileObj, varsArray),
        errors = checkFileVars(context, varsArray);

    if (errors.length === 0) {
        //run template
        fileObj.processed = prettyHtml(hbTemplate(context));
    } else {
        fileObj.processed = '';
    }
    //will be empty if no errors
    fileObj.errors = errors;
};
