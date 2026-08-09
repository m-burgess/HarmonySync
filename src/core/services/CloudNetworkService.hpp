#ifndef HARMONYSYNC_CLOUD_NETWORK_SERVICE_HPP
#define HARMONYSYNC_CLOUD_NETWORK_SERVICE_HPP

#include <string>
#include <functional>
#include <memory>

namespace HarmonySync::Core {

struct HttpResponse {
    int statusCode{0};
    std::string body;
    std::string errorMessage;
    bool success{false};
};

/**
 * @brief Asynchronous HTTP client service using Qt Network or native C++ fallback.
 */
class CloudNetworkService {
public:
    CloudNetworkService();
    ~CloudNetworkService();

    CloudNetworkService(const CloudNetworkService&) = delete;
    CloudNetworkService& operator=(const CloudNetworkService&) = delete;
    CloudNetworkService(CloudNetworkService&&) noexcept;
    CloudNetworkService& operator=(CloudNetworkService&&) noexcept;

    // HTTP Operations
    void getAsync(const std::string& url, std::function<void(const HttpResponse&)> callback);
    [[nodiscard]] HttpResponse getSync(const std::string& url);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_CLOUD_NETWORK_SERVICE_HPP
