self.addEventListener("message", function (e) {
    let [words, size, type] = JSON.parse(e.data);
    let freqMap = {};
    if (type == "phrase") {
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
    }
    else if (type == "window") {
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
    }
    let items = Object.keys(freqMap).map(function (key) {
        return [key, freqMap[key]];
    });
    items.sort(function (first, second) {
        return second[1] - first[1];
    });
    self.postMessage([items, size]);
}, false);