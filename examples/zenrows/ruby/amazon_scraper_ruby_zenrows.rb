# gem install faraday
require 'faraday'

url = URI.parse('https://api.zenrows.com/v1/?apikey=<YOUR_ZENROWS_API_KEY>&url=https%3A%2F%2Fwww.amazon.com%2FLogitech-Master-Bluetooth-Wireless-Receiver%2Fdp%2FB0FB21526X&js_render=true&premium_proxy=true&autoparse=true')
conn = Faraday.new()
conn.options.timeout = 180
res = conn.get(url, nil, nil)
print(res.body)