"""
Bangladesh Medicine Scraper
Scrapes medicine data from medex.com.bd and saves to CSV
Uses undetected-chromedriver to bypass captcha/bot detection

Usage:
    python scraper.py                    # Scrape all pages
    python scraper.py 1 10               # Scrape pages 1 to 10
    python scraper.py 11 20              # Scrape pages 11 to 20
"""

import csv
import sys
import time
import re
import logging
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
BASE_URL = "https://medex.com.bd/brands"


def setup_driver():
    """Setup undetected Chrome WebDriver"""
    options = uc.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    return driver


def get_total_pages(driver) -> int:
    """Get total number of pages"""
    try:
        pagination = driver.find_element(By.CSS_SELECTOR, "ul.pagination")
        page_links = pagination.find_elements(By.CSS_SELECTOR, "a.page-link")
        
        page_numbers = []
        for link in page_links:
            text = link.text.strip()
            if text.isdigit():
                page_numbers.append(int(text))
        
        if page_numbers:
            return max(page_numbers)
        
        return 1
    except NoSuchElementException:
        logger.warning("Pagination not found")
        return 1


def wait_for_page_load(driver, timeout=15):
    """Wait for page content to load"""
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.data-row"))
        )
        return True
    except TimeoutException:
        return False


def get_medicine_links(driver) -> list:
    """Get all medicine detail page links from current listing page"""
    links = []
    try:
        medicine_blocks = driver.find_elements(By.CSS_SELECTOR, "a.hoverable-block")
        for block in medicine_blocks:
            href = block.get_attribute('href')
            if href and '/brand/' in href:
                links.append(href)
    except Exception as e:
        logger.error(f"Error getting links: {e}")
    return links


def scrape_medicine_detail(driver, url: str) -> dict:
    """Scrape medicine details from individual medicine page"""
    data = {
        'medicine_name': '',
        'generic_name': '',
        'manufacturer': '',
        'strength': '',
        'type': '',
        'mrp': ''
    }
    
    try:
        driver.get(url)
        time.sleep(2)  # Increased wait time for dynamic content
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1, .brand-name, .drug-name"))
        )
        
        # Additional wait for price to load (often loaded via AJAX)
        time.sleep(2)
        
        # Medicine name - from page title or h1
        try:
            # Try multiple selectors for medicine name
            name_elem = None
            for selector in ["h1.page-heading-1", "h1", ".brand-name", ".drug-name"]:
                try:
                    name_elem = driver.find_element(By.CSS_SELECTOR, selector)
                    if name_elem:
                        break
                except:
                    continue
            
            if name_elem:
                data['medicine_name'] = name_elem.text.strip()
        except:
            pass
        
        # Generic name
        try:
            generic_elem = driver.find_element(By.CSS_SELECTOR, "a[href*='/generic/']")
            data['generic_name'] = generic_elem.text.strip()
        except:
            pass
        
        # Manufacturer
        try:
            mfr_elem = driver.find_element(By.CSS_SELECTOR, "a[href*='/companies/']")
            data['manufacturer'] = mfr_elem.text.strip()
        except:
            pass
        
        # Strength - look for it in various places
        try:
            # Try to find strength in the page
            strength_patterns = [
                "span.strength",
                "div.strength", 
                ".drug-strength"
            ]
            for pattern in strength_patterns:
                try:
                    elem = driver.find_element(By.CSS_SELECTOR, pattern)
                    if elem:
                        data['strength'] = elem.text.strip()
                        break
                except:
                    continue
            
            # If not found, try to extract from medicine name
            if not data['strength'] and data['medicine_name']:
                match = re.search(r'(\d+\.?\d*\s*(mg|ml|mcg|g|iu|%|gm|IU)[^a-zA-Z]*)', data['medicine_name'], re.I)
                if match:
                    data['strength'] = match.group(1).strip()
        except:
            pass
        
        # Type / Dosage form
        try:
            type_elem = driver.find_element(By.CSS_SELECTOR, "a[href*='/dosage-forms/']")
            data['type'] = type_elem.text.strip()
        except:
            # Try to get from img
            try:
                img_elem = driver.find_element(By.CSS_SELECTOR, "img.dosage-icon")
                data['type'] = img_elem.get_attribute('title') or img_elem.get_attribute('alt') or ''
            except:
                pass
        
        # MRP / Price - look for price on the page
        try:
            # Try finding price elements first (more reliable)
            price_selectors = [
                ".price", ".unit-price", ".mrp", "span.price",
                "[class*='price']", "[class*='unit-price']"
            ]
            for sel in price_selectors:
                try:
                    price_elem = driver.find_element(By.CSS_SELECTOR, sel)
                    price_text = price_elem.text.strip()
                    price_match = re.search(r'([\d,]+\.?\d+)', price_text)
                    if price_match:
                        data['mrp'] = price_match.group(1).replace(',', '')
                        break
                except:
                    continue
            
            # If not found via elements, try page source regex
            if not data['mrp']:
                page_text = driver.page_source
                
                # Pattern 1: ৳ symbol followed by number (allow HTML entities and whitespace)
                price_match = re.search(r'৳[\s\u00a0]*(\d[\d,]*\.?\d*)', page_text)
                if price_match:
                    data['mrp'] = price_match.group(1).replace(',', '')
                else:
                    # Pattern 2: "Unit Price" or "MRP" followed by number
                    price_match = re.search(r'(?:Unit\s*Price|MRP|Price)[:\s]*[\u09F3৳]?\s*([\d,]+\.?\d*)', page_text, re.I)
                    if price_match:
                        data['mrp'] = price_match.group(1).replace(',', '')
                    else:
                        # Pattern 3: Look for "৳" HTML entity (&#2547; or &#x09F3;)
                        price_match = re.search(r'(?:&#2547;|&#x09F3;|৳)\s*([\d,]+\.?\d+)', page_text)
                        if price_match:
                            data['mrp'] = price_match.group(1).replace(',', '')
                        
        except Exception as e:
            logger.debug(f"Error getting price: {e}")
        
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
    
    return data


