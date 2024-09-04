from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.common.by import By
from webdriver_manager.firefox import GeckoDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time

# Setup Firefox options
options = FirefoxOptions()
options.headless = True  # Run headless browser
options.accept_insecure_certs = True  # Bypass SSL certificate errors

driver = webdriver.Firefox(service=FirefoxService(GeckoDriverManager().install()), options=options)
url = "https://www.ratemyprofessors.com/search/professors/685?q=*"
driver.get(url)

all_professors = []

# Function to load all professor cards by clicking "Show More"
def load_all_professors():
    while True:
        try:
            # Wait up to 10 seconds for the "Show More" button to be visible
            show_more_button = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.XPATH, '//button[text()="Show More"]'))
            )
            driver.execute_script("arguments[0].click();", show_more_button)
            time.sleep(2)  # Short wait for more professors to load after clicking
        except Exception as e:
            print(f"No more 'Show More' button found or error occurred: {e}")
            break

# Function to scrape reviews from each professor's page
def scrape_reviews(professor_link):
    driver.get(professor_link)
    time.sleep(3)  # Wait for the detailed page to load

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    reviews = []

    # Extract reviews from the detailed page
    review_elements = soup.find_all('div', class_='Comments__StyledComments-dzzyvm-0 gRjWel')
    for review in review_elements:
        review_text = review.text.strip()
        reviews.append(review_text)
    
    return reviews

def web_scrapping(url):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    prof_cards = soup.find_all('a', class_='TeacherCard__StyledTeacherCard-syjs0d-0')

    for card in prof_cards:
        try:
            professor = card.find('div', class_='CardName__StyledCardName-sc-1gyrgim-0').text.strip()
            subject = card.find('div', class_='CardSchool__Department-sc-19lmz2k-0').text.strip()
            school = card.find('div', class_='CardSchool__School-sc-19lmz2k-1').text.strip()
            stars = card.find('div', class_='CardNumRating__CardNumRatingNumber-sc-17t4b9u-2').text.strip()
            num_ratings = card.find('div', class_='CardNumRating__CardNumRatingCount-sc-17t4b9u-3').text.strip()
            would_take_again = card.find('div', class_='CardFeedback__CardFeedbackNumber-lq6nix-2').text.strip()
            difficulty = card.find_all('div', class_='CardFeedback__CardFeedbackNumber-lq6nix-2')[1].text.strip()

            # Get the link to the professor's detailed page
            prof_link = card['href']
            full_prof_link = f"https://www.ratemyprofessors.com{prof_link}"
            
            # Scrape reviews from the professor's page
            reviews = scrape_reviews(full_prof_link)
            
            # Add the professor details and reviews to the list
            all_professors.append({
                "name": professor,
                "department": subject,
                "school": school,
                "stars": stars,
                "num_ratings": num_ratings,
                "would_take_again": would_take_again,
                "difficulty": difficulty,
                "reviews": reviews
            })

            # Go back to the main page after scraping the detailed page
            driver.back()
            time.sleep(2)  # Wait for the main page to reload
        except AttributeError as e:
            print(f"An element was not found. Skipping a professor card: {e}")

    return all_professors

# Load all professors
load_all_professors()

# Scrape the professor data
all_professors = web_scrapping(driver)

# Output file path
output_file = '../professors.json'

# Write the results to a JSON file
with open(output_file, 'w') as f:
    json.dump(all_professors, f, indent=4)

print(f'Successfully scraped {len(all_professors)} professors and saved to {output_file}')

# Quit the driver
driver.quit()