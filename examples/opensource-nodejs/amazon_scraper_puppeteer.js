/**
 * amazon scraper - open source implementation
 *
 * scrape amazon product data using Puppeteer.
 * extracts: availability, avg_rating, category, description, out_of_stock, price, review_count, ships_from, sold_by, title, features, images
 *
 * dependencies:
 *     npm install puppeteer
 */

const puppeteer = require("puppeteer");

// configuration
const TARGET_URL =
  "https://www.amazon.com/Logitech-Master-Bluetooth-Wireless-Receiver/dp/B0FB21526X";

// realistic browser user agent
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
 * extract the product title
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractTitle(page) {
  try {
    const element = await page.$(SELECTORS.title);
    if (element) {
      const text = await page.evaluate((el) => el.textContent, element);
      return text?.trim() || null;
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract the product price
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractPrice(page) {
  try {
    const element = await page.$(SELECTORS.price);
    if (element) {
      const text = await page.evaluate((el) => el.textContent, element);
      return text?.trim() || null;
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract the average rating
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractAvgRating(page) {
  try {
    const element = await page.$(SELECTORS.avgRating);
    if (element) {
      // extract rating value from text like "4.5 out of 5 stars"
      const ratingText = await page.evaluate((el) => el.textContent, element);
      const match = ratingText?.match(/(\d+\.?\d*)\s*out of/);
      if (match) {
        return match[1];
      }
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract the number of reviews
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractReviewCount(page) {
  try {
    const element = await page.$(SELECTORS.reviewCount);
    if (element) {
      // extract number from text like "1,234 ratings"
      const reviewText = await page.evaluate((el) => el.textContent, element);
      const match = reviewText?.match(/([\d,]+)/);
      if (match) {
        return match[1].replace(/,/g, "");
      }
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract product availability status
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractAvailability(page) {
  try {
    const element = await page.$(SELECTORS.availability);
    if (element) {
      const text = await page.evaluate((el) => el.textContent, element);
      return text?.trim() || null;
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * determine if the product is out of stock
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<boolean>}
 */
async function extractOutOfStock(page) {
  const availability = await extractAvailability(page);
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
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractDescription(page) {
  try {
    const element = await page.$(SELECTORS.description);
    if (element) {
      const text = await page.evaluate((el) => el.textContent, element);
      return text?.trim() || null;
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract the product feature bullet points
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string[]>}
 */
async function extractFeatures(page) {
  try {
    const elements = await page.$$(SELECTORS.features);
    const features = [];

    for (const element of elements) {
      const text = await page.evaluate((el) => el.textContent, element);
      const trimmed = text?.trim();
      // filter out empty strings and very short text
      if (trimmed && trimmed.length > 5) {
        features.push(trimmed);
      }
    }

    return features;
  } catch (error) {
    // silently handle extraction errors
  }
  return [];
}

/**
 * extract product image urls
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string[]>}
 */
async function extractImages(page) {
  const images = [];

  try {
    // try main product image first
    const mainImg = await page.$(SELECTORS.images);
    if (mainImg) {
      // get the high-res image url from data attributes or src
      const imgUrl = await page.evaluate((el) => {
        return el.getAttribute("data-old-hires") || el.getAttribute("src");
      }, mainImg);

      if (imgUrl && imgUrl.startsWith("http")) {
        images.push(imgUrl);
      }
    }

    // try to find additional images in the thumbnail strip
    const thumbnails = await page.$$("#altImages img.a-dynamic-image");
    for (const thumb of thumbnails) {
      const imgUrl = await page.evaluate((el) => el.getAttribute("src"), thumb);

      if (imgUrl && imgUrl.startsWith("http")) {
        // convert thumbnail url to larger image url
        const largeUrl = imgUrl.replace(/\._[A-Z]+\d+_\./, "._AC_SL1500_.");
        if (!images.includes(largeUrl)) {
          images.push(largeUrl);
        }
      }
    }
  } catch (error) {
    // silently handle extraction errors
  }

  return images;
}

/**
 * extract the product category breadcrumb
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractCategory(page) {
  try {
    const elements = await page.$$(SELECTORS.category);
    if (elements.length) {
      // build category path from breadcrumbs
      const categories = [];
      for (const element of elements) {
        const text = await page.evaluate((el) => el.textContent, element);
        if (text?.trim()) {
          categories.push(text.trim());
        }
      }
      return categories.join(" > ");
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract the ships from information
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractShipsFrom(page) {
  try {
    const element = await page.$(SELECTORS.shipsFrom);
    if (element) {
      const text = await page.evaluate((el) => el.textContent, element);
      return text?.trim() || null;
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * extract the sold by information
 * @param {puppeteer.Page} page - puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function extractSoldBy(page) {
  try {
    const element = await page.$(SELECTORS.soldBy);
    if (element) {
      const text = await page.evaluate((el) => el.textContent, element);
      return text?.trim() || null;
    }
  } catch (error) {
    // silently handle extraction errors
  }
  return null;
}

/**
 * main function to scrape all product data from an amazon url
 * @param {string} url - the amazon product url
 * @returns {Promise<object|null>} product data object or null on error
 */
async function scrapeAmazonProduct(url) {
  let browser = null;

  try {
    // launch puppeteer with chromium browser
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    // create new page with realistic viewport and user agent
    const page = await browser.newPage();

    // set user agent to avoid detection
    await page.setUserAgent(USER_AGENT);

    // set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // set extra headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // navigate to the product page
    console.log(`navigating to: ${url}`);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // wait for main content to load
    await page.waitForSelector("#productTitle", { timeout: 30000 });

    // small delay to allow dynamic content to render
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // extract all data points
    const productData = {
      title: await extractTitle(page),
      price: await extractPrice(page),
      avg_rating: await extractAvgRating(page),
      review_count: await extractReviewCount(page),
      availability: await extractAvailability(page),
      out_of_stock: await extractOutOfStock(page),
      description: await extractDescription(page),
      features: await extractFeatures(page),
      images: await extractImages(page),
      category: await extractCategory(page),
      ships_from: await extractShipsFrom(page),
      sold_by: await extractSoldBy(page),
      url: url,
    };

    return productData;
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.error("error: page load timed out");
    } else {
      console.error(`error: failed to scrape page - ${error.message}`);
    }
    return null;
  } finally {
    // always close the browser
    if (browser) {
      await browser.close();
    }
  }
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
