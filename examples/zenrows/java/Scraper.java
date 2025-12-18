import org.apache.hc.client5.http.fluent.Request;

public class Scraper {
    public static void main(final String... args) throws Exception {
        String apiUrl = "https://api.zenrows.com/v1/?apikey=<YOUR_ZENROWS_API_KEY>&url=https%3A%2F%2Fwww.amazon.com%2FLogitech-Master-Bluetooth-Wireless-Receiver%2Fdp%2FB0FB21526X&js_render=true&premium_proxy=true&autoparse=true";
        String response = Request.get(apiUrl)
                .execute().returnContent().asString();

        System.out.println(response);
    }
}