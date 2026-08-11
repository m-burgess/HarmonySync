#include "SongMap.hpp"
#include <utility>

namespace HarmonySync::Core {

struct SongMap::Impl {
    std::string id;
    std::string title;
    std::string artist;
    std::string originalKey{"C"};
    std::string currentKey{"C"};
    double tempoBpm{120.0};
    std::vector<MediaStem> stems;
    std::string lyricsContent;
    std::string folderPath;
    std::string backgroundVideoPath;
    bool hasMap{false};

    Impl() = default;
    Impl(std::string id_, std::string title_, std::string artist_)
        : id(std::move(id_))
        , title(std::move(title_))
        , artist(std::move(artist_))
    {}
};

SongMap::SongMap()
    : m_impl(std::make_unique<Impl>())
{}

SongMap::SongMap(std::string songId, std::string title, std::string artist)
    : m_impl(std::make_unique<Impl>(std::move(songId), std::move(title), std::move(artist)))
{}

SongMap::~SongMap() = default;

SongMap::SongMap(const SongMap& other)
    : m_impl(std::make_unique<Impl>(*other.m_impl))
{}

SongMap& SongMap::operator=(const SongMap& other) {
    if (this != &other) {
        *m_impl = *other.m_impl;
    }
    return *this;
}

SongMap::SongMap(SongMap&& other) noexcept = default;

SongMap& SongMap::operator=(SongMap&& other) noexcept = default;

const std::string& SongMap::id() const noexcept {
    return m_impl->id;
}

const std::string& SongMap::title() const noexcept {
    return m_impl->title;
}

const std::string& SongMap::artist() const noexcept {
    return m_impl->artist;
}

const std::string& SongMap::originalKey() const noexcept {
    return m_impl->originalKey;
}

const std::string& SongMap::currentKey() const noexcept {
    return m_impl->currentKey;
}

double SongMap::tempoBpm() const noexcept {
    return m_impl->tempoBpm;
}

const std::vector<MediaStem>& SongMap::stems() const noexcept {
    return m_impl->stems;
}

const std::string& SongMap::lyricsContent() const noexcept {
    return m_impl->lyricsContent;
}

bool SongMap::hasSongMap() const noexcept {
    return m_impl->hasMap;
}

const std::string& SongMap::folderPath() const noexcept {
    return m_impl->folderPath;
}

const std::string& SongMap::backgroundVideoPath() const noexcept {
    return m_impl->backgroundVideoPath;
}

void SongMap::setKeys(std::string origKey, std::string curKey) {
    m_impl->originalKey = std::move(origKey);
    m_impl->currentKey = std::move(curKey);
}

void SongMap::setTempoBpm(double bpm) noexcept {
    m_impl->tempoBpm = bpm;
}

void SongMap::setLyricsContent(std::string lyrics) {
    m_impl->lyricsContent = std::move(lyrics);
}

void SongMap::setHasSongMap(bool hasMap) noexcept {
    m_impl->hasMap = hasMap;
}

void SongMap::setFolderPath(std::string path) {
    m_impl->folderPath = std::move(path);
}

void SongMap::setBackgroundVideoPath(std::string path) {
    m_impl->backgroundVideoPath = std::move(path);
}

void SongMap::addStem(MediaStem stem) {
    m_impl->stems.push_back(std::move(stem));
}

void SongMap::clearStems() noexcept {
    m_impl->stems.clear();
}

} // namespace HarmonySync::Core
