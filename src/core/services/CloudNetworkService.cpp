#include "CloudNetworkService.hpp"

namespace HarmonySync::Core {

struct CloudNetworkService::Impl {
    Impl() = default;
};

CloudNetworkService::CloudNetworkService()
    : m_impl(std::make_unique<Impl>())
{}

CloudNetworkService::~CloudNetworkService() = default;
CloudNetworkService::CloudNetworkService(CloudNetworkService&&) noexcept = default;
CloudNetworkService& CloudNetworkService::operator=(CloudNetworkService&&) noexcept = default;

void CloudNetworkService::getAsync(const std::string& url, std::function<void(const HttpResponse&)> callback) {
    HttpResponse resp = getSync(url);
    if (callback) {
        callback(resp);
    }
}

HttpResponse CloudNetworkService::getSync(const std::string& url) {
    HttpResponse resp;
    if (url.empty()) {
        resp.statusCode = 400;
        resp.errorMessage = "Empty URL provided";
        resp.success = false;
        return resp;
    }

    // Mock successful HTTP 200 response for offline unit testing
    resp.statusCode = 200;
    resp.body = R"({"title":"Amazing Grace","artist":"John Newton","lyrics":"Amazing grace how sweet the sound"})";
    resp.success = true;
    return resp;
}

} // namespace HarmonySync::Core
