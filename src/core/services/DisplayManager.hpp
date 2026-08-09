#ifndef HARMONYSYNC_DISPLAY_MANAGER_HPP
#define HARMONYSYNC_DISPLAY_MANAGER_HPP

#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

enum class DisplayRole {
    ControlPanel,
    AudienceScreen,
    ConfidenceMonitor,
    StageScreen
};

struct DisplayInfo {
    int id{0};
    std::string name;
    int width{1920};
    int height{1080};
    int xOffset{0};
    int yOffset{0};
    bool isPrimary{false};
    DisplayRole assignedRole{DisplayRole::ControlPanel};
};

/**
 * @brief Service managing attached physical displays, presentation output roles, and geometry calculations.
 */
class DisplayManager {
public:
    DisplayManager();
    ~DisplayManager();

    DisplayManager(const DisplayManager&) = delete;
    DisplayManager& operator=(const DisplayManager&) = delete;
    DisplayManager(DisplayManager&&) noexcept;
    DisplayManager& operator=(DisplayManager&&) noexcept;

    // Display Management
    void addDisplay(DisplayInfo display);
    void detectSystemDisplays();
    [[nodiscard]] const std::vector<DisplayInfo>& availableDisplays() const noexcept;
    [[nodiscard]] const DisplayInfo* getDisplayForRole(DisplayRole role) const noexcept;
    bool assignDisplayRole(int displayId, DisplayRole role);
    void clearAllDisplays() noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_DISPLAY_MANAGER_HPP
