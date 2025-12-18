# pip install requests
import requests

url = "https://www.amazon.com/Logitech-Master-Bluetooth-Wireless-Receiver/dp/B0FB21526X"
apikey = "<YOUR_ZENROWS_API_KEY>"
params = {
    "url": url,
    "apikey": apikey,
    "js_render": "true",
    "premium_proxy": "true",
    "autoparse": "true",
}
response = requests.get("https://api.zenrows.com/v1/", params=params)
print(response.text)
