#include <napi.h>
#include "AudioEngine.h"

using namespace harmonysync;

class AudioEngineWrapper : public Napi::ObjectWrap<AudioEngineWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    AudioEngineWrapper(const Napi::CallbackInfo& info);
    ~AudioEngineWrapper();

private:
    static Napi::FunctionReference constructor;
    AudioEngine* engine;

    Napi::Value LoadTrack(const Napi::CallbackInfo& info);
    Napi::Value Play(const Napi::CallbackInfo& info);
    Napi::Value Pause(const Napi::CallbackInfo& info);
    Napi::Value Stop(const Napi::CallbackInfo& info);
    Napi::Value SetTrackVolume(const Napi::CallbackInfo& info);
    Napi::Value SetTrackPan(const Napi::CallbackInfo& info);
    Napi::Value SetTrackMute(const Napi::CallbackInfo& info);
    Napi::Value ClearAllTracks(const Napi::CallbackInfo& info);
};

Napi::FunctionReference AudioEngineWrapper::constructor;

Napi::Object AudioEngineWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "AudioEngine", {
        InstanceMethod("loadTrack", &AudioEngineWrapper::LoadTrack),
        InstanceMethod("play", &AudioEngineWrapper::Play),
        InstanceMethod("pause", &AudioEngineWrapper::Pause),
        InstanceMethod("stop", &AudioEngineWrapper::Stop),
        InstanceMethod("setTrackVolume", &AudioEngineWrapper::SetTrackVolume),
        InstanceMethod("setTrackPan", &AudioEngineWrapper::SetTrackPan),
        InstanceMethod("setTrackMute", &AudioEngineWrapper::SetTrackMute),
        InstanceMethod("clearAllTracks", &AudioEngineWrapper::ClearAllTracks),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("AudioEngine", func);
    return exports;
}

AudioEngineWrapper::AudioEngineWrapper(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioEngineWrapper>(info) {
    this->engine = new AudioEngine();
    this->engine->init();
}

AudioEngineWrapper::~AudioEngineWrapper() {
    delete this->engine;
}

Napi::Value AudioEngineWrapper::LoadTrack(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected trackId and filePath").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string id = info[0].As<Napi::String>();
    std::string path = info[1].As<Napi::String>();
    
    bool result = this->engine->loadTrack(id, path);
    return Napi::Boolean::New(env, result);
}

Napi::Value AudioEngineWrapper::Play(const Napi::CallbackInfo& info) {
    this->engine->play();
    return info.Env().Undefined();
}

Napi::Value AudioEngineWrapper::Pause(const Napi::CallbackInfo& info) {
    this->engine->pause();
    return info.Env().Undefined();
}

Napi::Value AudioEngineWrapper::Stop(const Napi::CallbackInfo& info) {
    this->engine->stop();
    return info.Env().Undefined();
}

Napi::Value AudioEngineWrapper::SetTrackVolume(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected trackId and volume").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string id = info[0].As<Napi::String>();
    float volume = info[1].As<Napi::Number>().FloatValue();
    this->engine->setTrackVolume(id, volume);
    return env.Undefined();
}

Napi::Value AudioEngineWrapper::SetTrackPan(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected trackId and pan").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string id = info[0].As<Napi::String>();
    float pan = info[1].As<Napi::Number>().FloatValue();
    this->engine->setTrackPan(id, pan);
    return env.Undefined();
}

Napi::Value AudioEngineWrapper::SetTrackMute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBoolean()) {
        Napi::TypeError::New(env, "Expected trackId and muted").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string id = info[0].As<Napi::String>();
    bool muted = info[1].As<Napi::Boolean>().Value();
    this->engine->setTrackMute(id, muted);
    return env.Undefined();
}

Napi::Value AudioEngineWrapper::ClearAllTracks(const Napi::CallbackInfo& info) {
    this->engine->clearAllTracks();
    return info.Env().Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    AudioEngineWrapper::Init(env, exports);
    return exports;
}

NODE_API_MODULE(harmonysync_audio_native, Init)
