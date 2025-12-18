/**
 * amazon scraper - open source implementation
 *
 * scrape amazon product data using Axios and Cheerio.
 * extracts: availability, avg_rating, category, description, out_of_stock, price, review_count, ships_from, sold_by, title, features, images
 *
 * dependencies:
 *     npm install axios cheerio
 */

const axios = require("axios");
const cheerio = require("cheerio");

// configuration
const TARGET_URL =
  "https://www.amazon.com/Logitech-Master-Bluetooth-Wireless-Receiver/dp/B0FB21526X";

// realistic browser headers to mimic a real user request
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

// css selectors for data extraction (update these based on current amazon html structure)
const SELECTORS = {
  title: "#productTitle",
  price: "span.a-price span.a-offscreen",
  avgRating: "span.a-icon-alt",
  reviewCount: "#acrCustomerReviewText",
  availability: "#availability span",
  description: "#productDescription p",
  features: "#feature-bullets ul li span.a-list-item",
  images: "#imgTagWrapperId img",
  category: "#wayfinding-breadcrumbs_feature_div ul li a",
  shipsFrom: "#tabular-buybox-truncate-0 span.tabular-buybox-text",
  soldBy: "#tabular-buybox-truncate-1 span.tabular-buybox-text",
};

/**
 * fetch the page content and return a cheerio instance
 * @param {string} url - the url to fetch
 * @returns {Promise<cheerio.CheerioAPI|null>} cheerio instance or null on error
 */
async function fetchPage(url) {
  try {
    // send get request with browser-like headers
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 30000,
    });

    // parse html content with cheerio
    const $ = cheerio.load(response.data);
    return $;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.error("error: request timed out");
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      console.error("error: failed to connect to the server");
    } else if (error.response) {
      console.error(`error: http error occurred - ${error.response.status}`);
    } else {
      console.error(`error: request failed - ${error.message}`);
    }
    return null;
  }
}

/**
 * extract the product title
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractTitle($) {
  const element = $(SELECTORS.title);
  if (element.length) {
    return element.text().trim();
  }
  return null;
}

/**
 * extract the product price
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractPrice($) {
  const element = $(SELECTORS.price).first();
  if (element.length) {
    return element.text().trim();
  }
  return null;
}

/**
 * extract the average rating
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractAvgRating($) {
  const element = $(SELECTORS.avgRating).first();
  if (element.length) {
    // extract rating value from text like "4.5 out of 5 stars"
    const ratingText = element.text().trim();
    const match = ratingText.match(/(\d+\.?\d*)\s*out of/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * extract the number of reviews
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractReviewCount($) {
  const element = $(SELECTORS.reviewCount);
  if (element.length) {
    // extract number from text like "1,234 ratings"
    const reviewText = element.text().trim();
    const match = reviewText.match(/([\d,]+)/);
    if (match) {
      return match[1].replace(/,/g, "");
    }
  }
  return null;
}

/**
 * extract product availability status
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractAvailability($) {
  const element = $(SELECTORS.availability).first();
  if (element.length) {
    return element.text().trim();
  }
  return null;
}

/**
 * determine if the product is out of stock
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {boolean}
 */
function extractOutOfStock($) {
  const availability = extractAvailability($);
  if (availability) {
    // check for common out of stock indicators
    const outOfStockKeywords = [
      "out of stock",
      "unavailable",
      "currently unavailable",
    ];
    return outOfStockKeywords.some((keyword) =>
      availability.toLowerCase().includes(keyword)
    );
  }
  return false;
}

/**
 * extract the product description
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractDescription($) {
  const element = $(SELECTORS.description);
  if (element.length) {
    return element.text().trim();
  }
  return null;
}

/**
 * extract the product feature bullet points
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string[]}
 */
function extractFeatures($) {
  const features = [];
  $(SELECTORS.features).each((_, element) => {
    const text = $(element).text().trim();
    // filter out empty strings and very short text
    if (text && text.length > 5) {
      features.push(text);
    }
  });
  return features;
}

/**
 * extract product image urls
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string[]}
 */
function extractImages($) {
  const images = [];

  // try main product image first
  const mainImg = $(SELECTORS.images).first();
  if (mainImg.length) {
    // get the high-res image url from data attributes or src
    const imgUrl = mainImg.attr("data-old-hires") || mainImg.attr("src");
    if (imgUrl && imgUrl.startsWith("http")) {
      images.push(imgUrl);
    }
  }

  // try to find additional images in the thumbnail strip
  $("#altImages img.a-dynamic-image").each((_, element) => {
    const imgUrl = $(element).attr("src");
    if (imgUrl && imgUrl.startsWith("http")) {
      // convert thumbnail url to larger image url
      const largeUrl = imgUrl.replace(/\._[A-Z]+\d+_\./, "._AC_SL1500_.");
      if (!images.includes(largeUrl)) {
        images.push(largeUrl);
      }
    }
  });

  return images;
}

/**
 * extract the product category breadcrumb
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractCategory($) {
  const elements = $(SELECTORS.category);
  if (elements.length) {
    // build category path from breadcrumbs
    const categories = [];
    elements.each((_, element) => {
      categories.push($(element).text().trim());
    });
    return categories.join(" > ");
  }
  return null;
}

/**
 * extract the ships from information
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractShipsFrom($) {
  const element = $(SELECTORS.shipsFrom);
  if (element.length) {
    return element.text().trim();
  }
  return null;
}

/**
 * extract the sold by information
 * @param {cheerio.CheerioAPI} $ - cheerio instance
 * @returns {string|null}
 */
function extractSoldBy($) {
  const element = $(SELECTORS.soldBy);
  if (element.length) {
    return element.text().trim();
  }
  return null;
}

/**
 * main function to scrape all product data from an amazon url
 * @param {string} url - the amazon product url
 * @returns {Promise<object|null>} product data object or null on error
 */
async function scrapeAmazonProduct(url) {
  // fetch the page content
  const $ = await fetchPage(url);
  if (!$) {
    return null;
  }

  // extract all data points
  const productData = {
    title: extractTitle($),
    price: extractPrice($),
    avg_rating: extractAvgRating($),
    review_count: extractReviewCount($),
    availability: extractAvailability($),
    out_of_stock: extractOutOfStock($),
    description: extractDescription($),
    features: extractFeatures($),
    images: extractImages($),
    category: extractCategory($),
    ships_from: extractShipsFrom($),
    sold_by: extractSoldBy($),
    url: url,
  };

  return productData;
}

/**
 * main execution entry point
 */
async function main() {
  console.log(`scraping: ${TARGET_URL}\n`);

  // scrape the product data
  const productData = await scrapeAmazonProduct(TARGET_URL);

  if (productData) {
    // output as formatted json
    console.log(JSON.stringify(productData, null, 2));
  } else {
    console.error("failed to scrape product data");
    process.exit(1);
  }
}

// execute the main function
main();
