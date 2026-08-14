#include "AudioMixerViewModel.hpp"
#include "SetlistViewModel.hpp"
#include "SettingsViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include <filesystem>
#include <iostream>
#include <memory>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QFile>
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include <QUrl>
#endif

int main(int argc, char *argv[]) {
  std::cout << "Starting HarmonySync C++20 / Qt6 Application..." << std::endl;

#ifdef HARMONYSYNC_QT_AVAILABLE
  qputenv("QT_QPA_PLATFORMTHEME", "generic");
  qputenv("QT_QUICK_CONTROLS_STYLE", "Fusion");
  qputenv("QT_QUICK_CONTROLS_FALLBACK_STYLE", "Fusion");
  QQuickStyle::setStyle("Fusion");
  QGuiApplication app(argc, argv);
#endif

  auto folderService = std::make_shared<HarmonySync::Core::FolderService>();
  auto audioEngine = std::make_shared<HarmonySync::Media::AudioEngine>();

  HarmonySync::ViewModels::SetlistViewModel setlistViewModel(folderService);
  HarmonySync::ViewModels::AudioMixerViewModel audioMixerViewModel(audioEngine);
  HarmonySync::ViewModels::SlideDisplayViewModel slideDisplayViewModel(
      folderService);
  HarmonySync::ViewModels::SettingsViewModel settingsViewModel;

#ifdef HARMONYSYNC_QT_AVAILABLE

  QQmlApplicationEngine engine;
  QQmlContext *context = engine.rootContext();

  context->setContextProperty("setlistViewModel", &setlistViewModel);
  context->setContextProperty("audioMixerViewModel", &audioMixerViewModel);
  context->setContextProperty("slideDisplayViewModel", &slideDisplayViewModel);
  context->setContextProperty("settingsViewModel", &settingsViewModel);

  QUrl url(QStringLiteral("qrc:/src/qml/main.qml"));
  if (!QFile::exists(QStringLiteral(":/src/qml/main.qml"))) {
    if (QFile::exists(QStringLiteral(":/qml/main.qml"))) {
      url = QUrl(QStringLiteral("qrc:/qml/main.qml"));
    } else {
      std::filesystem::path localPath =
          std::filesystem::current_path() / "src" / "qml" / "main.qml";
      url = QUrl::fromLocalFile(QString::fromStdString(localPath.string()));
    }
  }

  QObject::connect(
      &engine, &QQmlApplicationEngine::objectCreated, &app,
      [url](QObject *obj, const QUrl &objUrl) {
        if (!obj && url == objUrl) {
          QCoreApplication::exit(-1);
        }
      },
      Qt::QueuedConnection);

  // Bind Setlist selection to AudioMixer preloading and immediate video switch
  QObject::connect(
      &setlistViewModel,
      &HarmonySync::ViewModels::SetlistViewModel::currentSongIndexChanged, &app,
      [&setlistViewModel, &audioMixerViewModel](int index) {
        if (index >= 0) {
          auto stems = setlistViewModel.stemsAt(index);
          QString videoPath = setlistViewModel.backgroundVideoPathAt(index);
          audioMixerViewModel.setActiveBackgroundVideo(videoPath);
          audioMixerViewModel.loadNextBackgroundVideo(videoPath);
          audioMixerViewModel.loadNextSongStems(stems);
        }
      });

  // Bind audio playback position to AI lyric syncing
  QObject::connect(
      &audioMixerViewModel,
      &HarmonySync::ViewModels::AudioMixerViewModel::positionChanged, &app,
      [&setlistViewModel](double positionSeconds) {
        setlistViewModel.syncToPlaybackPosition(positionSeconds);
      });

  engine.load(url);

  return app.exec();
#else
  std::cout << "[INFO] Qt GUI libraries not linked in current build "
               "environment. Core C++ engine initialized successfully."
            << std::endl;
  std::cout << "[INFO] Setlist title: " << setlistViewModel.titleStd()
            << std::endl;
  std::cout << "[INFO] Audio engine position: "
            << audioMixerViewModel.positionSeconds() << "s" << std::endl;
  std::cout << "[INFO] Slide count: " << slideDisplayViewModel.slideCount()
            << std::endl;
  return 0;
#endif
}
