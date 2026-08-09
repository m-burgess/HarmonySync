#include "DisplayManager.hpp"
#include <algorithm>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QGuiApplication>)
#include <QGuiApplication>
#include <QScreen>
#include <QList>
#define HARMONYSYNC_QT_SCREEN_AVAILABLE 1
#endif

namespace HarmonySync::Core {

struct DisplayManager::Impl {
    std::vector<DisplayInfo> displays;

    Impl() {
        DisplayInfo primary;
        primary.id = 1;
        primary.name = "Display 1: Main Control Monitor (1920x1080)";
        primary.width = 1920;
        primary.height = 1080;
        primary.isPrimary = true;
        primary.assignedRole = DisplayRole::ControlPanel;
        displays.push_back(primary);
    }

    void populateDetectedDisplays() {
        displays.clear();

#ifdef HARMONYSYNC_QT_SCREEN_AVAILABLE
        if (QGuiApplication::instance()) {
            QList<QScreen*> screens = QGuiApplication::screens();
            if (!screens.isEmpty()) {
                int id = 1;
                QScreen* primaryScreen = QGuiApplication::primaryScreen();
                for (QScreen* screen : screens) {
                    DisplayInfo info;
                    info.id = id++;
                    info.name = screen->name().toStdString();
                    if (info.name.empty()) {
                        info.name = "Display " + std::to_string(info.id);
                    }
                    info.width = screen->geometry().width();
                    info.height = screen->geometry().height();
                    info.xOffset = screen->geometry().x();
                    info.yOffset = screen->geometry().y();
                    info.isPrimary = (screen == primaryScreen);
                    info.assignedRole = info.isPrimary ? DisplayRole::ControlPanel : DisplayRole::AudienceScreen;
                    displays.push_back(info);
                }
            }
        }
#endif

        if (displays.empty()) {
            DisplayInfo primary;
            primary.id = 1;
            primary.name = "Display 1: Main Control Monitor (1920x1080)";
            primary.width = 1920;
            primary.height = 1080;
            primary.isPrimary = true;
            primary.assignedRole = DisplayRole::ControlPanel;
            displays.push_back(primary);

            DisplayInfo secondary;
            secondary.id = 2;
            secondary.name = "Display 2: Projector / Main Audience (1920x1080)";
            secondary.width = 1920;
            secondary.height = 1080;
            secondary.isPrimary = false;
            secondary.assignedRole = DisplayRole::AudienceScreen;
            displays.push_back(secondary);

            DisplayInfo tertiary;
            tertiary.id = 3;
            tertiary.name = "Display 3: Stage Confidence Monitor (1920x1080)";
            tertiary.width = 1920;
            tertiary.height = 1080;
            tertiary.isPrimary = false;
            tertiary.assignedRole = DisplayRole::ConfidenceMonitor;
            displays.push_back(tertiary);
        }
    }
};

DisplayManager::DisplayManager()
    : m_impl(std::make_unique<Impl>())
{}

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
    auto it = std::find_if(m_impl->displays.begin(), m_impl->displays.end(), [role](const DisplayInfo& d) {
        return d.assignedRole == role;
    });
    if (it != m_impl->displays.end()) {
        return &(*it);
    }
    return nullptr;
}

bool DisplayManager::assignDisplayRole(int displayId, DisplayRole role) {
    auto it = std::find_if(m_impl->displays.begin(), m_impl->displays.end(), [displayId](const DisplayInfo& d) {
        return d.id == displayId;
    });
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
