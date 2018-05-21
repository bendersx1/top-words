import express from 'express';
import request from "request";
import cheerio from "cheerio";
import axios from "axios";
import pdf from 'html-pdf';

const app = express();
const PORT = process.env.PORT || 3333;

app.get('/', function(req, res) {
    const params = JSON.parse(req.query.params);
    if (!params.urls) {     // No urls in request
        res.status(400).send('need params: ?params={"urls":[`array of url strings`]}');
    };
    const result = {};
    const urls = params.urls;   // Array of URLs to parse

    urls.forEach(url => {
        axios
            .get(url)
            .then((r) => {
                parseD(null, url, r.data);  //Parse data
            })
            .catch((err) => {
                parseD(err, url);   
            });
    });
    
    // Get top 3 words from hash of words and convert to <td>...</td>
    const max3html = (words, count = 3, acc = '') => {
        if (count === 0) return acc;
        const max = Object.keys(words).reduce((max, key) => max[1] < words[key] ? [key, words[key]] : max, ['', 0]);
        delete words[max[0]];
        return max3html(words, count - 1, acc + `<td>${max[0]}</td>`)
        
    };


    const parseD = (err, url, data) => {
        if (err) {
            result[url] = `<td>${err.code}</td><td></td><td></td>`; // Can't parse url
        } else {
            let $ = cheerio.load(data);
            const words = $.text().toLowerCase().replace(/[^а-яА-Яa-zA-Z]/g, " ").split(/\s+/); // Get all words int array

            // Sum word count into hash, when key is a word and value is count (word with <5 letters are skipped) 
            const wordsCount = words    
                .reduce((acc, word) => {
                    if (word.length <= 4) return acc;
                    const newCount = acc[word] ? acc[word] + 1 : 1
                    return {...acc, [word]: newCount};
                }, {});
            
            result[url] = max3html(wordsCount); //get top 3
        };
        
        if (Object.keys(result).length === urls.length) {   // If all URLs parsed
            // Make HTML
            const html =   `<html>
                                <head>
                                    <style type="text/css">
                                        table, td {
                                            border: 1px solid black;
                                            border-collapse: collapse;
                                            padding: 5px 10px;
                                            font-size: 12px;
                                        }
                                    
                                    </style>
                                </head>
                                <body>
                                    <table>` +
                                        Object.keys(result).map(url => `<tr><td>${url}</td>${result[url]}</tr>`).join('') +
                                `   </table>
                                </body>`;
            
            // Make PDF and send
            pdf.create(html, {"format": "A4", "orientation": "portrait", "border": {"top": "0in", "bottom": "0in"}}).toBuffer(function(err, buffer){
                res.status(200).end(buffer);
              });                    
        }
    };


});
app.listen(PORT);

console.log('listen on port ' + PORT);