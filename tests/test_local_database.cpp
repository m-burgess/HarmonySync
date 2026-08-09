#include "LocalDatabaseService.hpp"
#include "SongLibraryIndexService.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testLocalDatabaseService() {
    std::cout << "[TEST] Running testLocalDatabaseService..." << std::endl;

    LocalDatabaseService db;
    assert(!db.isOpen());

    bool init = db.initializeDatabase();
    assert(init == true);
    assert(db.isOpen() == true);

    SongMap song1("song_101", "Way Maker", "Sinach");
    bool saved = db.saveSongMap(song1);
    assert(saved == true);

    SongMap loaded = db.getSongMapById("song_101");
    assert(loaded.title() == "Way Maker");
    assert(loaded.artist() == "Sinach");

    ServiceOrder order("order_1", "Sunday Service", "2026-08-09");
    order.addSong(song1);
    bool orderSaved = db.saveServiceOrder(order);
    assert(orderSaved == true);

    ServiceOrder loadedOrder = db.getServiceOrderById("order_1");
    assert(loadedOrder.title() == "Sunday Service");
    assert(loadedOrder.songs().size() == 1);

    std::cout << "[PASS] testLocalDatabaseService passed." << std::endl;
}

void testSongLibraryIndexService() {
    std::cout << "[TEST] Running testSongLibraryIndexService..." << std::endl;

    SongLibraryIndexService indexer;
    assert(indexer.indexedCount() == 0);

    SongMap s1("1", "Amazing Grace", "John Newton");
    SongMap s2("2", "Grace Like Rain", "Todd Agnew");
    SongMap s3("3", "Build My Life", "Housefires");

    indexer.buildIndex({s1, s2, s3});
    assert(indexer.indexedCount() == 3);

    // Test Search
    auto results = indexer.search("Grace");
    assert(results.size() == 2); // Amazing Grace, Grace Like Rain

    auto exactTitleResults = indexer.search("Build My Life");
    assert(exactTitleResults.size() == 1);
    assert(exactTitleResults[0].song.title() == "Build My Life");

    // Remove item
    indexer.removeSong("3");
    assert(indexer.indexedCount() == 2);

    std::cout << "[PASS] testSongLibraryIndexService passed." << std::endl;
}

int main() {
    try {
        testLocalDatabaseService();
        testSongLibraryIndexService();
        std::cout << "\nALL SPRINT 13 LOCAL DATABASE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Local Database unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
