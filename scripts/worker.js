const stopWords = ["a", "about", "above", "across", "after", "again", "against", "all", "almost", "alone", "along", "already", "also", "although", "always", "among", "an", "and", "another", "any", "anybody", "anyone", "anything", "anywhere", "are", "area", "areas", "around", "as", "ask", "asked", "asking", "asks", "at", "away", "b", "back", "backed", "backing", "backs", "be", "became", "because", "become", "becomes", "been", "before", "began", "behind", "being", "beings", "best", "better", "between", "big", "both", "but", "by", "c", "came", "can", "cannot", "case", "cases", "certain", "certainly", "clear", "clearly", "come", "could", "d", "did", "differ", "different", "differently", "do", "does", "done", "down", "down", "downed", "downing", "downs", "during", "e", "each", "early", "either", "end", "ended", "ending", "ends", "enough", "even", "evenly", "ever", "every", "everybody", "everyone", "everything", "everywhere", "f", "face", "faces", "fact", "facts", "far", "felt", "few", "find", "finds", "first", "for", "four", "from", "full", "fully", "further", "furthered", "furthering", "furthers", "g", "gave", "general", "generally", "get", "gets", "give", "given", "gives", "go", "going", "good", "goods", "got", "great", "greater", "greatest", "group", "grouped", "grouping", "groups", "h", "had", "has", "have", "having", "he", "her", "here", "herself", "high", "high", "high", "higher", "highest", "him", "himself", "his", "how", "however", "i", "if", "important", "in", "interest", "interested", "interesting", "interests", "into", "is", "it", "its", "itself", "j", "just", "k", "keep", "keeps", "kind", "knew", "know", "known", "knows", "l", "large", "largely", "last", "later", "latest", "least", "less", "let", "lets", "like", "likely", "long", "longer", "longest", "m", "made", "make", "making", "man", "many", "may", "me", "member", "members", "men", "might", "more", "most", "mostly", "mr", "mrs", "much", "must", "my", "myself", "n", "necessary", "need", "needed", "needing", "needs", "never", "new", "new", "newer", "newest", "next", "no", "nobody", "non", "noone", "not", "nothing", "now", "nowhere", "number", "numbers", "o", "of", "off", "often", "old", "older", "oldest", "on", "once", "one", "only", "open", "opened", "opening", "opens", "or", "order", "ordered", "ordering", "orders", "other", "others", "our", "out", "over", "p", "part", "parted", "parting", "parts", "per", "perhaps", "place", "places", "point", "pointed", "pointing", "points", "possible", "present", "presented", "presenting", "presents", "problem", "problems", "put", "puts", "q", "quite", "r", "rather", "really", "right", "right", "room", "rooms", "s", "said", "same", "saw", "say", "says", "second", "seconds", "see", "seem", "seemed", "seeming", "seems", "sees", "several", "shall", "she", "should", "show", "showed", "showing", "shows", "side", "sides", "since", "small", "smaller", "smallest", "so", "some", "somebody", "someone", "something", "somewhere", "state", "states", "still", "still", "such", "sure", "t", "take", "taken", "than", "that", "the", "their", "them", "then", "there", "therefore", "these", "they", "thing", "things", "think", "thinks", "this", "those", "though", "thought", "thoughts", "three", "through", "thus", "to", "today", "together", "too", "took", "toward", "turn", "turned", "turning", "turns", "two", "u", "under", "until", "up", "upon", "us", "use", "used", "uses", "v", "very", "w", "want", "wanted", "wanting", "wants", "was", "way", "ways", "we", "well", "wells", "went", "were", "what", "when", "where", "whether", "which", "while", "who", "whole", "whose", "why", "will", "with", "within", "without", "work", "worked", "working", "works", "would", "x", "y", "year", "years", "yet", "you", "young", "younger", "youngest", "your", "yours", "z"];

