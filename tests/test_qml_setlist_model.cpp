// #219 (with #206's pattern): the setlist must show the new service order's songs even
// when it has the same number of songs as the previous one.
//
// QML path: the real ServiceOrderPanel.qml, reading each delegate's itemName/hasSongMap.
// Model: SetlistViewModel.setlistModel (QAbstractListModel, roles name/hasSongMap/isCurrent)
// resets on open, inserts/removes rows on add/remove, and signals isCurrent changes.
#include "SetlistViewModel.hpp"

#include <QAbstractItemModel>
#include <QElapsedTimer>
#include <QGuiApplication>
#include <QQmlComponent>
#include <QQmlContext>
#include <QQmlEngine>
#include <QQuickItem>
#include <QQuickWindow>
#include <QSignalSpy>
#include <QUrl>

#include <algorithm>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

using namespace HarmonySync::ViewModels;
namespace fs = std::filesystem;

namespace {

void check(bool ok, const std::string& what) {
    if (!ok) throw std::runtime_error(what);
}

void runEvents(int ms) {
    QElapsedTimer t;
    t.start();
    while (t.elapsed() < ms) QCoreApplication::processEvents(QEventLoop::AllEvents, 10);
}

// Each entry: folder name suffix, and whether it is a song (audio stem) or media only.
struct Item { std::string name; bool song; };

fs::path makeOrder(const std::string& tag, const std::vector<Item>& items) {
    fs::path root = fs::temp_directory_path() / ("hs_setlist_model_" + tag);
    fs::remove_all(root);
    for (std::size_t i = 0; i < items.size(); ++i) {
        fs::path dir = root / ("0" + std::to_string(i + 1) + "_" + items[i].name);
        fs::create_directories(dir);
        if (items[i].song) std::ofstream(dir / "guitar.wav") << "AUDIO_DATA";
        else std::ofstream(dir / "slide.png") << "IMAGE_DATA";
    }
    return root;
}

bool open(SetlistViewModel& vm, const fs::path& root) {
    return vm.openServiceOrderRootFolder(QString::fromStdString(root.string()));
}

struct Panel {
    QQmlEngine engine;
    QQuickWindow window; // layouts only run for items in a window
    std::unique_ptr<QQuickItem> root;
    QQuickItem* list{nullptr};

    explicit Panel(SetlistViewModel& vm) {
        engine.rootContext()->setContextProperty("setlistViewModel", &vm);
        QQmlComponent component(&engine,
            QUrl::fromLocalFile(QStringLiteral(HS_QML_DIR "/components/ServiceOrderPanel.qml")));
        root.reset(qobject_cast<QQuickItem*>(component.create()));
        if (!root) {
            throw std::runtime_error("ServiceOrderPanel.qml failed to load: " + component.errorString().toStdString());
        }
        window.resize(400, 900);
        root->setParentItem(window.contentItem());
        root->setSize(QSizeF(400, 900));
        window.show();
        for (QQuickItem* item : root->findChildren<QQuickItem*>()) {
            if (QByteArray(item->metaObject()->className()).startsWith("QQuickListView")) list = item;
        }
        if (!list) throw std::runtime_error("setlist ListView not found in ServiceOrderPanel.qml");
    }

