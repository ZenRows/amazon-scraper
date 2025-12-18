package main

import (
	"io"
	"log"
	"net/http"
)

func main() {
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://api.zenrows.com/v1/?apikey=<YOUR_ZENROWS_API_KEY>&url=https%3A%2F%2Fwww.amazon.com%2FLogitech-Master-Bluetooth-Wireless-Receiver%2Fdp%2FB0FB21526X&js_render=true&premium_proxy=true&autoparse=true", nil)
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalln(err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalln(err)
	}

	log.Println(string(body))
}
