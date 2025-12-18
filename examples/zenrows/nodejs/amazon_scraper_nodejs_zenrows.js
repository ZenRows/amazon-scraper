// npm install axios
const axios = require("axios");

const url =
  "https://www.amazon.com/Logitech-Master-Bluetooth-Wireless-Receiver/dp/B0FB21526X";
const apikey = "<YOUR_ZENROWS_API_KEY>";
axios({
  url: "https://api.zenrows.com/v1/",
  method: "GET",
  params: {
    url: url,
    apikey: apikey,
    js_render: "true",
    premium_proxy: "true",
    autoparse: "true",
  },
})
  .then((response) => console.log(response.data))
  .catch((error) => console.log(error));
