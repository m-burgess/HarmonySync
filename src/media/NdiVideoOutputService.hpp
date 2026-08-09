#ifndef HARMONYSYNC_NDI_VIDEO_OUTPUT_SERVICE_HPP
#define HARMONYSYNC_NDI_VIDEO_OUTPUT_SERVICE_HPP

#include <string>
#include <memory>
#include <cstdint>

namespace HarmonySync::Media {

/**
 * @brief Thread-safe manager for broadcasting live presentation frames over NDI network streams.
 */
class NdiVideoOutputService {
public:
    NdiVideoOutputService();
    explicit NdiVideoOutputService(const std::string& streamName);
    ~NdiVideoOutputService();

    NdiVideoOutputService(const NdiVideoOutputService&) = delete;
    NdiVideoOutputService& operator=(const NdiVideoOutputService&) = delete;
    NdiVideoOutputService(NdiVideoOutputService&&) noexcept;
    NdiVideoOutputService& operator=(NdiVideoOutputService&&) noexcept;

    bool startStreaming();
    void stopStreaming();

    [[nodiscard]] bool isStreaming() const noexcept;
    [[nodiscard]] std::string streamName() const;

    void setResolution(int width, int height) noexcept;
    [[nodiscard]] std::pair<int, int> resolution() const noexcept;

    void sendFrame(const uint8_t* rgbaBuffer, size_t bufferSize);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_NDI_VIDEO_OUTPUT_SERVICE_HPP
