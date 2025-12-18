"""
amazon scraper - open source implementation
scrape amazon product data using Requests and BeautifulSoup.
extracts: availability, avg_rating, category, description, out_of_stock, price, review_count, ships_from, sold_by, title, features, images
requirements:
    pip install requests beautifulsoup4 lxml
"""

import json
import re
import sys
from typing import Optional

import requests
from bs4 import BeautifulSoup

# configuration
TARGET_URL = (
    "https://www.amazon.com/Logitech-Master-Bluetooth-Wireless-Receiver/dp/B0FB21526X"
)

# realistic browser headers to mimic a real user request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

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


def fetch_page(url: str) -> Optional[BeautifulSoup]:
    """fetch the page content and return a beautifulsoup object"""
    try:
        # send get request with browser-like headers
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()

        # parse html content with lxml parser for better performance
        soup = BeautifulSoup(response.content, "lxml")
        return soup

    except requests.exceptions.Timeout:
        print("error: request timed out", file=sys.stderr)
        return None
    except requests.exceptions.ConnectionError:
        print("error: failed to connect to the server", file=sys.stderr)
        return None
    except requests.exceptions.HTTPError as e:
        print(f"error: http error occurred - {e}", file=sys.stderr)
        return None
    except requests.exceptions.RequestException as e:
        print(f"error: request failed - {e}", file=sys.stderr)
        return None


def extract_title(soup: BeautifulSoup) -> Optional[str]:
    """extract the product title"""
    element = soup.select_one(SELECTORS["title"])
    if element:
        return element.get_text(strip=True)
    return None


def extract_price(soup: BeautifulSoup) -> Optional[str]:
    """extract the product price"""
    element = soup.select_one(SELECTORS["price"])
    if element:
        return element.get_text(strip=True)
    return None


def extract_avg_rating(soup: BeautifulSoup) -> Optional[str]:
    """extract the average rating"""
    element = soup.select_one(SELECTORS["avg_rating"])
    if element:
        # extract rating value from text like "4.5 out of 5 stars"
        rating_text = element.get_text(strip=True)
        match = re.search(r"(\d+\.?\d*)\s*out of", rating_text)
        if match:
            return match.group(1)
    return None


def extract_review_count(soup: BeautifulSoup) -> Optional[str]:
    """extract the number of reviews"""
    element = soup.select_one(SELECTORS["review_count"])
    if element:
        # extract number from text like "1,234 ratings"
        review_text = element.get_text(strip=True)
        match = re.search(r"([\d,]+)", review_text)
        if match:
            return match.group(1).replace(",", "")
    return None


def extract_availability(soup: BeautifulSoup) -> Optional[str]:
    """extract product availability status"""
    element = soup.select_one(SELECTORS["availability"])
    if element:
        return element.get_text(strip=True)
    return None


def extract_out_of_stock(soup: BeautifulSoup) -> bool:
    """determine if the product is out of stock"""
    availability = extract_availability(soup)
    if availability:
        # check for common out of stock indicators
        out_of_stock_keywords = ["out of stock", "unavailable", "currently unavailable"]
        return any(keyword in availability.lower() for keyword in out_of_stock_keywords)
    return False


def extract_description(soup: BeautifulSoup) -> Optional[str]:
    """extract the product description"""
    element = soup.select_one(SELECTORS["description"])
    if element:
        return element.get_text(strip=True)
    return None


def extract_features(soup: BeautifulSoup) -> list[str]:
    """extract the product feature bullet points"""
    elements = soup.select(SELECTORS["features"])
    features = []
    for element in elements:
        text = element.get_text(strip=True)
        # filter out empty strings and very short text
        if text and len(text) > 5:
            features.append(text)
    return features


def extract_images(soup: BeautifulSoup) -> list[str]:
    """extract product image urls"""
    images = []
    # try main product image first
    main_img = soup.select_one(SELECTORS["images"])
    if main_img:
        # get the high-res image url from data attributes or src
        img_url = main_img.get("data-old-hires") or main_img.get("src")
        if img_url and img_url.startswith("http"):
            images.append(img_url)

    # try to find additional images in the thumbnail strip
    thumbnail_elements = soup.select("#altImages img.a-dynamic-image")
    for thumb in thumbnail_elements:
        img_url = thumb.get("src")
        if img_url and img_url.startswith("http"):
            # convert thumbnail url to larger image url
            large_url = re.sub(r"\._[A-Z]+\d+_\.", "._AC_SL1500_.", img_url)
            if large_url not in images:
                images.append(large_url)

    return images


def extract_category(soup: BeautifulSoup) -> Optional[str]:
    """extract the product category breadcrumb"""
    elements = soup.select(SELECTORS["category"])
    if elements:
        # build category path from breadcrumbs
        categories = [el.get_text(strip=True) for el in elements]
        return " > ".join(categories)
    return None


def extract_ships_from(soup: BeautifulSoup) -> Optional[str]:
    """extract the ships from information"""
    element = soup.select_one(SELECTORS["ships_from"])
    if element:
        return element.get_text(strip=True)
    return None


def extract_sold_by(soup: BeautifulSoup) -> Optional[str]:
    """extract the sold by information"""
    element = soup.select_one(SELECTORS["sold_by"])
    if element:
        return element.get_text(strip=True)
    return None


def scrape_amazon_product(url: str) -> Optional[dict]:
    """main function to scrape all product data from an amazon url"""
    # fetch the page content
    soup = fetch_page(url)
    if not soup:
        return None

    # extract all data points
    product_data = {
        "title": extract_title(soup),
        "price": extract_price(soup),
        "avg_rating": extract_avg_rating(soup),
        "review_count": extract_review_count(soup),
        "availability": extract_availability(soup),
        "out_of_stock": extract_out_of_stock(soup),
        "description": extract_description(soup),
        "features": extract_features(soup),
        "images": extract_images(soup),
        "category": extract_category(soup),
        "ships_from": extract_ships_from(soup),
        "sold_by": extract_sold_by(soup),
        "url": url,
    }

    return product_data


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
