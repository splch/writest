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

function sortMap(freqMap, stopWords) {
    let items = Object.keys(freqMap).map(function (key) {
        return [key, freqMap[key]];
    });
    items.sort(function (first, second) {
        return second[1] - first[1];
    });
    for (let i = 0; i < items.length; i++) {
        let row = `<td>${items[i][0]}</td><td>${items[i][1]}</td></tr>`;
        if (stopWords.includes(items[i][0])) {
            items[i] = "<tr style='background: lightgrey'>" + row;
        }
        else {
            items[i] = "<tr>" + row;
        }
    }
    return items;
}

self.addEventListener("message", function (e) {
    let [words, size, type, stopWords] = JSON.parse(e.data);
    let freqMap;
    if (type == "phrase") {
        freqMap = phraseSort(words, size)
    }
    else if (type == "window") {
        freqMap = windowSort(words, size)
    }
    else {
        self.postMessage([words, size]);
    }
    freqMap = sortMap(freqMap, stopWords);

    self.postMessage([freqMap, size]);
}, false);