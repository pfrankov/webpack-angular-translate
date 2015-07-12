var assert = require("chai").assert,
    webpack = require('webpack'),
    deepExtend = require('deep-extend'),
    WebPackAngularTranslate = require("../index.js");

/**
 * Helper function to implement tests that verify the result in the translations.js
 * @param fileName {string} the filename of the input file (the file to process by webpack)
 * @param doneCallback the done callback from mocha that is invoked when the test has completed
 * @param assertCallback {function({}, {})} Callback that contains the assert statements. the first argument
 * is the source of the translations file. The webpack stats (containing warnings and errors) is passed as second argument.
 */
function translationsTest(fileName, doneCallback, assertCallback) {
    compile({
        entry: [ './test/cases/' + fileName ]
    }, function (error, stats) {
        if (error) {
            assert.fail(null, error);
            doneCallback();
        }

        var translations = undefined;
        if (stats.compilation.assets["translations.js"]) {
            translations = JSON.parse(stats.compilation.assets["translations.js"].source());
        }

        assert.property(stats.compilation.assets, "translations.js");
        assertCallback(translations, stats);

        doneCallback();
    });
}

function compile(options, callback) {
    options = deepExtend({
        output: {
            path: __dirname + "/dist"
        },
        module: {
            loaders: [
                {
                    test: /\.html$/,
                    loader: 'html?removeEmptyAttributes=false'
                }
            ],
            preLoaders: [
                {
                    test: /\.html$/,
                    loader: WebPackAngularTranslate.loader()
                }
            ]
        },

        plugins: [
            new WebPackAngularTranslate.Plugin(),
        ]
    }, options);


    var compiler = webpack(options);
    compiler.run(callback);
}

describe("HTML", function () {
    "use strict";

    it("extracts the translation id if translate is used as attribute", function (done) {
        translationsTest('simple.html', done, function (translations) {
            assert.propertyVal(translations, 'attribute-translation', 'attribute-translation');
        });
    });

    it("extracts the translation id if translate is used as element", function (done) {
        translationsTest('simple.html', done, function (translations) {
            assert.propertyVal(translations, 'element-translation', 'element-translation');
        });
    });

    it("extracts the translation id from the attribute if specified", function (done) {
        translationsTest('simple.html', done, function (translations) {
            assert.propertyVal(translations, 'id-in-attribute', 'id-in-attribute');
        });
    });

    it("extracts the default text if translate is used as attribute", function (done) {
        translationsTest('defaultText.html', done, function (translations) {
            assert.propertyVal(translations, 'Login', 'Anmelden');
        });
    });

    it("extracts the default text if translate is used as element", function (done) {
        translationsTest('defaultText.html', done, function (translations) {
            assert.propertyVal(translations, 'Logout', 'Abmelden');
        });
    });

    it("extracts the translation id if a translation for an attribute is defined", function (done) {
        translationsTest('attributes.html', done, function (translations) {
            assert.propertyVal(translations, 'attribute-id', 'attribute-id');
        });
    });

    it("extracts the default text for an attribute translation", function (done) {
        translationsTest('attributes.html', done, function (translations) {
            assert.propertyVal(translations, 'attribute-default-id', 'Default text for attribute title');
        });
    });

    it("emits a error if an angular expression is used as attribute id", function (done) {
        translationsTest('expressions.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 1, 'an error should have been emitted for the used angular expression as attribute id');

            var error = stats.compilation.errors[0];
            assert.match(error.message, /The translation Translation\{ id: \{\{editCtrl\.title}}, defaultText: undefined, resources: .+} uses an angular expression as translation id or as default text, this is not supported\. To suppress this error attribute the element with suppress-dynamic-translation-error\.$/);
        });
    });

    it("does suppress errors for dynamic translations if the element is attributed with suppress-dynamic-translation-error", function (done) {
        translationsTest('expressions-suppressed.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 0, "The dynamic translation error is suppressed by the attribute suppress-dynamic-translation-error");
            assert.deepEqual(translations, {});
        });
    });
});

describe("JS", function () {
    "use strict";

    it("extracts the translation id when the $translate service is used as global variable ($translate)", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, 'global variable', 'global variable');
        });
    });

    it("extracts the translation id when the $translate service is used in the constructor", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, "translate in constructor", "translate in constructor");
        });
    });

    it("extracts the translation id when the $translate service is used in an arrow function (() => this.$translate)", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, "translate in arrow function", "translate in arrow function");
        });
    });

    it("extracts the translation id when the $translate service is used in a member function (this.$translate)", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, "this-translate", "this-translate");
        });
    });

    it("extracts multiple translation id's when an array is passed as argument", function (done) {
        translationsTest('array.js', done, function (translations) {
            assert.propertyVal(translations, 'FIRST_PAGE', 'FIRST_PAGE');
            assert.propertyVal(translations, 'Next', 'Next');
        });
    });

    it("extracts the default text", function (done) {
        translationsTest('defaultText.js', done, function (translations) {
            assert.propertyVal(translations, 'Next', 'Weiter');
        });
    });

    it("extracts the default text when an array is passed for the id's", function (done) {
        translationsTest('defaultText.js', done, function (translations) {
            assert.propertyVal(translations, 'FIRST_PAGE', 'Missing');
            assert.propertyVal(translations, 'LAST_PAGE', 'Missing');
        });
    });
});

describe("Register Translations", function () {
    it("register translations", function (done) {
        translationsTest('registerTranslations', done, function (translations, stats) {
            assert.propertyVal(translations, 'Logout', 'Abmelden');
        });
    });
});

describe("Common", function () {
    it("emits an error if the same id with different default texts is used", function (done) {
        translationsTest('differentDefaultTexts.js', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 1, "An error should be emitted if two id's have a different default text");

            var error = stats.compilation.errors[0];
            assert.match(error.message, /^Webpack-Angular-Translate: Two translations with the same id but different default text found \(Translation\{ id: Next, defaultText: Weiter, resources: .+differentDefaultTexts\.js}, Translation\{ id: Next, defaultText: Missing, resources: .+differentDefaultTexts.js}\)\. Please define the same default text twice or specify the default text only once\.$/);

            assert.deepEqual(translations, { "Next": "Weiter"}); // First match wins
        });
    });
});