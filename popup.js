async function getText(wait) {
    let hostCodes = {
        "docs.google.com": [document.getElementsByClassName("kix-appview-editor")[0], true],
        // "personalmicrosoftsoftware-my.sharepoint.com": [document.getElementById("WACViewPanel"), false],
        "writer.zoho.com": [document.getElementById("ui-editor-outer-div"), true],
        "www.icloud.com": [document.getElementsByClassName("atv4 iwork sc-view iw-canvas-container-view focus sc-regular-size")[0], false],
        // "paper.dropbox.com": [document.getElementById("padpage-container"), true],
    };

    let val = hostCodes[document.location.hostname];
    if (val) {
        let [element, scroll] = val;
        if (scroll) {
            function scrollTo(element) {
                if (element) {
                    if (element.scrollHeight - element.scrollTop > 1.5 * element.getBoundingClientRect().height) {
                        element.scrollTop += element.getBoundingClientRect().height / 3;
                        return 0;
                    }
                    else {
                        return 1;
                    }
                }
                else {
                    return 1;
                }
            }

            let initialScroll = element.scrollTop;
            element.scrollTop = 0;

            let intervalId = window.setInterval(
                () => {
                    if (scrollTo(element)) {
                        chrome.runtime.sendMessage(
                            element.innerText
                        );
                        clearInterval(intervalId);
                        element.scrollTop = initialScroll;
                    }
                }, parseInt(wait));
        }
        else {
            chrome.runtime.sendMessage(
                element.innerText
            );
        }
    }

    else {
        chrome.runtime.sendMessage(
            document.body.innerText
        );
    }
}

async function searchGram(list) {
    let query = "";
    for (let i = 0; i < list.length; i++) {
        query += list[i].replaceAll(" ", "+") + "%2C";
    }

    let xmlhttp = new XMLHttpRequest();
    let url = "https://books.google.com/ngrams/json?content=" + query.slice(0, -3) + "&year_start=2018&year_end=2019&corpus=26&smoothing=0&case_insensitive=on";

    xmlhttp.open("GET", url);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let data = [];
            let resp = JSON.parse(xmlhttp.responseText);
            for (i = 0; i < resp.length; i++) {
                if (resp[i]["parent"] == "") {
                    data.push([resp[i]["ngram"], resp[i]["timeseries"][resp[i]["timeseries"].length - 1]]);
                }
            }
            data.sort(function (first, second) {
                return second[1] - first[1];
            });
            for (i = 0; i < data.length; i++) {
                data[i][1] = data[i][1].toLocaleString("en-US", {
                    style: 'percent',
                    minimumFractionDigits: 10
                });
            }
            displayArray(data, document.getElementById("ngramTable"));
            document.getElementById("ngramTable").removeAttribute("hidden");
        }
    };
}

function windowFreq(words, size) {
    let freqMap = {};
    for (let i = size; i < words.length; i += size) {
        let windowMap = {};
        for (let j = size; j > 0; j--) {
            if (!windowMap[words[i - j]]) {
                windowMap[words[i - j]] = 0;
            }
            windowMap[words[i - j]] += 1;
        }
        for (const [key, value] of Object.entries(windowMap)) {
            if (value == 1) delete windowMap[key];
            else {
                if (!freqMap[key]) {
                    freqMap[key] = 0;
                }
                freqMap[key] += 1;
            }
        }
    }
    let items = Object.keys(freqMap).map(function (key) {
        return [key, freqMap[key]];
    });
    items.sort(function (first, second) {
        return second[1] - first[1];
    });
    return items;
}

function phraseFreq(words, size) {
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
        freqMap[phrase] += 1;
    }
    let items = Object.keys(freqMap).map(function (key) {
        return [key, freqMap[key]];
    });
    items.sort(function (first, second) {
        return second[1] - first[1];
    });
    return items;
}

function displayArray(array, table) {
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    array.forEach(function (a) {
        let row = table.insertRow(-1);
        let word = row.insertCell(0);
        let count = row.insertCell(1);
        word.innerText = a[0];
        count.innerText = a[1];
    });
}

function displayStats(text, words) {
    let sentNum = (text.match(/\.{1,}|\?{1,}|\!{1,}/g) || []).length;
    let charNum = 0;
    let lexNum = 0;
    for (let i = 0; i < words.length; i++) {
        charNum += words[i].length;
        lexNum += stopWords.includes(words[i].toLowerCase()) ? 0 : 1;
    }
    let wordsNum = words.length;

    document.getElementById("charNum").innerText = charNum.toLocaleString("en-US");
    document.getElementById("wordNum").innerText = wordsNum.toLocaleString("en-US");
    document.getElementById("sentNum").innerText = sentNum.toLocaleString("en-US");
    document.getElementById("avgWord").innerText = Math.round(
        10 * wordsNum / sentNum,
    ) / 10;
    document.getElementById("avgChar").innerText = Math.round(
        10 * charNum / wordsNum
    ) / 10;

    document.getElementById("lexDen").innerText = (lexNum / wordsNum).toLocaleString("en-US", {
        style: 'percent'
    });
    document.getElementById("autoRead").innerText = Math.ceil(
        4.71 * (charNum / wordsNum) + 0.5 * (wordsNum / sentNum) - 21.43
    );
}

