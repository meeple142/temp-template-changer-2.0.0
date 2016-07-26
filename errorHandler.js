/*jslint plusplus: true, node: true, devel: true */
"use strict";

module.exports = {
    printHelp: function () {

        console.log('\n---------------------------------- HELP ---------------------------------------');
        console.log('Example of use:');
        console.log('    template-changer variables.txt template.handlebars');
        console.log('');
        console.log('For example variables.txt:');
        console.log('    template-changer -v');
        console.log('');
        console.log('For example template.handlebars:');
        console.log('    template-changer -t');
        console.log('');
        console.log('Also remember that the helper variables are always avalible in your template:');
        console.log('    fileName');
        console.log('    fileContents');
        console.log('');
        console.log('\nThe edited html files will all be placed in a folder named after the template.');
        console.log('\nIf the folder name already exsits then it will append a number to the end of the template name.');
        console.log('-------------------------------------------------------------------------------');
    },
    handle: function (message, systemError) {
        var messageOut = "\nERROR: " + message;

        if (typeof systemError !== 'undefined') {
            messageOut += 'See system error message below for more information. \nSYSTEM ERROR MESSAGE: \n    ' + systemError;
        } else {

            console.log(messageOut);
            this.printHelp();
            throw '';
        }
    }
};