def scrape_listing_page(driver) -> list:
    """Scrape basic info from listing page (faster, no MRP)"""
    medicines = []
    
    try:
        medicine_blocks = driver.find_elements(By.CSS_SELECTOR, "a.hoverable-block")
        
        for block in medicine_blocks:
            try:
                data = {
                    'medicine_name': '',
                    'generic_name': '',
                    'manufacturer': '',
                    'strength': '',
                    'type': '',
                    'mrp': ''
                }
                
                try:
                    name_div = block.find_element(By.CSS_SELECTOR, "div.data-row-top")
                    data['medicine_name'] = name_div.text.strip()
                except:
                    pass
                
                try:
                    strength_elem = block.find_element(By.CSS_SELECTOR, "div.data-row-strength span.grey-ligten")
                    data['strength'] = strength_elem.text.strip()
                except:
                    pass
                
                try:
                    img_elem = block.find_element(By.CSS_SELECTOR, "img.dosage-icon")
                    data['type'] = img_elem.get_attribute('title') or ''
                except:
                    pass
                
                col_divs = block.find_elements(By.CSS_SELECTOR, "div.col-xs-12")
                if len(col_divs) >= 3:
                    data['generic_name'] = col_divs[2].text.strip()
                if len(col_divs) >= 4:
                    try:
                        mfr_elem = col_divs[3].find_element(By.CSS_SELECTOR, "span.data-row-company")
                        data['manufacturer'] = mfr_elem.text.strip()
                    except:
                        data['manufacturer'] = col_divs[3].text.strip()
                
                # Get link for detail page
                data['_link'] = block.get_attribute('href')
                
                if data['medicine_name']:
                    medicines.append(data)
                    
            except Exception as e:
                continue
                    
    except Exception as e:
        logger.error(f"Error scraping listing: {e}")
    
    return medicines


def save_to_csv(medicines: list, filename: str):
    """Save medicines to CSV"""
    if not medicines:
        logger.warning("No medicines to save")
        return False
    
    fieldnames = ['medicine_name', 'generic_name', 'manufacturer', 'strength', 'type', 'mrp']
    
    # Remove internal link field
    for med in medicines:
        if '_link' in med:
            del med['_link']
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(medicines)
    
    logger.info(f"Saved {len(medicines)} medicines to {filename}")
    return True


