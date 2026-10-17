#include "CloudNetworkService.hpp"
#include <utility>

namespace HarmonySync::Core {

namespace {

// Mock successful HTTP 200 response for offline use and unit testing.
class OfflineHttpClient final : public IHttpClient {
public:
    HttpResponse get(const std::string& /*url*/) override {
        HttpResponse resp;
        resp.statusCode = 200;
        resp.body = R"({"title":"Amazing Grace","artist":"John Newton","lyrics":"Amazing grace how sweet the sound"})";
        resp.success = true;
        return resp;
    }
};

} // namespace

struct CloudNetworkService::Impl {
    std::shared_ptr<IHttpClient> httpClient;

    explicit Impl(std::shared_ptr<IHttpClient> client)
        : httpClient(client ? std::move(client) : std::make_shared<OfflineHttpClient>()) {}
};

CloudNetworkService::CloudNetworkService(std::shared_ptr<IHttpClient> httpClient)
    : m_impl(std::make_unique<Impl>(std::move(httpClient))) {}

CloudNetworkService::~CloudNetworkService() = default;
CloudNetworkService::CloudNetworkService(CloudNetworkService&&) noexcept = default;
CloudNetworkService& CloudNetworkService::operator=(CloudNetworkService&&) noexcept = default;

void CloudNetworkService::getAsync(const std::string& url, const std::function<void(const HttpResponse&)>& callback) {
    HttpResponse resp = getSync(url);
    if (callback) {
        callback(resp);
    }
}

HttpResponse CloudNetworkService::getSync(const std::string& url) {
    if (url.empty()) {
        HttpResponse resp;
        resp.statusCode = 400;
        resp.errorMessage = "Empty URL provided";
        return resp;
    }
    return m_impl->httpClient->get(url);
}

} // namespace HarmonySync::Core
