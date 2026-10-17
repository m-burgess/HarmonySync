#include "SetlistViewModel.hpp"

#include <QGuiApplication>
#include <QQmlComponent>
#include <QQmlContext>
#include <QQmlEngine>
#include <QUrl>

#include <cstdlib>
#include <iostream>

using namespace HarmonySync::ViewModels;

int main(int argc, char* argv[]) {
    int appArgc = argc;
    QGuiApplication app(appArgc, argv);

    QQmlEngine engine;
    SetlistViewModel vm;
    engine.rootContext()->setContextProperty("setlistViewModel", &vm);

    QQmlComponent component(&engine, QUrl::fromLocalFile(QStringLiteral(HS_QML_DIR "/components/ServiceOrderPanel.qml")));
    std::unique_ptr<QObject> root(component.create());
    if (!root) {
        std::cerr << "ServiceOrderPanel.qml failed to load: "
                  << component.errorString().toStdString() << std::endl;
        return EXIT_FAILURE;
    }

    std::cout << "[PASS] ServiceOrderPanel.qml loaded successfully." << std::endl;
    return EXIT_SUCCESS;
}
