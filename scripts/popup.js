let words = [];
let stats = {};
let clusterize = { "phrase": null, "window": null, "ngram": null };

async function scrollRefresh(element) {
    element.style.overflow = "auto";
    requestAnimationFrame(() => {
        element.style.overflow = "overlay";
    });
}

async function searchGram(list) {
    let query = "";
    list.forEach((word) => {
        query += word.replaceAll(" ", "+") + "%2C";
    });
    let xhr = new XMLHttpRequest();
    const year = 2019;
    let url = "https://books.google.com/ngrams/json?content=" + query.slice(0, -3) +
        "&year_start=" + (year - 1) + "&year_end=" + year + "&corpus=26&smoothing=0&case_insensitive=on";
    xhr.open("GET", url);
    xhr.onreadystatechange = function () {
        // fix empty table bug
        if (this.readyState == 4 && this.status == 200) {
            let ngramWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
            ngramWorker.addEventListener("message", function (e) {
                displayArray(e.data[0], "ngram");
                document.getElementById("ngramTable").style.display = "initial";
            });
            ngramWorker.postMessage(JSON.stringify(
                [JSON.parse(xhr.responseText), 0, "ngram"]
            ));
        }
    };
    xhr.send();
}

async function displayArray(array, id) {
    if (clusterize[id]) {
        clusterize[id].update(array);
        document.getElementById(id + "Scroll").scrollTop = 0;
    }
    else {
        clusterize[id] = new Clusterize({
            rows: array,
            scrollId: id + "Scroll",
            contentId: id + "Content",
            show_no_data_row: false,
            callbacks: {
                scrollingProgress: function (progress) {
                    clusterize[id].refresh();
                }
            }
        });
    }
}

function read(index) {
    let gl;
    // if (index == "splch") {
    //     gl = -1.7760706896110616 * (stats.charNum / stats.wordNum) - 0.00010044755744618449 * (stats.wordNum / stats.sentNum) + 1.15 * (stats.sylNum / stats.wordNum) + 12.004162847082352;
    // }
    if (index == "fk") {
        gl = 0.39 * (stats.wordNum / stats.sentNum) + 11.8 * (stats.sylNum / stats.wordNum) - 15.59;
        gl = gl < 0 ? 0 : gl;
    }
    else if (index == "fog") {
        gl = 0.4 * (stats.wordNum / stats.sentNum + stats.polySylNum / stats.wordNum);
    }
    else if (index == "smog") {
        gl = 1.043 * Math.sqrt(stats.polySylNum * 30 / stats.sentNum) + 3.1291;
    }
    else if (index == "cl") {
        gl = 0.0588 * (100 * stats.charNum / stats.wordNum) - 0.296 * (100 * stats.sentNum / stats.wordNum) - 15.8;
        gl = gl < 0 ? 0 : gl;
    }
    else if (index == "ari") {
        gl = 0.37 * (stats.wordNum / stats.sentNum) + 5.84 * (stats.charNum / stats.wordNum) - 26.01;
        gl = gl < 0 ? 0 : gl;
    }
    // else if (index == "lin") {
    //     gl = (stats.wordNum + 2 * stats.polySylNum) / stats.sentNum;
    //     gl = gl > 20 ? gl / 2 : gl / 2 - 1;
    // }
    else {
        console.time("avg readability");
        gl = (2 * read("fk") + 1.8 * read("fog") + 1.75 * read("smog") + 1.25 * read("cl") + 1 * read("ari")) / (2 + 1.8 + 1.75 + 1.25 + 1);
        console.timeEnd("avg readability");
    }
    document.getElementById("read").parentNode.style.background = gl > 6 && gl < 9 ? "#00cc0066" : "#ff000066";
    return Math.round(10 * gl) / 10;
}

async function displayStats() {
    document.getElementById("charNum").innerText = stats.charNum.toLocaleString("en-US");
    document.getElementById("wordNum").innerText = stats.wordNum.toLocaleString("en-US");
    document.getElementById("sentNum").innerText = stats.sentNum.toLocaleString("en-US");

    const avgWord = stats.wordNum / stats.sentNum;
    document.getElementById("avgWord").innerText = avgWord.toLocaleString("en-US", {
        maximumFractionDigits: 1
    });
    document.getElementById("avgWord").parentNode.style.background = avgWord > 14 && avgWord < 21 ? "#00cc0066" : "#ff000066";

    const avgChar = stats.charNum / stats.wordNum;
    document.getElementById("avgChar").innerText = avgChar.toLocaleString("en-US", {
        maximumFractionDigits: 1
    });
    document.getElementById("avgChar").parentNode.style.background = avgChar > 4 && avgChar < 6 ? "#00cc0066" : "#ff000066";

    const lexDen = stats.lexNum / stats.wordNum;
    document.getElementById("lexDen").innerText = lexDen.toLocaleString("en-US", {
        style: "percent"
    });
    document.getElementById("lexDen").parentNode.style.background = lexDen > 0.4 && lexDen < 0.6 ? "#00cc0066" : "#ff000066";

    document.getElementById("read").innerText = read(document.getElementById("selectIndex").value);
}

