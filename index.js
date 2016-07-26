//#!/usr/bin/env node

/*jslint plusplus: true, node: true, nomen:true*/
"use strict";

var fs = require('fs'),
    path = require('path'),
    errorHandler = require('./errorHandler.js');

function readFile(fileName) {
    var fileText;

    try {
        fileText = fs.readFileSync(fileName, 'utf8');
    } catch (e) {
        throw "Error reading file: " + fileName;
    }

    return fileText;
}

function readFiles(file, callback) {
    fs.readFile(file, 'utf8', function (error, guts) {
        if (error) {
            callback(error);
        }
        //remember the file name
        callback(null, {
            location: file,
            name: path.parse(file).base,
            contents: guts
        });
    });
}

function makeWriteFiles(dirIn) {
    return function writeFiles(file, callback) {
        var pathOut = path.join(dirIn, file.name);

        fs.writeFile(pathOut, file.processed, 'utf8', function (err) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        });

    };
}

function makeDir(currentFolder, folderNameIn) {
    var num = 1,
        pathOut = path.join(currentFolder, folderNameIn);
    //this will make sure that 1 does not get appened only greater than 1
    return pathOut;

    function dirExist(dirPath) {
        //does it exist?
        try {
            //yes it does try again
            fs.statSync(dirPath).isDirectory();
            return true;
        } catch (e) {
            //error nope so does not exist
            return false;
        }
    }

    //if the folder already exists
    while (dirExist(pathOut)) {
        num += 1;
        pathOut = path.join(currentFolder, folderNameIn + num);
    }

    //found one make it and return the name
    fs.mkdir(pathOut);

    return pathOut;

}

function getHtmlFileNames(folder) {
    var htmlFileNames = fs.readdirSync(folder);
    //filter down to just html
    htmlFileNames = htmlFileNames.filter(function (file) {
        return path.extname(file) === '.html';
    });
    return htmlFileNames;
}

function parseFlags() {
    var flags = process.argv.slice(2);
    //print example template
    if (flags.length === 1 && flags[0] === '-t') {
        console.log(readFile(path.join(__dirname, 'templateExample.handlebars')));
        throw '';
    }

    //print example vars file
    if (flags.length === 1 && flags[0] === '-v') {
        console.log(readFile(path.join(__dirname, 'variablesExample.txt')));
        throw '';
    }

    if (flags.length !== 2) {
        errorHandler.handle("Wrong number of arguments.");
    }
    return {
        variablesFileName: flags[0],
        templateFileName: flags[1],
        templateName: path.parse(flags[1]).name
    };
}

function makeTemplateFunction(flags) {
    var Handlebars = require('handlebars'),
        templateText = readFile(flags.templateFileName).trim();

    if (templateText.length === 0) {
        errorHandler.handle('The template file "' + flags.templateFileName + '" is empty.');
    }

    return Handlebars.compile(templateText);
}

function makeVarsObject(flags) {
    function ordinalNumber(numIn) {
        var textOut;
        if (typeof numIn !== 'number' || !isNaN(numIn)) {
            throw "Need a number to make an ordinal number. Number given: " + numIn;
        }

        switch (numIn % 10) {
        case 1:
            textOut = numIn + 'st';
            break;
        case 2:
            textOut = numIn + 'nd';
            break;
        case 3:
            textOut = numIn + 'rd';
            break;
        default:
            textOut = numIn + 'th';
            break;

        }
    }

    var varsText, vars;
    varsText = readFile(flags.variablesFileName).trim();

    if (varsText.length === 0) {
        errorHandler.handle("Variables text file is empty.");
    }

    //make an array
    vars = varsText.split('\n');

    //process each line
    vars = vars.map(function (line, lineIndex) {
        var isMandatory,
            split;

        line = line.trim();

        isMandatory = line.charAt(0) === '*';

        if (isMandatory) {
            //drop the *
            line = line.substr(1);
        }

        split = line.split('|');

        if (split.length !== 3) {
            errorHandler.handle('The ' + ordinalNumber(lineIndex + 1) + ' variable in the file does not have 2 "|" in it.');
        }

        return {
            name: split[0].trim(),
            selector: split[1].trim(),
            command: split[2].trim(),
            isMandatory: isMandatory
        };
    });

    return vars;
}

try {
    var folder = process.cwd(),
        async = require('async'),
        runTemplate = require('./runTemplate.js'),
        flags = parseFlags(),
        varsArray = makeVarsObject(flags),
        hbTemplate = makeTemplateFunction(flags),
        htmlFileNames = getHtmlFileNames(folder);

    async.map(htmlFileNames, readFiles, function (err, results) {
        if (err) {
            errorHandler.handle('Problem while reading an html file.', err.message);
        }

        var processed,
            outputDir;

        processed = results.map(function (fileObj) {
            try {
                fileObj.processed = runTemplate(fileObj, varsArray, hbTemplate);
            } catch (e) {
                errorHandler.handle(e.message);
            }
            return fileObj;
        });

        //make the Dir
        outputDir = makeDir(folder, flags.templateName);

        //write files
        async.each(processed, makeWriteFiles(outputDir), function (err, results) {
            if (err) {
                errorHandler.handle('Problem while writing edited html files.', err.message);
            }
        });
    });

} catch (e) {
    //nothing
    console.log('we throw an error we didn\'t know about');
    console.log(e.message);
}
