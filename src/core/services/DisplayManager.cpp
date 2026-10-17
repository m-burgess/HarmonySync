#include "DisplayManager.hpp"
#include <QGuiApplication>
#include <QList>
#include <QScreen>
#include <algorithm>
#include <utility>

namespace HarmonySync::Core {

namespace {

// Without a running QGuiApplication there are no screens to report.
std::vector<ScreenInfo> readQtScreens() {
    std::vector<ScreenInfo> screens;
    if (QGuiApplication::instance() == nullptr) {
        return screens;
    }
    const QScreen* primaryScreen = QGuiApplication::primaryScreen();
    for (const QScreen* screen : QGuiApplication::screens()) {
        const QRect geometry = screen->geometry();
        screens.push_back({screen->name().toStdString(), geometry.width(), geometry.height(), geometry.x(),
                           geometry.y(), screen == primaryScreen});
    }
    return screens;
}

DisplayInfo makeDisplay(int id, std::string name, bool isPrimary, DisplayRole role) {
    DisplayInfo display;
    display.id = id;
    display.name = std::move(name);
    display.isPrimary = isPrimary;
    display.assignedRole = role;
    return display;
}

} // namespace

struct DisplayManager::Impl {
    std::vector<DisplayInfo> displays;
    ScreenSource screenSource;

    explicit Impl(ScreenSource source)
        : screenSource(source ? std::move(source) : ScreenSource(readQtScreens)) {
        displays.push_back(
            makeDisplay(1, "Display 1: Main Control Monitor (1920x1080)", true, DisplayRole::ControlPanel));
    }

    void populateDetectedDisplays() {
        displays.clear();

        int id = 1;
        for (const ScreenInfo& screen : screenSource()) {
            DisplayInfo info;
            info.id = id;
            info.name = screen.name.empty() ? "Display " + std::to_string(id) : screen.name;
            info.width = screen.width;
            info.height = screen.height;
            info.xOffset = screen.x;
            info.yOffset = screen.y;
            info.isPrimary = screen.isPrimary;
            info.assignedRole = screen.isPrimary ? DisplayRole::ControlPanel : DisplayRole::AudienceScreen;
            displays.push_back(std::move(info));
            ++id;
        }

        if (displays.empty()) {
            displays.push_back(
                makeDisplay(1, "Display 1: Main Control Monitor (1920x1080)", true, DisplayRole::ControlPanel));
            displays.push_back(
                makeDisplay(2, "Display 2: Projector / Main Audience (1920x1080)", false, DisplayRole::AudienceScreen));
            displays.push_back(makeDisplay(3, "Display 3: Stage Confidence Monitor (1920x1080)", false,
                                           DisplayRole::ConfidenceMonitor));
        }
    }
};

DisplayManager::DisplayManager(ScreenSource screenSource)
    : m_impl(std::make_unique<Impl>(std::move(screenSource))) {}

DisplayManager::~DisplayManager() = default;

DisplayManager::DisplayManager(DisplayManager&&) noexcept = default;
DisplayManager& DisplayManager::operator=(DisplayManager&&) noexcept = default;

void DisplayManager::addDisplay(DisplayInfo display) {
    m_impl->displays.push_back(std::move(display));
}

void DisplayManager::detectSystemDisplays() {
    m_impl->populateDetectedDisplays();
}

const std::vector<DisplayInfo>& DisplayManager::availableDisplays() const noexcept {
    return m_impl->displays;
}

const DisplayInfo* DisplayManager::getDisplayForRole(DisplayRole role) const noexcept {
    auto it = std::find_if(m_impl->displays.begin(), m_impl->displays.end(),
                           [role](const DisplayInfo& d) { return d.assignedRole == role; });
    if (it != m_impl->displays.end()) {
        return &(*it);
    }
    return nullptr;
}

bool DisplayManager::assignDisplayRole(int displayId, DisplayRole role) {
    auto it = std::find_if(m_impl->displays.begin(), m_impl->displays.end(),
                           [displayId](const DisplayInfo& d) { return d.id == displayId; });
    if (it != m_impl->displays.end()) {
        it->assignedRole = role;
        return true;
    }
    return false;
}

void DisplayManager::clearAllDisplays() noexcept {
    m_impl->displays.clear();
}

} // namespace HarmonySync::Core
