let words = [];
let stats = {};
let lastScroll = 0;
let clusterize = { "frequency": null, "window": null, "ngram": null };

async function searchGram(list) {
    let query = "";
    for (let i = 0; i < list.length; i++) {
        query += list[i].replaceAll(" ", "+") + "%2C";
    }

    let xhr = new XMLHttpRequest();
    let url = "https://books.google.com/ngrams/json?content=" + query.slice(0, -3) + "&year_start=2018&year_end=2019&corpus=26&smoothing=0&case_insensitive=on";

    xhr.open("GET", url);
    xhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let ngramWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
            ngramWorker.addEventListener("message", function (e) {
                displayArray(e.data[0], "ngram");
                let hiddenTables = document.getElementsByClassName("clusterize-table hideTable");
                for (let i = 0; i < hiddenTables.length; i++) {
                    hiddenTables[i].classList.remove("hideTable");
                    i--;
                }
            });
            ngramWorker.postMessage(JSON.stringify(
                [JSON.parse(xhr.responseText), 0, "ngram", []]
            ));
        }
    };
    xhr.send();
}

async function displayArray(array, id) {
    if (clusterize[id]) {
        clusterize[id].update(array);
        document.getElementById(id + "Scroll").scrollTop = lastScroll = 0;
    }
    else {
        clusterize[id] = new Clusterize({
            rows: array,
            scrollId: id + "Scroll",
            contentId: id + "Content",
            blocks_in_cluster: 5,
            callbacks: {
                scrollingProgress: function (progress) {
                    clusterize[id].refresh();
                }
            }
        });
    }
}

function read(index) {
    if (index == "fk") {
        return Math.round(0.39 * (stats["wordsNum"] / stats["sentNum"]) + 11.8 * (stats["sylNum"] / stats["wordsNum"]) - 15.59);
    }
    else if (index == "ari") {
        return Math.ceil(0.37 * (stats["wordsNum"] / stats["sentNum"]) + 5.84 * (stats["charNum"] / stats["wordsNum"]) - 26.01);
    }
}

async function displayStats() {
    document.getElementById("charNum").innerText = stats["charNum"].toLocaleString("en-US");
    document.getElementById("wordNum").innerText = stats["wordsNum"].toLocaleString("en-US");
    document.getElementById("sentNum").innerText = stats["sentNum"].toLocaleString("en-US");
    document.getElementById("avgWord").innerText = (stats["wordsNum"] / stats["sentNum"]).toLocaleString("en-US", {
        maximumFractionDigits: 1
    });
    document.getElementById("avgChar").innerText = (stats["charNum"] / stats["wordsNum"]).toLocaleString("en-US", {
        maximumFractionDigits: 1
    });

    document.getElementById("lexDen").innerText = (stats["lexNum"] / stats["wordsNum"]).toLocaleString("en-US", {
        style: "percent"
    });

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
            displayArray(e.data[0], "frequency");
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
        words = e.data[0]["words"];
        populate(text, words);
    });

    wordWorker.postMessage(JSON.stringify(
        [[], text, "words"]
    ));

}

async function getText() {
    let hostCodes = {
        "docs.google.com": "https://docs.google.com/document/export?format=txt&id=",

        // "writer.zoho.com": [document.getElementById("ui-editor-outer-div"), true],
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
                    xhr.responseText
                );
            }
        };
        xhr.timeout = 1e4;
        xhr.ontimeout = function () {
            chrome.runtime.sendMessage(
                "Copy your text in here, and press the Analyze Textarea button."
            );
        }
        xhr.send();
    }
    else {
        chrome.runtime.sendMessage(
            document.body.innerText
        );
    }
}

document.getElementById("analyze").addEventListener("click", () => {
    if (document.getElementById("text").custom) {
        calcWords(document.getElementById("text").value);
    }
    else {
        chrome.tabs.query({ active: true, currentWindow: true }).then(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab[0].id },
                function: getText,
            }, () => {
                new Promise(resolve => {
                    chrome.runtime.onMessage.addListener(function listener(result) {
                        chrome.runtime.onMessage.removeListener(listener);
                        resolve(result);
                    });
                }).then(result => {
                    calcWords(result);
                })
            })
        });
    }
});

document.getElementById("text").addEventListener("change", () => {
    document.getElementById("text").custom = true;
    document.getElementById("analyze").value = "Analyze Textarea";
});

document.getElementById("selectIndex").addEventListener("change", () => {
    if (words) {
        document.getElementById("read").innerText = read(document.getElementById("selectIndex").value);
    }
});

document.getElementById("ngramSearch").addEventListener("click", () => {
    let data = document.getElementById("ngramQuery").value;
    if (data) {
        searchGram(data.replaceAll(/,{2,}/g, ",").split(/, | ,| , |,/));
    }
});

document.getElementById("phraseSize").addEventListener("change", () => {
    if (words) {
        let phraseWorker = new Worker(chrome.runtime.getURL("scripts/worker.js"));
        phraseWorker.addEventListener("message", function (e) {
            if (e.data[1] == parseInt(document.getElementById("phraseSize").value)) {
                displayArray(e.data[0], "frequency");
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
        document.getElementById("windowScroll").scrollTop = 0;
    }
});

document.getElementById("analyze").click();