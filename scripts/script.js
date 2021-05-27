let words, stats;
const clusterize = { "phrase": null, "window": null, "ngram": null };

function scrollRefresh(element) {
	element.style.overflow = "auto";
	requestAnimationFrame(() => {
		element.style.overflow = "overlay";
	});
}

function searchGram(list) {
	let query = "";
	for (let i = 0, length = list.length; i < length; i++) {
		query += list[i].replaceAll(" ", "+") + "%2C";
	}
	const xhr = new XMLHttpRequest();
	const year = 2019;
	const url = "https://books.google.com/ngrams/json?content=" + query.slice(0, -3) +
		"&year_start=" + (year - 1) + "&year_end=" + year + "&corpus=26&smoothing=0&case_insensitive=on";
	xhr.open("GET", url);
	xhr.onreadystatechange = function () {
		// fix empty table bug
		if (this.readyState == 4 && this.status == 200) {
			const ngramWorker = new Worker("scripts/worker.js");
			ngramWorker.addEventListener("message", e => {
				displayArray(e.data.freqMap, "ngram");
				document.getElementById("ngramTable").style.display = "initial";
			});
			ngramWorker.postMessage(JSON.stringify(
				{
					"words": JSON.parse(xhr.responseText),
					"size": 0,
					"type": "ngram"
				}
			));
		}
	};
	xhr.send();
}

function displayArray(array, id) {
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
				scrollingProgress: function () {
					clusterize[id].refresh();
				}
			}
		});
	}
}

function read(index, round = true) {
	let gl;
	switch (index) {
		case "avg":
			gl = (2 * read("fk", false) + 1.8 * read("fog", false) + 1.75 * read("smog", false) + 1.25 * read("cl", false) + 1 * read("ari", false)) / (2 + 1.8 + 1.75 + 1.25 + 1);
			break;
		case "splch":
			gl = -1.7760706896110616 * (stats.charNum / stats.wordNum) - 0.00010044755744618449 * (stats.wordNum / stats.sentNum) + 1.15 * (stats.sylNum / stats.wordNum) + 12.004162847082352;
			break;
		case "fk":
			gl = 0.39 * (stats.wordNum / stats.sentNum) + 11.8 * (stats.sylNum / stats.wordNum) - 15.59;
			gl = gl < 0 ? 0 : gl;
			break;
		case "fog":
			gl = 0.4 * (stats.wordNum / stats.sentNum + stats.polySylNum / stats.wordNum);
			break;
		case "smog":
			gl = 1.043 * Math.sqrt(stats.polySylNum * 30 / stats.sentNum) + 3.1291;
			break;
		case "cl":
			gl = 0.0588 * (100 * stats.charNum / stats.wordNum) - 0.296 * (100 * stats.sentNum / stats.wordNum) - 15.8;
			gl = gl < 0 ? 0 : gl;
			break;
		case "ari":
			gl = 0.37 * (stats.wordNum / stats.sentNum) + 5.84 * (stats.charNum / stats.wordNum) - 26.01;
			gl = gl < 0 ? 0 : gl;
			break;
		case "lin":
			gl = (stats.wordNum + 2 * stats.polySylNum) / stats.sentNum;
			gl = gl > 20 ? gl / 2 : gl / 2 - 1;
	}
	if (round) {
		gl = Math.round(10 * gl) / 10;
		document.getElementById("read").parentElement.style.background = gl > 6 && gl < 9 ? "#00cc0066" : "#ff000066";
	}
	return gl;
}

function displayStats() {
	const avgWord = stats.wordNum / stats.sentNum;
	const avgChar = stats.charNum / stats.wordNum;
	const lexDen = stats.lexNum / stats.wordNum;
	document.getElementById("charNum").innerText = stats.charNum.toLocaleString("en-US");
	document.getElementById("wordNum").innerText = stats.wordNum.toLocaleString("en-US");
	document.getElementById("sentNum").innerText = stats.sentNum.toLocaleString("en-US");
	document.getElementById("avgWord").innerText = avgWord.toLocaleString("en-US", {
		maximumFractionDigits: 1
	});
	document.getElementById("avgChar").innerText = avgChar.toLocaleString("en-US", {
		maximumFractionDigits: 1
	});
	document.getElementById("lexDen").innerText = lexDen.toLocaleString("en-US", {
		style: "percent"
	});
	document.getElementById("avgWord").parentElement.style.background = avgWord > 14 && avgWord < 21 ? "#00cc0066" : "#ff000066";
	document.getElementById("avgChar").parentElement.style.background = avgChar > 4 && avgChar < 6 ? "#00cc0066" : "#ff000066";
	document.getElementById("lexDen").parentElement.style.background = lexDen > 0.4 && lexDen < 0.6 ? "#00cc0066" : "#ff000066";
	document.getElementById("read").innerText = read(document.getElementById("selectIndex").value);
}

function calculateStats(text, words) {
	const statsWorker = new Worker("scripts/worker.js");
	statsWorker.addEventListener("message", e => {
		stats = e.data.freqMap;
		displayStats();
	});
	statsWorker.postMessage(JSON.stringify(
		{
			"words": words,
			"size": text,
			"type": "stats"
		}
	));
}

