"""
amazon scraper - open source implementation
scrape amazon product data using Playwright.
extracts: availability, avg_rating, category, description, out_of_stock, price, review_count, ships_from, sold_by, title, features, images
requirements:
    pip install playwright
    playwright install chromium
"""

import json
import re
import sys
from typing import Optional

from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

# configuration
TARGET_URL = (
    "https://www.amazon.com/Logitech-Master-Bluetooth-Wireless-Receiver/dp/B0FB21526X"
)

# realistic browser user agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# css selectors for data extraction (update these based on current amazon html structure)
SELECTORS = {
    "title": "#productTitle",
    "price": "span.a-price span.a-offscreen",
    "avg_rating": "span.a-icon-alt",
    "review_count": "#acrCustomerReviewText",
    "availability": "#availability span",
    "description": "#productDescription p",
    "features": "#feature-bullets ul li span.a-list-item",
    "images": "#imgTagWrapperId img",
    "category": "#wayfinding-breadcrumbs_feature_div ul li a",
    "ships_from": "#tabular-buybox-truncate-0 span.tabular-buybox-text",
    "sold_by": "#tabular-buybox-truncate-1 span.tabular-buybox-text",
}


def extract_title(page: Page) -> Optional[str]:
    """extract the product title"""
    try:
        element = page.query_selector(SELECTORS["title"])
        if element:
            return element.inner_text().strip()
    except Exception:
        pass
    return None


def extract_price(page: Page) -> Optional[str]:
    """extract the product price"""
    try:
        element = page.query_selector(SELECTORS["price"])
        if element:
            return element.inner_text().strip()
    except Exception:
        pass
    return None


def extract_avg_rating(page: Page) -> Optional[str]:
    """extract the average rating"""
    try:
        element = page.query_selector(SELECTORS["avg_rating"])
        if element:
            # extract rating value from text like "4.5 out of 5 stars"
            rating_text = element.inner_text().strip()
            match = re.search(r"(\d+\.?\d*)\s*out of", rating_text)
            if match:
                return match.group(1)
    except Exception:
        pass
    return None


def extract_review_count(page: Page) -> Optional[str]:
    """extract the number of reviews"""
    try:
        element = page.query_selector(SELECTORS["review_count"])
        if element:
            # extract number from text like "1,234 ratings"
            review_text = element.inner_text().strip()
            match = re.search(r"([\d,]+)", review_text)
            if match:
                return match.group(1).replace(",", "")
    except Exception:
        pass
    return None


def extract_availability(page: Page) -> Optional[str]:
    """extract product availability status"""
    try:
        element = page.query_selector(SELECTORS["availability"])
        if element:
            return element.inner_text().strip()
    except Exception:
        pass
    return None


def extract_out_of_stock(page: Page) -> bool:
    """determine if the product is out of stock"""
    availability = extract_availability(page)
    if availability:
        # check for common out of stock indicators
        out_of_stock_keywords = ["out of stock", "unavailable", "currently unavailable"]
        return any(keyword in availability.lower() for keyword in out_of_stock_keywords)
    return False


def extract_description(page: Page) -> Optional[str]:
    """extract the product description"""
    try:
        element = page.query_selector(SELECTORS["description"])
        if element:
            return element.inner_text().strip()
    except Exception:
        pass
    return None


def extract_features(page: Page) -> list[str]:
    """extract the product feature bullet points"""
    features = []
    try:
        elements = page.query_selector_all(SELECTORS["features"])
        for element in elements:
            text = element.inner_text().strip()
            # filter out empty strings and very short text
            if text and len(text) > 5:
                features.append(text)
    except Exception:
        pass
    return features


def extract_images(page: Page) -> list[str]:
    """extract product image urls"""
    images = []
    try:
        # try main product image first
        main_img = page.query_selector(SELECTORS["images"])
        if main_img:
            # get the high-res image url from data attributes or src
            img_url = main_img.get_attribute(
                "data-old-hires"
            ) or main_img.get_attribute("src")
            if img_url and img_url.startswith("http"):
                images.append(img_url)

        # try to find additional images in the thumbnail strip
        thumbnail_elements = page.query_selector_all("#altImages img.a-dynamic-image")
        for thumb in thumbnail_elements:
            img_url = thumb.get_attribute("src")
            if img_url and img_url.startswith("http"):
                # convert thumbnail url to larger image url
                large_url = re.sub(r"\._[A-Z]+\d+_\.", "._AC_SL1500_.", img_url)
                if large_url not in images:
                    images.append(large_url)
    except Exception:
        pass
    return images


def extract_category(page: Page) -> Optional[str]:
    """extract the product category breadcrumb"""
    try:
        elements = page.query_selector_all(SELECTORS["category"])
        if elements:
            # build category path from breadcrumbs
            categories = [el.inner_text().strip() for el in elements]
            return " > ".join(categories)
    except Exception:
        pass
    return None


def extract_ships_from(page: Page) -> Optional[str]:
    """extract the ships from information"""
    try:
        element = page.query_selector(SELECTORS["ships_from"])
        if element:
            return element.inner_text().strip()
    except Exception:
        pass
    return None


def extract_sold_by(page: Page) -> Optional[str]:
    """extract the sold by information"""
    try:
        element = page.query_selector(SELECTORS["sold_by"])
        if element:
            return element.inner_text().strip()
    except Exception:
        pass
    return None


def scrape_amazon_product(url: str) -> Optional[dict]:
    """main function to scrape all product data from an amazon url"""
    try:
        # launch playwright with chromium browser
        with sync_playwright() as p:
            # launch browser in headless mode with realistic settings
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                ],
            )

            # create browser context with realistic viewport and user agent
            context = browser.new_context(
                user_agent=USER_AGENT,
                viewport={"width": 1920, "height": 1080},
                locale="en-US",
            )

            # create new page
            page = context.new_page()

            # navigate to the product page
            print(f"navigating to: {url}")
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            # wait for main content to load
            page.wait_for_selector("#productTitle", timeout=30000)

            # small delay to allow dynamic content to render
            page.wait_for_timeout(2000)

            # extract all data points
            product_data = {
                "title": extract_title(page),
                "price": extract_price(page),
                "avg_rating": extract_avg_rating(page),
                "review_count": extract_review_count(page),
                "availability": extract_availability(page),
                "out_of_stock": extract_out_of_stock(page),
                "description": extract_description(page),
                "features": extract_features(page),
                "images": extract_images(page),
                "category": extract_category(page),
                "ships_from": extract_ships_from(page),
                "sold_by": extract_sold_by(page),
                "url": url,
            }

            # cleanup
            browser.close()

            return product_data

    except PlaywrightTimeout:
        print("error: page load timed out", file=sys.stderr)
        return None
    except Exception as e:
        print(f"error: failed to scrape page - {e}", file=sys.stderr)
        return None


def main():
    """main execution entry point"""
    print(f"scraping: {TARGET_URL}\n")

    # scrape the product data
    product_data = scrape_amazon_product(TARGET_URL)

    if product_data:
        # output as formatted json
        print(json.dumps(product_data, indent=2, ensure_ascii=False))
    else:
        print("failed to scrape product data", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