def main():
    """Main scraper function"""
    start_page = 1
    end_page = None
    
    if len(sys.argv) >= 3:
        start_page = int(sys.argv[1])
        end_page = int(sys.argv[2])
    elif len(sys.argv) == 2:
        end_page = int(sys.argv[1])
    
    print("=" * 60)
    print("Bangladesh Medicine Scraper (with MRP)")
    print("Source: medex.com.bd")
    print("=" * 60)
    
    if end_page:
        print(f"\nScraping pages {start_page} to {end_page}")
    else:
        print(f"\nScraping all pages starting from {start_page}")
    
    print("Note: Fetching MRP requires visiting each medicine page.")
    print("      This is slower (~30 medicines/minute)")
    print("\nUsing undetected-chromedriver to bypass captcha...\n")
    
    driver = None
    all_medicines = []
    
    try:
        print("Starting browser...")
        driver = setup_driver()
        
        print(f"Loading {BASE_URL}...")
        driver.get(BASE_URL)
        
        print("Waiting for page to load...")
        time.sleep(6)
        
        if not wait_for_page_load(driver, timeout=30):
            print("⚠ Timeout waiting for content.")
            return
        
        print("✓ Page loaded successfully!")
        
        total_pages = get_total_pages(driver)
        
        if end_page is None:
            end_page = total_pages
        else:
            end_page = min(end_page, total_pages)
        
        print(f"\nTotal pages available: {total_pages}")
        print(f"Scraping pages: {start_page} to {end_page}")
        
        medicines_per_page = 30
        total_medicines = (end_page - start_page + 1) * medicines_per_page
        est_time = total_medicines * 2  # ~2 seconds per medicine
        print(f"Estimated medicines: ~{total_medicines}")
        print(f"Estimated time: ~{est_time // 60} minutes")
        print()
        
        # Scrape each page
        for page in range(start_page, end_page + 1):
            url = f"{BASE_URL}?page={page}"
            
            print(f"\n--- Page {page}/{end_page} ---")
            driver.get(url)
            time.sleep(2)
            wait_for_page_load(driver, timeout=10)
            
            # Get basic info and links from listing
            page_medicines = scrape_listing_page(driver)
            print(f"Found {len(page_medicines)} medicines on this page")
            
            # Visit each medicine page to get MRP
            for i, med in enumerate(page_medicines):
                link = med.get('_link', '')
                if link:
                    print(f"  [{i+1}/{len(page_medicines)}] {med['medicine_name'][:30]}...", end=' ')
                    
                    # Get MRP from detail page
                    detail = scrape_medicine_detail(driver, link)
                    
                    # Update MRP
                    med['mrp'] = detail.get('mrp', '')
                    
                    # Also update any missing fields
                    for key in ['generic_name', 'manufacturer', 'strength', 'type']:
                        if not med.get(key) and detail.get(key):
                            med[key] = detail[key]
                    
                    print(f"MRP: {med['mrp'] or 'N/A'}")
                    
                    time.sleep(1)
            
            all_medicines.extend(page_medicines)
            print(f"Total scraped: {len(all_medicines)} medicines")
            
            # Save periodically
            if page % 5 == 0:
                temp_filename = f'bd_medicines_page_{start_page}_to_{end_page}_temp.csv'
                save_to_csv(all_medicines.copy(), temp_filename)
                print(f"  (Saved progress to {temp_filename})")
        
        print(f"\n{'='*60}")
        print(f"Scraping complete!")
        print(f"{'='*60}")
        
        if all_medicines:
            filename = f'bd_medicines_page_{start_page}_to_{end_page}.csv'
            save_to_csv(all_medicines, filename)
            print(f"\n✓ Successfully scraped {len(all_medicines)} medicines")
            print(f"✓ Data saved to: {filename}")
        else:
            print("\n✗ No medicines were scraped.")
            
    except KeyboardInterrupt:
        print("\n\n⚠ Scraping interrupted by user!")
        if all_medicines:
            filename = f'bd_medicines_partial_{start_page}_to_{end_page}.csv'
            save_to_csv(all_medicines, filename)
            print(f"  Saved {len(all_medicines)} medicines to {filename}")
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
        logger.exception("Scraper error")
        
        if all_medicines:
            filename = f'bd_medicines_partial_{start_page}_to_{end_page}.csv'
            save_to_csv(all_medicines, filename)
            print(f"  Saved {len(all_medicines)} medicines to {filename}")
        
    finally:
        if driver:
            print("\nClosing browser...")
            driver.quit()


if __name__ == "__main__":
    main()
