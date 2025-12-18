using RestSharp;
namespace TestApplication
{
    class Test
    {
        static void Main(string[] args)
        {
            var client = new RestClient("https://api.zenrows.com/v1/?apikey=<YOUR_ZENROWS_API_KEY>&url=https%3A%2F%2Fwww.amazon.com%2FLogitech-Master-Bluetooth-Wireless-Receiver%2Fdp%2FB0FB21526X&js_render=true&premium_proxy=true&autoparse=true");
            var request = new RestRequest();

            var response = client.Get(request);
            Console.WriteLine(response.Content);
        }
    }
}