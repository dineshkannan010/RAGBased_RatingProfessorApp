import requests
from bs4 import BeautifulSoup
def web_scrapping(url):
    response=requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data from {url}")
    
    soup = BeautifulSoup(response.text, 'html.parser')