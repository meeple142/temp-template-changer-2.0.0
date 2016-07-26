//#!/usr/bin/env node

/*jslint plusplus: true, node: true, nomen:true*/
"use strict";

var fs = require('fs'),
    path = require('path'),
    errorHandler = require('./errorHandler.js'),
    chalk = require('chalk');

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

function makeWriteFiles(dirIn) {
    return function writeFiles(file, callback) {
        var pathOut,
            fileTextOut;
        //do we have errors?
        if (file.errors.length === 0) {
            //nope!
            //set path and text
            pathOut = path.join(dirIn, file.name);
            fileTextOut = file.processed;
        } else {
            //yep
            //folder name
            pathOut = path.join(dirIn, "Missing " + file.errors[0].name);

            //if the sub folder does not exist make it
            if (!dirExist(pathOut)) {
                fs.mkdirSync(pathOut);
            }

            //make full path and text out
            pathOut = path.join(pathOut, file.name);
            fileTextOut = file.contents;
        }

        //writeit!
        fs.writeFile(pathOut, fileTextOut, 'utf8', function (err) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        });
    };
}

function makeMainDir(currentFolder, folderNameIn) {
    var num = 1,
        pathOut = path.join(currentFolder, folderNameIn);
    //this will make sure that 1 does not get appened only greater than 1

    //if the folder already exists
    while (dirExist(pathOut)) {
        num += 1;
        pathOut = path.join(currentFolder, folderNameIn + num);
    }

    //found one, make it and return the name
    fs.mkdirSync(pathOut);

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

function printCounts(counts) {
    var errorText = '';

    Object.keys(counts).forEach(function (countKey) {
        if (countKey !== "workedSuccessfully" && counts[countKey] > 0) {
            errorText += "Variable: " + countKey + ", " + counts[countKey] + " files";
        }
    });

    console.log('');
    console.log(chalk.green('---------------- Files Successfully Processed --------------------'));
    console.log("Successfully Processed:", counts.workedSuccessfully, "files");
    if (errorText !== '') {
        console.log('');
        console.log(chalk.red('---------------- Files Missing Mandatory Variables --------------------'));
        console.log(errorText);

    }
}

/****************************************************************/
/*************************** START ******************************/
/****************************************************************/
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
            outputDir,
            counts = {
                workedSuccessfully: 0
            };
        //set up counts
        varsArray.forEach(function (varIn) {
            if (varIn.isMandatory) {
                counts[varIn.name] = 0;
            }
        });

        processed = results.map(function (fileObj) {
            //fileObj has a processed prop added and an error prop if needed.
            runTemplate(fileObj, varsArray, hbTemplate);
            //also record the success count
            if (fileObj.errors.length === 0) {
                counts.workedSuccessfully += 1;
            } else {
                counts[fileObj.errors[0].name] += 1;
            }
            return fileObj;
        });

        //make the Dir
        outputDir = makeMainDir(folder, flags.templateName);

        //write files
        async.each(processed, makeWriteFiles(outputDir), function (err, results) {
            if (err) {
                errorHandler.handle('Problem while writing edited html files.', err.message);
            }

            //tell them where they ended up!
            console.log("");
            console.log(chalk.green("The processed files are located in the following directory:"));
            console.log(path.relative('.', outputDir));
            printCounts(counts);
        });
    });

} catch (e) {
    //nothing

}
