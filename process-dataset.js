const fs = require("fs");

async function run() {
	const dataset = JSON.parse(fs.readFileSync("./dataset.json"))

	let total = 0;
	let min = 0;
	let max = 0;

	for (let datasetItem of dataset) {
		let wordCount = datasetItem.split(" ").length
		total += wordCount
		if (wordCount > max) {
			max = wordCount 
		}
		if (min === 0) {
			min = wordCount
		} else if (wordCount < min) {
			min = wordCount
		}
	}

	console.log("Dataset Info (word count):")
	console.log("Min Length:", min)
	console.log("Max length:", max)
	console.log("Average Length:", (total/dataset.length).toFixed(2))
	console.log("Total Size:", total)
	console.log("Approximate Token Size:", Math.round(total*1.3))

	return true
}

run()