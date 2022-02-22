"use strict";
const chromium = require("chrome-aws-lambda");
const puppeteer = require('puppeteer-core');

const UserAgent = require("user-agents");
const axios = require("axios");
const DDG = require("duck-duck-scrape");

const visit = async (page, url) => {
  if(!url.startsWith('http')){
    url = 'https://'+url
  }

  try{
    await page.goto(url, {timeout:30000})
    // await page.waitForNavigation({timeout:60000})
  }catch(e){
    return []
  }
  const cookies = await page.cookies();

  return cookies;
};

const getProxy = async (country = "es") => {
  const res = await axios.get(
    `https://proxy6.net/api/${process.env.PROXY6_TOKEN}/getproxy`
  );
  const proxies = Object.values(res.data.list).filter(l => l.active === '1' && l.country === country)

  return shuffle(proxies).pop()
};

const getPuppet = async ({ headless = true, proxy, username, password }) => {
  const userAgentInstance = new UserAgent();
  const userAgent = userAgentInstance.toString();

  // console.log(proxy)
  const options = {
    headless,
    // browserWSEndpoint: chromium.endpoint,
    executablePath: await chromium.executablePath,
    defaultViewport: {
      height: userAgentInstance.data.screenHeight,
      width: userAgentInstance.data.screenWidth,
    },
    args: [...chromium.args, "--no-sandbox","--disable-dev-shm-usage"],
  };
  if (proxy) {
    options.args.push(`--proxy-server=${proxy}`);
  }

  try {
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    if (username) {
      await page.authenticate({
        username,
        password,
      });
    }

    await page.setUserAgent(userAgent);

    return {
      page,
      browser,
      userAgent,
    };
  } catch (e) {
    console.log(e)
  }
};

const createCookies = async (page, links, exclude) => {
  let allCookies = [];
  exclude = exclude ? exclude : [];

  for (const site of links) {
    const cookies = await visit(page, site);
    allCookies = [
      ...allCookies,
      ...cookies.map((c) => ({ ...c, key: c.domain + c.name })),
    ];

    console.log({allCookies})

    const hrefs = await page.$$eval("a", (as) => as.map((a) => a.href)).catch(e => {
      console.log(e)
      return []
    });
    
    const mailLinks = hrefs
      .filter((l) => l.includes(site) && !exclude.includes(l)) // l.includes("facebook") && !l.includes(".ru") && !l.includes("vk.com") && !l.includes("mailto"))
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
      .slice(0, 5);

    for (const link of mailLinks) {
      const cookies = await visit(page, link).catch((e) => []);
      allCookies = [
        ...allCookies,
        ...cookies.map((c) => ({ ...c, key: c.domain + c.name })),
      ];
    }
  }

  const uniqCookies = {};
  for (const c of allCookies) {
    uniqCookies[c.key] = c;
  }

  const cookies = Object.values(uniqCookies).reduce((acc, i) => {
    acc += `${i.domain}\t${String(i.secure).toUpperCase()}\t${i.path}\t${String(
      i.session
    ).toUpperCase()}\t${String(i.expires).split(".").shift()}\t${i.name}\t${
      i.value
    }\n`;
    return acc;
  }, "");

  return cookies;
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

module.exports.cookies = async (event, ctx, callback) => {
  const {
    tag = "crypto exchange",
    count = 4,
    proxyHost,
    proxyUser,
    proxyPass,
    country,
    include = [],
    exclude = ["facebook", ".ru", "vk.com", "mailto"],
  } = event;

  let options = {headless:true}
  let proxyOptions = {}

  if(country){
    const proxy = await getProxy(country);
    proxyOptions.username = proxy.user
    proxyOptions.password = proxy.pass
    proxyOptions.proxy = `${proxy.type}://${proxy.host}:${proxy.port}`
  }
  else{
    if (proxyHost) {
      proxyOptions.proxy = proxyHost;
    }
    if (proxyUser) {
      proxyOptions.username = proxyUser;
      proxyOptions.password = proxyPass;
    }
  }

  const { page, browser, userAgent } = await getPuppet({...options, ...proxyOptions}).catch(
    console.log
  );

  const tags = tag.split(',')
  let allLinks = []

  for(const _tag of tags){
    let results = await DDG.search(_tag, {
      safeSearch: DDG.SafeSearchType.STRICT,
      locale: country ? `${country}-${country}` : 'en-us',
    });
  
    let links = shuffle(results.results)
      .slice(0, count / tags.length)
      .map((r) => r.url);
    
    allLinks = allLinks.concat(links)
  }

  if(include && include.length){
    allLinks = [...allLinks, ...include]
  }

  console.log({ allLinks });

  // const cookies = await visit(page, 'https://ipinfo.io');
  const cookies = await createCookies(page, allLinks, exclude);
  console.log({ cookies });

  await browser.close();

  callback(null,{userAgent, data:Buffer.from(cookies).toString('base64')})
};

module.exports.screenshot = async (event) => {
  const { page, browser } = await getPuppet({
    proxy: "http://45.93.69.179:8000",
    username: "a9c1q3",
    password: "QSS07J",
  });

  const cookies = await visit(page, "https://ipinfo.io");
  // const cookies = await visit(page, "https://btse.com");

  const pdfBuffer = await page.pdf();

  return {
    statusCode: 200,
    headers: { "Content-type": "application/pdf" },
    body: pdfBuffer.toString("base64"),
    isBase64Encoded: true,
  };
};
