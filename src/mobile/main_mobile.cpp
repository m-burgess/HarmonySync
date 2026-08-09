#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QIcon>
#include "mobile/MusicianSessionViewModel.hpp"
#include "mobile/MusicianConfidenceViewModel.hpp"
#include "MobileApiClient.hpp"

using namespace HarmonySync::ViewModels;
using namespace HarmonySync::Core;

int main(int argc, char *argv[])
{
#if QT_VERSION < QT_VERSION_CHECK(6, 0, 0)
    QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
#endif

    QGuiApplication app(argc, argv);
    app.setOrganizationName("HarmonySync");
    app.setOrganizationDomain("harmonysync.com");
    app.setApplicationName("HarmonySync Musician");

    QQmlApplicationEngine engine;

    // Create Shared Network Client
    auto apiClient = std::make_shared<MobileApiClient>();

    // Create Mobile View Models
    MusicianSessionViewModel sessionViewModel(apiClient);
    MusicianConfidenceViewModel confidenceViewModel(apiClient);

    // Register ViewModels with QML Context
    engine.rootContext()->setContextProperty("sessionViewModel", &sessionViewModel);
    engine.rootContext()->setContextProperty("confidenceViewModel", &confidenceViewModel);

    const QUrl url(QStringLiteral("qrc:/src/mobile/qml/main_mobile.qml"));
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreated,
                     &app, [url](QObject *obj, const QUrl &objUrl) {
        if (!obj && url == objUrl)
            QCoreApplication::exit(-1);
    }, Qt::QueuedConnection);
    
    engine.load(url);

    return app.exec();
}