function populate(text, words) {
	calculateStats(text, words);
	const phraseWorker = new Worker("scripts/worker.js");
	const windowWorker = new Worker("scripts/worker.js");
	phraseWorker.addEventListener("message", e => {
		if (e.data.size == parseInt(document.getElementById("phraseSize").value)) {
			displayArray(e.data.freqMap, "phrase");
		}
	});
	windowWorker.addEventListener("message", e => {
		if (e.data.size == parseInt(document.getElementById("windowSize").value)) {
			displayArray(e.data.freqMap, "window");
		}
	});
	phraseWorker.postMessage(JSON.stringify(
		{
			"words": words,
			"size": parseInt(document.getElementById("phraseSize").value),
			"type": "phrase"
		}
	));
	windowWorker.postMessage(JSON.stringify(
		{
			"words": words,
			"size": parseInt(document.getElementById("windowSize").value),
			"type": "window"
		}
	));
}

function calcWords(text) {
	document.getElementById("text").value = text;
	const wordsWorker = new Worker("scripts/worker.js");
	wordsWorker.addEventListener("message", e => {
		words = e.data.freqMap;
		populate(text, words);
	});
	wordsWorker.postMessage(JSON.stringify(
		{
			"words": text,
			"size": 0,
			"type": "words"
		}
	));
}

function getText() {
	const hostCodes = {
		"docs.google.com": "https://docs.google.com/document/export?format=txt&id=",
		// https://writer.zoho.com/writer/jsp/export.jsp?FORMAT=txt&ACTION=export&options=%7B%22include_changes%22%3A%22all%22%2C%22include_comments%22%3A%22none%22%7D&rid=
	};
	let url = hostCodes[document.location.hostname];
	if (url) {
		if (document.location.hostname == "docs.google.com") {
			url += document.location.href.split(/d\//)[1].split("/")[0];
		}
		let failText = "Text request failed.\n\nThese tips may help:\n\t1. Make sure your main Google account is accessing the document.\n\t2. Copy your text in here, and click outside of the textarea.\n\t3. Reload the extension and try again.";
		const xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.onreadystatechange = function () {
			if (this.readyState == 4 && this.status == 200) {
				if (xhr.responseText) {
					failText = xhr.responseText;
				}
				chrome.runtime.sendMessage(
					{ "text": failText }
				);
			}
		};
		xhr.timeout = 5e3;
		xhr.ontimeout = function () {
			chrome.runtime.sendMessage(
				{ "text": failText }
			);
		}
		xhr.send();
	}
	else {
		setTimeout(_ => {
			chrome.runtime.sendMessage(
				{ "text": document.body.innerText }
			);
		}, 0); // timeout for chrome listener
	}
}

function callText() {
	if (document.getElementById("text").custom || document.location.protocol != "chrome-extension:") {
		calcWords(document.getElementById("text").value);
	}
	else {
		chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				function: getText,
			}, _ => {
				chrome.runtime.onMessage.addListener(function listener(result) {
					chrome.runtime.onMessage.removeListener(listener);
					calcWords(result.text);
				});
			});
		});
	}
}

document.getElementById("text").addEventListener("keyup", e => {
	e.target.custom = true;
	callText();
});

document.getElementById("selectIndex").addEventListener("change", e => {
	if (words) {
		document.getElementById("read").innerText = read(e.target.value);
	}
});

document.getElementById("ngramQuery").addEventListener("change", e => {
	const data = e.target.value.replaceAll(/,{2,}/g, ",");
	if (data) {
		searchGram(data.split(/\s*,\s*/));
	}
	else {
		document.getElementById("ngramTable").style.display = "none";
	}
});

document.getElementById("phraseSize").addEventListener("change", e => {
	if (words) {
		const phraseWorker = new Worker("scripts/worker.js");
		phraseWorker.addEventListener("message", rsp => {
			if (rsp.data.size == parseInt(e.target.value)) {
				displayArray(rsp.data.freqMap, "phrase");
			}
		});
		phraseWorker.postMessage(JSON.stringify(
			{
				"words": words,
				"size": parseInt(e.target.value),
				"type": "phrase"
			}
		));
	}
});

document.getElementById("windowSize").addEventListener("change", e => {
	if (words) {
		const windowWorker = new Worker("scripts/worker.js");
		windowWorker.addEventListener("message", rsp => {
			if (rsp.data.size == parseInt(e.target.value)) {
				displayArray(rsp.data.freqMap, "window");
			}
		});
		windowWorker.postMessage(JSON.stringify(
			{
				"words": words,
				"size": parseInt(e.target.value),
				"type": "window"
			}
		));
	}
});

document.querySelectorAll("details").forEach(details => {
	details.addEventListener("toggle", e => {
		e.target.scrollIntoView();
		scrollRefresh(document.getElementsByTagName("html")[0]); // remove if chrome fixes bug
	});
});

window.onload = callText;
