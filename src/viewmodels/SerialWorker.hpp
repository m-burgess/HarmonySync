#ifndef HARMONYSYNC_SERIAL_WORKER_HPP
#define HARMONYSYNC_SERIAL_WORKER_HPP

#include <condition_variable>
#include <deque>
#include <functional>
#include <mutex>
#include <thread>

namespace HarmonySync::ViewModels {

/**
 * @brief One background thread that runs posted tasks in order, one at a time (#177).
 * Owned by a view model so slow disk work never runs on the UI thread. Tasks must not
 * touch the view model; they hand results back through the owner's own guard.
 * The thread starts on the first post and is joined by stop() or the destructor.
 */
class SerialWorker {
public:
    enum class OnStop { DropQueued, RunQueued };

    explicit SerialWorker(OnStop onStop = OnStop::DropQueued)
        : m_onStop(onStop) {}
    ~SerialWorker() { stop(); }

    SerialWorker(const SerialWorker&) = delete;
    SerialWorker& operator=(const SerialWorker&) = delete;

    void post(std::function<void()> task) {
        std::lock_guard lock(m_mutex);
        if (m_stopping) {
            return;
        }
        m_tasks.push_back(std::move(task));
        if (!m_thread.joinable()) {
            m_thread = std::thread([this] { run(); });
        }
        m_cv.notify_one();
    }

    /// Waits for the running task (and, with RunQueued, the queued ones), then joins.
    void stop() {
        {
            std::lock_guard lock(m_mutex);
            m_stopping = true;
            if (m_onStop == OnStop::DropQueued) {
                m_tasks.clear();
            }
        }
        m_cv.notify_one();
        if (m_thread.joinable()) {
            m_thread.join();
        }
    }

private:
    void run() {
        for (;;) {
            std::function<void()> task;
            {
                std::unique_lock lock(m_mutex);
                m_cv.wait(lock, [this] { return m_stopping || !m_tasks.empty(); });
                if (m_tasks.empty()) {
                    return; // stopping and nothing left
                }
                task = std::move(m_tasks.front());
                m_tasks.pop_front();
            }
            task();
        }
    }

    const OnStop m_onStop;
    std::mutex m_mutex;
    std::condition_variable m_cv;
    std::deque<std::function<void()>> m_tasks;
    bool m_stopping{false};
    std::thread m_thread;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_SERIAL_WORKER_HPP