async function calculateStats(text, words) {
    let statWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
    statWorker.addEventListener("message", function (e) {
        stats = e.data[0];
        displayStats();
    });
    statWorker.postMessage(JSON.stringify(
        [words, text, "stats"]
    ));
}

async function populate(text, words) {
    calculateStats(text, words);

    let phraseWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
    let windowWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));

    phraseWorker.addEventListener("message", function (e) {
        if (e.data[1] == parseInt(document.getElementById("phraseSize").value)) {
            displayArray(e.data[0], "phrase");
        }
    });
    windowWorker.addEventListener("message", function (e) {
        if (e.data[1] == parseInt(document.getElementById("windowSize").value)) {
            displayArray(e.data[0], "window");
        }
    });
    phraseWorker.postMessage(JSON.stringify(
        [words, parseInt(document.getElementById("phraseSize").value), "phrase"]
    ));
    windowWorker.postMessage(JSON.stringify(
        [words, parseInt(document.getElementById("windowSize").value), "window"]
    ));
}

async function calcWords(text) {
    document.getElementById("text").value = text;
    let wordWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
    wordWorker.addEventListener("message", function (e) {
        words = e.data[0].words;
        populate(text, words);
    });
    wordWorker.postMessage(JSON.stringify(
        [words, text, "words"]
    ));
}

async function getText() {
    const hostCodes = {
        "docs.google.com": "https://docs.google.com/document/export?format=txt&id=",

        // "writer.zoho.com" : [document.getElementById("ui-editor-outer-div"), true],
        // https://writer.zoho.com/writer/jsp/export.jsp?FORMAT=txt&ACTION=export&options=%7B%22include_changes%22%3A%22all%22%2C%22include_comments%22%3A%22none%22%7D&rid=
    };

    let url = hostCodes[document.location.hostname];
    if (url) {
        if (document.location.hostname == "docs.google.com") {
            url += document.location.href.split(/d\//)[1].split("/")[0];
        }

        let xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                chrome.runtime.sendMessage(
                    { "text": xhr.responseText }
                );
            }
        };
        xhr.timeout = 5e3;
        xhr.ontimeout = function () {
            chrome.runtime.sendMessage(
                "Text request failed.\n\nThese tips may help:\n\t1. Make sure your main Google account is accessing the document.\n\t2. Copy your text in here, and click outside of the textarea.\n\t3. Reload the extension and try again."
            );
        }
        xhr.send();
    }
    else {
        setTimeout(function () {
            chrome.runtime.sendMessage(
                { "text": document.body.innerText }
            );
        }, 0); // timeout for chrome listener
    }
}

async function callText() {
    if (document.getElementById("text").custom || document.location.protocol != "chrome-extension:") {
        calcWords(document.getElementById("text").value);
    }
    else {
        chrome.tabs.query({ active: true, currentWindow: true }).then(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab[0].id },
                function: getText,
            }, () => {
                chrome.runtime.onMessage.addListener(function listener(result) {
                    chrome.runtime.onMessage.removeListener(listener);
                    calcWords(result.text);
                });
            });
        });
    }
}

document.getElementById("text").addEventListener("keyup", () => {
    document.getElementById("text").custom = true;
    callText();
});

document.getElementById("selectIndex").addEventListener("change", () => {
    if (words) {
        document.getElementById("read").innerText = read(document.getElementById("selectIndex").value);
    }
});

document.getElementById("ngramQuery").addEventListener("change", () => {
    const data = document.getElementById("ngramQuery").value.replaceAll(/,{2,}/g, ",");
    if (data) {
        searchGram(data.split(/\s*,\s*/));
    }
    else {
        document.getElementById("ngramTable").style.display = "none";
    }
});

document.getElementById("phraseSize").addEventListener("change", () => {
    if (words) {
        let phraseWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
        phraseWorker.addEventListener("message", function (e) {
            if (e.data[1] == parseInt(document.getElementById("phraseSize").value)) {
                displayArray(e.data[0], "phrase");
            }
        });
        phraseWorker.postMessage(JSON.stringify(
            [words, parseInt(document.getElementById("phraseSize").value), "phrase"]
        ));
    }
});

document.getElementById("windowSize").addEventListener("change", () => {
    if (words) {
        let windowWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
        windowWorker.addEventListener("message", function (e) {
            if (e.data[1] == parseInt(document.getElementById("windowSize").value)) {
                displayArray(e.data[0], "window");
            }
        });
        windowWorker.postMessage(JSON.stringify(
            [words, parseInt(document.getElementById("windowSize").value), "window"]
        ));
    }
});

document.querySelectorAll("details").forEach(details => {
    details.addEventListener("toggle", event => {
        event.target.scrollIntoView();
        scrollRefresh(document.getElementsByTagName("html")[0]); // remove when chrome fixes bug
    });
});

callText();