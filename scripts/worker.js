function phraseSort(words, size) {
    let freqMap = {};
    for (let i = size; i < words.length; i++) {
        let phrase = "";
        for (let j = size; j > 0; j--) {
            phrase += words[i - j] + " ";
        }
        phrase = phrase.slice(0, -1);
        if (!freqMap[phrase]) {
            freqMap[phrase] = 0;
        }
        freqMap[phrase]++;
    }
    return freqMap;
}

function windowSort(words, size) {
    let freqMap = {}
    for (let i = size; i < words.length; i += size - 1) {
        let windowMap = {};
        for (let j = size; j > 0; j--) {
            if (!windowMap[words[i - j]]) {
                windowMap[words[i - j]] = 0;
            }
            windowMap[words[i - j]]++;
        }
        for (const [key, value] of Object.entries(windowMap)) {
            if (value > 1) {
                if (!freqMap[key]) {
                    freqMap[key] = 0;
                }
                freqMap[key]++;
            }
        }
    }
    return freqMap;
}

function ngramSort(words) {
    let ngrams = [];
    for (i = 0; i < words.length; i++) {
        if (words[i].parent == "") {
            ngrams[words[i].ngram] = words[i].timeseries[words[i].timeseries.length - 1];
        }
    }
    return ngrams;
}

function sortMap(freqMap, type, stopWords) {
    let items = Object.keys(freqMap).map(function (key) {
        return [key, freqMap[key]];
    });
    items.sort(function (first, second) {
        return second[1] - first[1];
    });
    for (let i = 0; i < items.length; i++) {
        let row = `<td>${items[i][0]}</td><td>${(type != "ngram") ?
            items[i][1] :
            items[i][1].toLocaleString("en-US", { style: "percent", minimumFractionDigits: 10 })
            }</td></tr>`;
        if (stopWords.includes(items[i][0])) {
            items[i] = "<tr style='background: lightgrey'>" + row;
        }
        else {
            items[i] = "<tr>" + row;
        }
    }
    return items;
}

function wordSplit(text) {
    text = text.toLowerCase().split(/\P{L}+/u);
    for (let i = 0; i < text.length; i++) {
        if (["s", "t", "d", "m", "ve", "ll", "re", "ch", ""].includes(text[i])) {
            text.splice(i, 1);
            i--;
        }
    }
    return {"words": text};
}

function syllables(word) {
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    let sylArray = word.match(/[aeiouy]{1,2}/g);
    return sylArray ? sylArray.length : 1;
}

function statsCalc(words, text, stopWords) {
    let stats = {};
    let sentNum = (text.match(/\.{1,}|\?{1,}|\!{1,}/g) || []).length;
    let wordsNum = words.length;
    let charNum = 0;
    let lexNum = 0;
    let sylNum = 0;
    for (let i = 0; i < wordsNum; i++) {
        charNum += words[i].length;
        lexNum += stopWords.includes(words[i]) ? 0 : 1;
        sylNum += syllables(words[i]);
    }
    stats["sentNum"] = sentNum;
    stats["wordsNum"] = wordsNum;
    stats["charNum"] = charNum;
    stats["lexNum"] = lexNum;
    stats["sylNum"] = sylNum;
    return stats;
}

self.addEventListener("message", function (e) {
    let [words, size, type, stopWords] = JSON.parse(e.data);
    console.time(`${type} processing`);
    let freqMap = {};
    if (type == "phrase") {
        if (size > 0) {
            freqMap = phraseSort(words, size);
        }
    }
    else if (type == "window") {
        if (size > 1) {
            freqMap = windowSort(words, size);
        }
    }
    else if (type == "ngram") {
        freqMap = ngramSort(words);
    }
    else if (type == "words") {
        freqMap = wordSplit(size);
    }
    else if (type == "stats") {
        freqMap = statsCalc(words, size, stopWords);
    }
    if (type != "stats" && type != "words") {
        freqMap = sortMap(freqMap, type, stopWords);
    }
    self.postMessage([freqMap, size]);
    console.timeEnd(`${type} processing`);
});