    // (index, itemName, hasSongMap) for every instantiated delegate, sorted by index.
    struct Row { int index; std::string name; bool hasSongMap; };
    std::vector<Row> rows() {
        runEvents(50);
        std::vector<Row> out;
        auto* content = list->property("contentItem").value<QQuickItem*>();
        if (qEnvironmentVariableIsSet("HS_DEBUG")) {
            std::cerr << "list h=" << list->height() << " w=" << list->width() << " count=" << list->property("count").toInt()
                      << " children=" << content->childItems().size() << "\n";
            for (QQuickItem* d : content->childItems())
                std::cerr << "  " << d->metaObject()->className() << " name=" << d->property("itemName").toString().toStdString()
                          << " vis=" << d->isVisible() << "\n";
        }
        for (QQuickItem* d : content->childItems()) {
            QVariant name = d->property("itemName");
            if (!name.isValid() || !d->isVisible()) continue;
            QQmlContext* ctx = QQmlEngine::contextForObject(d);
            int index = ctx ? ctx->contextProperty("index").toInt() : -1;
            out.push_back({index, name.toString().toStdString(), d->property("hasSongMap").toBool()});
        }
        std::sort(out.begin(), out.end(), [](const Row& a, const Row& b) { return a.index < b.index; });
        return out;
    }
};

// The panel's rows must match the view model's songs exactly.
void checkPanelShows(Panel& panel, SetlistViewModel& vm, const std::string& what) {
    auto rows = panel.rows();
    check(static_cast<int>(rows.size()) == vm.itemCount(),
          what + ": panel shows " + std::to_string(rows.size()) + " rows, want " + std::to_string(vm.itemCount()));
    for (const auto& r : rows) {
        const std::string want = vm.itemNameAt(r.index).toStdString();
        check(r.name == want, what + ": row " + std::to_string(r.index) + " shows '" + r.name + "', want '" + want + "'");
        check(r.hasSongMap == vm.itemHasSongMapAt(r.index),
              what + ": row " + std::to_string(r.index) + " song-map flag is stale");
    }
}

void testQmlSameCountOrderShowsNewSongs() {
    SetlistViewModel vm;
    Panel panel(vm);
    check(open(vm, makeOrder("qa188", {{"QA188_Song_A", true}, {"QA188_Notices", false}})), "open QA188 failed");
    checkPanelShows(panel, vm, "QA188");
    check(open(vm, makeOrder("qa187", {{"QA187_Welcome", false}, {"QA187_Song_B", true}})), "open QA187 failed");
    checkPanelShows(panel, vm, "QA187 after QA188 (2 songs each)");
}

void testQmlTwoFourSongOrders() {
    SetlistViewModel vm;
    Panel panel(vm);
    check(open(vm, makeOrder("wk1", {{"Wk1_A", true}, {"Wk1_B", true}, {"Wk1_C", false}, {"Wk1_D", true}})), "open wk1 failed");
    checkPanelShows(panel, vm, "week 1");
    check(open(vm, makeOrder("wk2", {{"Wk2_A", false}, {"Wk2_B", true}, {"Wk2_C", true}, {"Wk2_D", false}})), "open wk2 failed");
    checkPanelShows(panel, vm, "week 2 after week 1 (4 songs each)");
    vm.removeSongAt(1);
    checkPanelShows(panel, vm, "week 2 after removing row 1");
}

QAbstractItemModel* modelOf(SetlistViewModel& vm) {
    auto* model = vm.property("setlistModel").value<QAbstractItemModel*>();
    check(model != nullptr, "SetlistViewModel has no setlistModel property");
    return model;
}

int role(QAbstractItemModel* model, const QByteArray& name) {
    const auto names = model->roleNames();
    for (auto it = names.begin(); it != names.end(); ++it) if (it.value() == name) return it.key();
    throw std::runtime_error("model has no '" + name.toStdString() + "' role");
}

void testModelRolesResetAndRowChanges() {
    SetlistViewModel vm;
    QAbstractItemModel* model = modelOf(vm);
    const int nameRole = role(model, "name");
    const int songRole = role(model, "hasSongMap");
    const int currentRole = role(model, "isCurrent");
    check(nameRole == Qt::UserRole + 1, "name role is not Qt::UserRole + 1");

    QSignalSpy resets(model, &QAbstractItemModel::modelReset);
    check(open(vm, makeOrder("m1", {{"M1_A", true}, {"M1_B", false}})), "open m1 failed");
    check(model->rowCount() == 2, "rowCount != 2 after open");
    check(resets.count() == 1, "open did not reset the model");
    check(model->data(model->index(0, 0), nameRole).toString() == vm.itemNameAt(0), "row 0 name wrong");
    check(model->data(model->index(1, 0), songRole).toBool() == false, "row 1 hasSongMap wrong");
    check(model->data(model->index(0, 0), currentRole).toBool(), "row 0 not current after open");

    check(open(vm, makeOrder("m2", {{"M2_X", false}, {"M2_Y", true}})), "open m2 failed");
    check(resets.count() == 2, "same-count open did not reset the model");
    check(model->data(model->index(0, 0), nameRole).toString() == vm.itemNameAt(0), "row 0 kept the old name");
    check(model->data(model->index(1, 0), songRole).toBool(), "row 1 kept the old song-map flag");

    QSignalSpy changed(model, &QAbstractItemModel::dataChanged);
    vm.setCurrentSongIndex(1);
    check(!model->data(model->index(0, 0), currentRole).toBool() && model->data(model->index(1, 0), currentRole).toBool(),
          "isCurrent did not move to row 1");
    check(changed.count() >= 1, "no dataChanged for the current-row change");

    QSignalSpy removed(model, &QAbstractItemModel::rowsRemoved);
    vm.removeSongAt(0);
    check(removed.count() == 1 && model->rowCount() == 1, "removeSongAt did not remove one row");

    fs::path extra = makeOrder("m3", {{"M3_Extra", true}}) / "01_M3_Extra";
    QSignalSpy inserted(model, &QAbstractItemModel::rowsInserted);
    check(vm.addSongFolder(QString::fromStdString(extra.string())), "addSongFolder failed");
    check(inserted.count() == 1 && model->rowCount() == 2, "addSongFolder did not insert one row");
    check(model->data(model->index(1, 0), nameRole).toString() == vm.itemNameAt(1), "inserted row name wrong");

    vm.clearSetlist();
    check(model->rowCount() == 0, "clearSetlist left rows");
}

} // namespace

int main(int argc, char** argv) {
    qputenv("QT_QPA_PLATFORM", qgetenv("QT_QPA_PLATFORM").isEmpty() ? "offscreen" : qgetenv("QT_QPA_PLATFORM"));
    QGuiApplication app(argc, argv);
    struct Case { const char* name; void (*fn)(); };
    const Case cases[] = {
        {"qml_same_count_order_shows_new_songs", testQmlSameCountOrderShowsNewSongs},
        {"qml_two_four_song_orders", testQmlTwoFourSongOrders},
        {"model_roles_reset_and_row_changes", testModelRolesResetAndRowChanges},
    };
    int failed = 0;
    for (const auto& c : cases) {
        try { c.fn(); std::cout << "PASS " << c.name << "\n"; }
        catch (const std::exception& e) { ++failed; std::cout << "FAIL " << c.name << ": " << e.what() << "\n"; }
    }
    return failed == 0 ? 0 : 1;
}
