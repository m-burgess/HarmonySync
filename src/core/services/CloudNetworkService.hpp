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
 * @brief Blocking HTTP GET transport behind CloudNetworkService.
 */
class IHttpClient {
public:
    IHttpClient() = default;
    IHttpClient(const IHttpClient&) = delete;
    IHttpClient& operator=(const IHttpClient&) = delete;
    virtual ~IHttpClient() = default;

    virtual HttpResponse get(const std::string& url) = 0;
};

/**
 * @brief Asynchronous HTTP client service. Until a real transport is injected it answers with an offline canned
 * response.
 */
class CloudNetworkService {
public:
    /** @param httpClient Transport for requests; defaults to the offline canned-response client. */
    explicit CloudNetworkService(std::shared_ptr<IHttpClient> httpClient = nullptr);
    ~CloudNetworkService();

    CloudNetworkService(const CloudNetworkService&) = delete;
    CloudNetworkService& operator=(const CloudNetworkService&) = delete;
    CloudNetworkService(CloudNetworkService&&) noexcept;
    CloudNetworkService& operator=(CloudNetworkService&&) noexcept;

    // HTTP Operations
    void getAsync(const std::string& url, const std::function<void(const HttpResponse&)>& callback);
    [[nodiscard]] HttpResponse getSync(const std::string& url);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_CLOUD_NETWORK_SERVICE_HPP
