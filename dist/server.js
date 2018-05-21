"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _cheerio = require("cheerio");

var _cheerio2 = _interopRequireDefault(_cheerio);

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

var _htmlPdf = require("html-pdf");

var _htmlPdf2 = _interopRequireDefault(_htmlPdf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var app = (0, _express2.default)();
var PORT = process.env.PORT || 3333;

app.get('/', function (req, res) {
    var params = JSON.parse(req.query.params);
    if (!params.urls) {
        // No urls in request
        res.status(400).send('need params: ?params={"urls":[`array of url strings`]}');
    };
    var result = {};
    var urls = params.urls; // Array of URLs to parse

    urls.forEach(function (url) {
        _axios2.default.get(url).then(function (r) {
            parseD(null, url, r.data); //Parse data
        }).catch(function (err) {
            parseD(err, url);
        });
    });

    // Get top 3 words from hash of words and convert to <td>...</td>
    var max3html = function max3html(words) {
        var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
        var acc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

        if (count === 0) return acc;
        var max = Object.keys(words).reduce(function (max, key) {
            return max[1] < words[key] ? [key, words[key]] : max;
        }, ['', 0]);
        delete words[max[0]];
        return max3html(words, count - 1, acc + ("<td>" + max[0] + "</td>"));
    };

    var parseD = function parseD(err, url, data) {
        if (err) {
            result[url] = "<td>" + err.code + "</td><td></td><td></td>"; // Can't parse url
        } else {
            var $ = _cheerio2.default.load(data);
            var words = $.text().toLowerCase().replace(/[^а-яА-Яa-zA-Z]/g, " ").split(/\s+/); // Get all words int array

            // Sum word count into hash, when key is a word and value is count (word with <5 letters are skipped) 
            var wordsCount = words.reduce(function (acc, word) {
                if (word.length <= 4) return acc;
                var newCount = acc[word] ? acc[word] + 1 : 1;
                return _extends({}, acc, _defineProperty({}, word, newCount));
            }, {});

            result[url] = max3html(wordsCount); //get top 3
        };

        if (Object.keys(result).length === urls.length) {
            // If all URLs parsed
            // Make HTML
            var html = "<html>\n                                <head>\n                                    <style type=\"text/css\">\n                                        table, td {\n                                            border: 1px solid black;\n                                            border-collapse: collapse;\n                                            padding: 5px 10px;\n                                            font-size: 12px;\n                                        }\n                                    \n                                    </style>\n                                </head>\n                                <body>\n                                    <table>" + Object.keys(result).map(function (url) {
                return "<tr><td>" + url + "</td>" + result[url] + "</tr>";
            }).join('') + "   </table>\n                                </body>";

            // Make PDF and send
            _htmlPdf2.default.create(html, { "format": "A4", "orientation": "portrait", "border": { "top": "0in", "bottom": "0in" } }).toBuffer(function (err, buffer) {
                res.status(200).end(buffer);
            });
        }
    };
});
app.listen(PORT);

console.log('listen on port ' + PORT);