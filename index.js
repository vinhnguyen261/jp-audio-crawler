'use strict';

const fs = require('fs');
const uniqid = require('uniqid');
const download = require('download');
const puppeteer = require('puppeteer');

function isAborted(request) {
    const excludedUrls = [
        'http://www.google-analytics.com/ga.js',
        'https://www.google-analytics.com/ga.js',
    ];
    const excludedResources = ['image', 'stylesheet', 'font'];

    return excludedResources.includes(request.resourceType) || excludedUrls.includes(request.url);
}

async function getSpeech(text) {
    let audio = '';
    const baseUrl = 'http://www.gavo.t.u-tokyo.ac.jp/ojad/phrasing/index';

    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', request => {
        if (isAborted(request)) {
            request.abort();
        } else {
            if (request.url.endsWith('.wav')) {
                audio = request.url;
            }
            request.continue();
        }
    });

    try {
        await page.goto(baseUrl);
    } catch (error) {
        browser.close();
    }

    const textarea = 'textarea[name="data[Phrasing][text]"]';
    await page.waitForSelector(textarea, {visible: true});
    await page.type(textarea, text);

    const executionButton = 'input[value="実行"]';
    await page.waitForSelector(executionButton, {visible: true});
    await page.click(executionButton);

    const synthesisButton = 'input[value="作成"]';
    await page.waitForSelector(synthesisButton, {visible: true});
    await page.click(synthesisButton);

    const playbackButton = 'input[value="再生"]';
    await page.waitForSelector(playbackButton, {visible: true});
    await page.click(playbackButton);

    await browser.close();

    return audio;
}

function downloadSpeech(text, audioDir='audio') {
    getSpeech(text).then(audio => {
        console.log(audio);
        let target = audioDir + '/' + uniqid() + '.wav';
        download(audio).then(stream => {
            fs.writeFileSync(target, stream);
        });
    });
}

const texts = [
    '小林さんは、その話を疑っているようだ',
    '本当だと思っている',
    '本当ではないと思っている',
    'よく知っている',
    'よく知らない',
    '小林さんは、その話を疑っているようだ',
    '本当ではないと思っている',
    'よく知らない',
    '本当だと思っている',
    'よく知っている'
];

for (let text of texts) {
    downloadSpeech(text);
}
