#include "SetlistViewModel.hpp"
#include "AudioMixerViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include "SettingsViewModel.hpp"
#include <iostream>
#include <memory>
#include <filesystem>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QUrl>
#include <QFile>
#endif

int main(int argc, char* argv[]) {
    std::cout << "Starting HarmonySync C++20 / Qt6 Application..." << std::endl;

    auto folderService = std::make_shared<HarmonySync::Core::FolderService>();
    auto audioEngine = std::make_shared<HarmonySync::Media::AudioEngine>();

    HarmonySync::ViewModels::SetlistViewModel setlistViewModel(folderService);
    HarmonySync::ViewModels::AudioMixerViewModel audioMixerViewModel(audioEngine);
    HarmonySync::ViewModels::SlideDisplayViewModel slideDisplayViewModel(folderService);
    HarmonySync::ViewModels::SettingsViewModel settingsViewModel;

#ifdef HARMONYSYNC_QT_AVAILABLE
    qputenv("QT_QUICK_CONTROLS_STYLE", "Basic");
    QGuiApplication app(argc, argv);

    QQmlApplicationEngine engine;
    QQmlContext* context = engine.rootContext();

    context->setContextProperty("setlistViewModel", &setlistViewModel);
    context->setContextProperty("audioMixerViewModel", &audioMixerViewModel);
    context->setContextProperty("slideDisplayViewModel", &slideDisplayViewModel);
    context->setContextProperty("settingsViewModel", &settingsViewModel);

    QUrl url(QStringLiteral("qrc:/src/qml/main.qml"));
    if (!QFile::exists(QStringLiteral(":/src/qml/main.qml"))) {
        if (QFile::exists(QStringLiteral(":/qml/main.qml"))) {
            url = QUrl(QStringLiteral("qrc:/qml/main.qml"));
        } else {
            std::filesystem::path localPath = std::filesystem::current_path() / "src" / "qml" / "main.qml";
            url = QUrl::fromLocalFile(QString::fromStdString(localPath.string()));
        }
    }

    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreated,
        &app,
        [url](QObject* obj, const QUrl& objUrl) {
            if (!obj && url == objUrl) {
                QCoreApplication::exit(-1);
            }
        },
        Qt::QueuedConnection);

    engine.load(url);

    return app.exec();
#else
    std::cout << "[INFO] Qt GUI libraries not linked in current build environment. Core C++ engine initialized successfully." << std::endl;
    std::cout << "[INFO] Setlist title: " << setlistViewModel.titleStd() << std::endl;
    std::cout << "[INFO] Audio engine position: " << audioMixerViewModel.positionSeconds() << "s" << std::endl;
    std::cout << "[INFO] Slide count: " << slideDisplayViewModel.slideCount() << std::endl;
    return 0;
#endif
}