async function populate(text) {
    words = text.replaceAll(
        /\P{L}+/gu, " "
    ).split(" ");
    for (let i = 0; i < words.length; i++) {
        if (["s", "t", "d", "m", "ve", "ll", "re", "ch", ""].includes(words[i])) {
            words.splice(i, 1);
            i--;
        }
    }

    document.getElementById("text").innerText = text;

    displayStats(text, words);
    displayArray(phraseFreq(
        words,
        parseInt(document.getElementById("phraseSize").value)
    ), document.getElementById("frequency"));
    displayArray(windowFreq(
        words,
        parseInt(document.getElementById("windowSize").value)
    ), document.getElementById("window"));
}

document.getElementById("analyze").addEventListener("click", () => {
    if (document.getElementById("text").custom) {
        populate(document.getElementById("text").value);
    }
    else {
        chrome.tabs.executeScript({ code: `(${getText})(${document.getElementById("wait").value})` }, () => {
            new Promise(resolve => {
                chrome.runtime.onMessage.addListener(function listener(result) {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve(result);
                });
            }).then(result => {
                populate(result);
            });
        });
    }
});

document.getElementById("ngramSearch").addEventListener("click", () => {
    let data = document.getElementById("ngram").value;
    if (data) {
        searchGram(data.split(/, | ,| , |,/));
    }
});

document.getElementById("phraseSize").addEventListener("change", () => {
    displayArray(phraseFreq(
        words,
        parseInt(document.getElementById("phraseSize").value)
    ), document.getElementById("frequency"));
});

document.getElementById("windowSize").addEventListener("change", () => {
    displayArray(windowFreq(
        words,
        parseInt(document.getElementById("windowSize").value)
    ), document.getElementById("window"));
});

document.getElementById("text").addEventListener("change", () => {
    document.getElementById("text").custom = true;
    document.getElementById("analyze").value = "Analyze Textarea";
});

let stopWords = ["a", "about", "above", "across", "after", "again", "against", "all", "almost", "alone", "along", "already", "also", "although", "always", "among", "an", "and", "another", "any", "anybody", "anyone", "anything", "anywhere", "are", "area", "areas", "around", "as", "ask", "asked", "asking", "asks", "at", "away", "b", "back", "backed", "backing", "backs", "be", "became", "because", "become", "becomes", "been", "before", "began", "behind", "being", "beings", "best", "better", "between", "big", "both", "but", "by", "c", "came", "can", "cannot", "case", "cases", "certain", "certainly", "clear", "clearly", "come", "could", "d", "did", "differ", "different", "differently", "do", "does", "done", "down", "down", "downed", "downing", "downs", "during", "e", "each", "early", "either", "end", "ended", "ending", "ends", "enough", "even", "evenly", "ever", "every", "everybody", "everyone", "everything", "everywhere", "f", "face", "faces", "fact", "facts", "far", "felt", "few", "find", "finds", "first", "for", "four", "from", "full", "fully", "further", "furthered", "furthering", "furthers", "g", "gave", "general", "generally", "get", "gets", "give", "given", "gives", "go", "going", "good", "goods", "got", "great", "greater", "greatest", "group", "grouped", "grouping", "groups", "h", "had", "has", "have", "having", "he", "her", "here", "herself", "high", "high", "high", "higher", "highest", "him", "himself", "his", "how", "however", "i", "if", "important", "in", "interest", "interested", "interesting", "interests", "into", "is", "it", "its", "itself", "j", "just", "k", "keep", "keeps", "kind", "knew", "know", "known", "knows", "l", "large", "largely", "last", "later", "latest", "least", "less", "let", "lets", "like", "likely", "long", "longer", "longest", "m", "made", "make", "making", "man", "many", "may", "me", "member", "members", "men", "might", "more", "most", "mostly", "mr", "mrs", "much", "must", "my", "myself", "n", "necessary", "need", "needed", "needing", "needs", "never", "new", "new", "newer", "newest", "next", "no", "nobody", "non", "noone", "not", "nothing", "now", "nowhere", "number", "numbers", "o", "of", "off", "often", "old", "older", "oldest", "on", "once", "one", "only", "open", "opened", "opening", "opens", "or", "order", "ordered", "ordering", "orders", "other", "others", "our", "out", "over", "p", "part", "parted", "parting", "parts", "per", "perhaps", "place", "places", "point", "pointed", "pointing", "points", "possible", "present", "presented", "presenting", "presents", "problem", "problems", "put", "puts", "q", "quite", "r", "rather", "really", "right", "right", "room", "rooms", "s", "said", "same", "saw", "say", "says", "second", "seconds", "see", "seem", "seemed", "seeming", "seems", "sees", "several", "shall", "she", "should", "show", "showed", "showing", "shows", "side", "sides", "since", "small", "smaller", "smallest", "so", "some", "somebody", "someone", "something", "somewhere", "state", "states", "still", "still", "such", "sure", "t", "take", "taken", "than", "that", "the", "their", "them", "then", "there", "therefore", "these", "they", "thing", "things", "think", "thinks", "this", "those", "though", "thought", "thoughts", "three", "through", "thus", "to", "today", "together", "too", "took", "toward", "turn", "turned", "turning", "turns", "two", "u", "under", "until", "up", "upon", "us", "use", "used", "uses", "v", "very", "w", "want", "wanted", "wanting", "wants", "was", "way", "ways", "we", "well", "wells", "went", "were", "what", "when", "where", "whether", "which", "while", "who", "whole", "whose", "why", "will", "with", "within", "without", "work", "worked", "working", "works", "would", "x", "y", "year", "years", "yet", "you", "young", "younger", "youngest", "your", "yours", "z"];
let words;

document.getElementById("analyze").click();