function sortMap(freqMap, type, stopWords) {
	const items = Object.keys(freqMap).map(function (key) {
		return [key, freqMap[key]];
	}).sort(function (first, second) {
		return second[1] - first[1];
	});
	const length = items.length;
	for (let i = 0; i < length; i++) {
		const row = `<td>${items[i][0]}</td><td>${type != "ngram"
			? items[i][1]
			: items[i][1].toLocaleString("en-US", {
				style: "percent",
				minimumFractionDigits: 10,
			})
			}</td></tr>`;
		let gray = 0;
		const words = items[i][0].split(" ");
		const wordsLength = words.length;
		for (let i = 0; i < wordsLength; i++) {
			gray += stopWords.includes(words[i].toLowerCase()) ? 1 : 0;
		}
		// items[i] = `<tr style="color: #000000${ Math.round(255 - 255/2 * gray / wordsLength).toString(16) }">${row}`;
		// items[i] = `<tr style="background: #CCCCCC${ Math.round(255 * gray / wordsLength).toString(16) }">${row}`;
		if (gray == wordsLength) {
			items[i] = `<tr style="background: #CCCCCC">${row}`;
		} else {
			items[i] = `<tr>${row}`;
		}
	}
	return items;
}

function syllables(word) {
	return word.replace(
		/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, ""
	).replace(
		/^y/, ""
	).match(
		/[aeiouy]{1,2}/g
	)?.length || 1;
}

function statsCalc(words, text, stopWords) {
	const sentNum = (text.match(/\.+|\?+|\!+|\S(\s*\n|$)/g) || []).length;
	const wordNum = words.length;
	let charNum = 0;
	let lexNum = 0;
	let sylNum = 0;
	let polySylNum = 0;
	for (let i = 0; i < wordNum; i++) {
		charNum += words[i].length;
		lexNum += stopWords.includes(words[i]) ? 0 : 1;
		const syl = syllables(words[i]);
		sylNum += syl;
		if (syl > 2) {
			polySylNum++;
		}
	}
	return {
		sentNum,
		wordNum,
		charNum,
		lexNum,
		sylNum,
		polySylNum
	};
}

function wordSplit(words) {
	words = words.toLowerCase().split(/\P{L}+/u);
	const length = words.length;
	for (let i = 0; i < length; i++) {
		if (["s", "t", "d", "m", "ve", "ll", "re", "ch", ""].includes(words[i])) {
			words.splice(i, 1);
			i--;
		}
	}
	return words;
}

function ngramSort(words) {
	const ngrams = {};
	const length = words.length;
	for (let i = 0; i < length; i++) {
		ngrams[words[i].ngram] = words[i].timeseries[words[i].timeseries.length - 1];
	}
	return ngrams;
}

function windowSort(words, size) {
	const freqMap = {};
	const loops = words.length + 1;
	for (let i = size; i < loops; i += size - 1) {
		const windowMap = {};
		for (let j = size; j > 0; j--) {
			if (!windowMap[words[i - j]]) {
				windowMap[words[i - j]] = 0;
			}
			windowMap[words[i - j]]++;
		}
		for (let key in windowMap) {
			if (windowMap[key] > 1) {
				if (!freqMap[key]) {
					freqMap[key] = 0;
				}
				freqMap[key]++;
			}
		}
	}
	return freqMap;
}

function phraseSort(words, size) {
	const freqMap = {};
	const loops = words.length + 1;
	for (let i = size; i < loops; i++) {
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

self.addEventListener("message", function (e) {
	const { words, size, type } = JSON.parse(e.data);
	performance.mark("start");
	let freqMap;
	switch (type) {
		case "phrase":
			if (size > 0) {
				freqMap = sortMap(phraseSort(words, size), type, stopWords)
			}
			break;
		case "window":
			if (size > 1) {
				freqMap = sortMap(windowSort(words, size), type, stopWords)
			}
			break;
		case "words":
			freqMap = wordSplit(words);
			break;
		case "stats":
			freqMap = statsCalc(words, size, stopWords);
			break;
		case "ngram":
			freqMap = sortMap(ngramSort(words), type, stopWords);
	}
	performance.mark("end");
	self.postMessage({
		freqMap,
		size
	});
	performance.measure(
		type,
		"start",
		"end"
	);
	const duration = Math.round(1000 * performance.getEntriesByName(type)[performance.getEntriesByName(type).length - 1].duration) / 1000;
	console.log(
		`${type}: %c${duration} ms`,
		`color: ${duration > 100 / 6 ? "red" : "green"};`,
	);
});
