const puppeteer = require('puppeteer');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync("./config.json"))

function timeout(miliseconds) {
	return new Promise((resolve) => {
		setTimeout(() => {resolve()}, miliseconds)
	})
}

// function expression
const setupBrowser = async () => {
  const viewportHeight = 1024;
  const viewportWidth = 1080;
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0); 
  await page.setViewport({width: viewportWidth, height: viewportHeight});
  
  page.on('console', async (msg) => {
	const msgArgs = msg.args();
	for (let i = 0; i < msgArgs.length; ++i) {
	  try {
		// console.log(await msgArgs[i].jsonValue());
	  } catch(e) {
	  	// console.log(e);
	  }
    }
  });

  return [browser, page]
}

async function glassdoorLogin(page, config) {
	await page.goto("https://www.glassdoor.com/index.htm")

	await page.waitForSelector("#inlineUserEmail")
	await page.focus("#inlineUserEmail")
	await page.keyboard.type(config.username)

	await page.evaluate(() => {
		document.querySelector("[type=\"submit\"]").click()
	})
	await timeout(1000)
	

	await page.waitForSelector("#inlineUserPassword")
	await page.focus("#inlineUserPassword")
	await page.keyboard.type(config.password)

	await page.evaluate(() => {
		document.querySelector("[type=\"submit\"]").click()
	})

	await page.waitForNavigation({ timeout: 0 })
}

async function getGlassdoorCompanies(page) {
	await page.goto("https://www.glassdoor.com/Reviews/index.htm?overall_rating_low=1&page=1&filterType=RATING_OVERALL");

	await page.waitForSelector("[data-test=\"employer-card-single\"]")
	const employerCards = await page.$$("[data-test=\"employer-card-single\"]");

	console.log("employerCards length:", employerCards?.length || 0)
	const companyUrls = []
	for (let employerCard of employerCards) {
		const jobsATag = await employerCard.$("[data-test=\"cell-Jobs-url\"]")
		const jobsHref = await page.evaluate((jobsATag) => {
			return `${window.location.origin}${jobsATag.getAttribute("href")}`
		}, jobsATag);
		const reviewsATag = await employerCard.$("[data-test=\"cell-Reviews-url\"]")
		const reviewsHref = await page.evaluate((reviewsATag) => {
			return `${window.location.origin}${reviewsATag.getAttribute("href")}`
		}, reviewsATag);
		console.log("jobsHref:", jobsHref)
		console.log("reviewsHref:", reviewsHref)
		companyUrls.push({
			reviews: reviewsHref,
			jobs: jobsHref
		})
	}

	return companyUrls
}

async function getGlassdoorJobs(page, jobUrl) {
	await page.goto(jobUrl)
	await page.waitForSelector("[data-test=\"job-link\"]")
	return await page.evaluate(() => {
		return Array.from(document.querySelectorAll('[data-test=\"job-link\"]')).map((jobLink) => {
			return `${window.location.origin}${jobLink.getAttribute('href')}`;
		})
	})
}

async function getGlassdoorJobDescription(page, jobPageUrl) {
	await timeout(2000)
	await page.goto(jobPageUrl)	

	await page.waitForSelector("#JobDescriptionContainer", { timeout: 0 })

	return await page.evaluate(() => {
		return document.querySelector("#JobDescriptionContainer").innerText
	})
}

async function getGlassdoorReviews(page, reviewUrl) {
	await page.goto(reviewUrl)

	// await timeout(1000000)
	await page.waitForSelector("#ReviewHighlightsModule", {timeout: 0});
	await page.waitForSelector("#ReviewHighlightsModule [data-test=\"eiModuleMain\"] > div:nth-child(1)", {timeout: 0})
	const result = await page.evaluate(() => {

		const highlightLink = document.querySelector("#ReviewHighlightsModule [data-test=\"highlights-toggle-link\"]")
		if (highlightLink) {

			highlightLink.click();
		} else {
			const highlightLink2 = document.querySelector("#ReviewHighlightsModule button")
			if (highlightLink2) {
				highlightLink2.click()
			}
		}

		return true
	});

	console.log("TEST", result)
	await timeout(2000);
	await page.waitForSelector("#ReviewHighlightsModule [data-test=\"eiModuleMain\"] > div", {timeout: 0})
	const pageRows = await page.$$("#ReviewHighlightsModule [data-test=\"eiModuleMain\"] > div")
	console.log("SHOULD BE ELEMENT HANDLE:", pageRows)


	const proslinks = await pageRows[0].$$("a");
	const conslinks = await pageRows[1].$$("a");

	const pros = [];
	const cons = [];
	for (const link of proslinks) {
		pros.push(await page.evaluate((link) => {
			return link.innerText
		}, link))
	}

	for (const link of conslinks) {
		cons.push(await page.evaluate((link) => {
			return link.innerText
		}, link))
	}

	return { pros, cons }
//   //text()[contains(.,'Herbert')]
	// return await page.evaluate((rows) => {
	// 	// const prosElement = document.evaluate('//text()[contains(.,\'PROS\')]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
	// 	const prosRow = rows[0]
	// 	const pros = prosRow.querySelectorAll("a").map((link) => {
	// 		return link.innerText
	// 	});
	// 	// const consElement = document.evaluate('//text()[contains(.,\'CONS\')]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
	// 	const consRow = rows[1]
	// 	const cons = consRow.querySelectorAll("a").map((link) => {
	// 		return link.innerText
	// 	});

	// 	return {
	// 		pros, cons
	// 	}
	// }, pageRows);
}

function generatePrompt(jobDescription, pros, cons) {
	return `[JOB-VETTER-JOB-DESCRIPTION]\n${jobDescription}\n[JOB-VETTER-JOB-LABELS]\nPROS: ${pros.join(', ')}\nCONS: ${cons.join(', ')}`
}

async function main() {
	const [browser, page] = await setupBrowser();

	// first we need to login to glassdoor
	// then we gotta do a company reviews search
		// https://www.glassdoor.com/Reviews/index.htm?overall_rating_low=1&page=1&filterType=RATING_OVERALL
		// get each company
			// go to the page get ~10 job descriptions
			// then get the reviews for the company

	// using this data we will build a dataset

	/*
	[JOB-VETTER-JOB-DESCRIPTION]
	
	Description

	[JOB-VETTER-JOB-LABELS]

	PROS: ...
	CONS: ...
	*/

	console.log("Start Login:")
	await glassdoorLogin(page, config);
	console.log("End Login:")

	// [{ jobPage, reviewsPage}]
	console.log("Start Glassdoor Companies:")
	const companyUrls = await getGlassdoorCompanies(page)
	console.log("End Glassdoor Companies:")

	const dataset = [];
	for (let [i, companyUrl] of companyUrls.entries()) {
		if (i < 3) {
			continue
		}
		console.log("companyUrl:", companyUrl)
		const { pros, cons } = await getGlassdoorReviews(page, companyUrl.reviews)
		console.log("Reviews:", pros, cons)

		let jobs = await getGlassdoorJobs(page, companyUrl.jobs)
		jobs = jobs.slice(0,5);

		console.log("Jobs:", jobs)

		for (let job of jobs) {
			const jobDescription = await getGlassdoorJobDescription(page, job)
			const prompt = generatePrompt(jobDescription, pros, cons)
			dataset.push(prompt)
			fs.writeFileSync("./dataset.json", JSON.stringify(dataset))
		}
	}

	return true;
}

main()