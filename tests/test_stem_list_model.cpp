// #206: AudioMixerViewModel::stemModel is a real list model of the loaded stems.
// Looked up through the Q_PROPERTY so the test builds before the model exists.
#include "AudioMixerViewModel.hpp"
#include "MediaStem.hpp"

#include <QAbstractItemModel>
#include <QCoreApplication>
#include <QSignalSpy>
#include <QVariant>

#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>

using namespace HarmonySync::ViewModels;
using HarmonySync::Core::MediaStem;

namespace {

void check(bool ok, const std::string& what) {
    if (!ok) throw std::runtime_error(what);
}

QAbstractItemModel* modelOf(AudioMixerViewModel& vm) {
    auto* m = vm.property("stemModel").value<QAbstractItemModel*>();
    check(m != nullptr, "AudioMixerViewModel has no stemModel property");
    return m;
}

int roleId(QAbstractItemModel* m, const QByteArray& name) {
    const auto names = m->roleNames();
    for (auto it = names.begin(); it != names.end(); ++it)
        if (it.value() == name) return it.key();
    throw std::runtime_error("missing role " + name.toStdString());
}

MediaStem stem(const char* id, const char* name, bool muted = false) {
    MediaStem s(id, name, std::string(id) + ".wav");
    s.setMuted(muted);
    return s;
}

void testRoleNames() {
    std::cout << "[TEST] Running testRoleNames..." << std::endl;
    AudioMixerViewModel vm;
    auto* m = modelOf(vm);
    check(roleId(m, "name") == Qt::UserRole + 1, "name role id");
    check(roleId(m, "muted") == Qt::UserRole + 2, "muted role id");
    check(roleId(m, "soloed") == Qt::UserRole + 3, "soloed role id");
    check(roleId(m, "volume") == Qt::UserRole + 4, "volume role id");
    check(m->roleNames().size() == 4, "expected exactly 4 roles");
    std::cout << "[PASS] testRoleNames passed." << std::endl;
}

void testRowCountAndDataFollowLoadedSong() {
    std::cout << "[TEST] Running testRowCountAndDataFollowLoadedSong..." << std::endl;
    AudioMixerViewModel vm;
    auto* m = modelOf(vm);
    check(m->rowCount() == 0, "empty before load");
    QSignalSpy resets(m, &QAbstractItemModel::modelReset);
    vm.loadSongStems({stem("a1", "DrumsA", true), stem("a2", "BassA")});
    check(m->rowCount() == 2, "rowCount after load A");
    check(resets.count() >= 1, "loadSongStems did not reset the model");
    vm.loadNextSongStems({stem("b1", "KeysB"), stem("b2", "VoxB", true)});
    check(resets.count() >= 2, "loadNextSongStems did not reset the model");
    check(m->rowCount() == 2, "rowCount after load B");
    check(m->data(m->index(0, 0), roleId(m, "name")).toString() == "KeysB", "row 0 name after B");
    check(!m->data(m->index(0, 0), roleId(m, "muted")).toBool(), "row 0 muted after B");
    check(m->data(m->index(1, 0), roleId(m, "muted")).toBool(), "row 1 muted after B");
    check(!m->data(m->index(5, 0), roleId(m, "name")).isValid(), "out-of-range row returns invalid");
    std::cout << "[PASS] testRowCountAndDataFollowLoadedSong passed." << std::endl;
}

void testDataChangedOnMuteToggle() {
    std::cout << "[TEST] Running testDataChangedOnMuteToggle..." << std::endl;
    AudioMixerViewModel vm;
    auto* m = modelOf(vm);
    vm.loadSongStems({stem("a1", "DrumsA"), stem("a2", "BassA")});
    QSignalSpy changed(m, &QAbstractItemModel::dataChanged);
    vm.toggleStemMute(1);
    check(changed.count() == 1, "toggleStemMute should emit one dataChanged");
    auto tl = changed.at(0).at(0).value<QModelIndex>();
    auto br = changed.at(0).at(1).value<QModelIndex>();
    check(tl.row() == 1 && br.row() == 1, "dataChanged should cover row 1 only");
    check(m->data(m->index(1, 0), roleId(m, "muted")).toBool(), "row 1 muted after toggle");
    vm.toggleStemMute(7); // out of range: nothing
    check(changed.count() == 1, "out-of-range toggle emitted dataChanged");
    std::cout << "[PASS] testDataChangedOnMuteToggle passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    QCoreApplication app(argc, argv);
    try {
        testRoleNames();
        testRowCountAndDataFollowLoadedSong();
        testDataChangedOnMuteToggle();
        std::cout << "\nALL STEM LIST MODEL TESTS PASSED" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "FAIL in stem list model tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
