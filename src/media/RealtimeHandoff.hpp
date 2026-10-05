#ifndef HARMONYSYNC_REALTIME_HANDOFF_HPP
#define HARMONYSYNC_REALTIME_HANDOFF_HPP

#include <atomic>
#include <cstddef>
#include <utility>

namespace HarmonySync::Media {

/**
 * @brief Lock-free handoff of a heavy object (a song's mapped stem buffers) from the
 * control thread to a real-time consumer (the audio callback) (#177).
 *
 * Single producer (control thread), single consumer (audio thread).
 *
 * Control thread only: publish(), resetCurrent(), clear(), reclaimRetired(), latest(), hasPending().
 * Audio thread only:   acquirePending(), current().
 *
 * The consumer never allocates, frees, or blocks: acquirePending() swaps the published value in
 * with atomic exchanges and pushes the old value onto a retired list. Retired values are
 * destroyed later on the control thread by reclaimRetired(), so a set the audio thread may still
 * be reading is never freed under it.
 */
template <typename T>
class RealtimeHandoff {
public:
    RealtimeHandoff() = default;
    ~RealtimeHandoff() { destroyAll(); }

    RealtimeHandoff(const RealtimeHandoff&) = delete;
    RealtimeHandoff& operator=(const RealtimeHandoff&) = delete;
    RealtimeHandoff(RealtimeHandoff&&) = delete;
    RealtimeHandoff& operator=(RealtimeHandoff&&) = delete;

    /**
     * @brief Control thread: stage a fully built value for the consumer to take on its next pass.
     * A value published earlier that the consumer has not taken yet is destroyed here; the
     * consumer never saw it, so that is safe.
     */
    void publish(T value) {
        Node* node = new Node{std::move(value), nullptr};
        Node* stale = m_pending.exchange(node, std::memory_order_acq_rel);
        delete stale;
        m_latest = node;
    }

    /**
     * @brief Audio thread: if a value was published, make it current and retire the old one.
     * Never allocates or frees. Returns true when a new value became current.
     */
    bool acquirePending() noexcept {
        if (m_pending.load(std::memory_order_acquire) == nullptr) {
            return false;
        }
        Node* next = m_pending.exchange(nullptr, std::memory_order_acq_rel);
        if (next == nullptr) {
            return false;
        }
        Node* old = m_current.exchange(next, std::memory_order_acq_rel);
        if (old != nullptr) {
            pushRetired(old);
        }
        return true;
    }

    /** @brief Audio thread: the value currently being played, or nullptr. */
    [[nodiscard]] T* current() noexcept {
        Node* node = m_current.load(std::memory_order_acquire);
        return node != nullptr ? &node->value : nullptr;
    }

    /**
     * @brief Control thread: destroy values the consumer has let go of.
     * Returns how many were destroyed.
     */
    std::size_t reclaimRetired() noexcept {
        return destroyChain(m_retired.exchange(nullptr, std::memory_order_acquire));
    }

    /**
     * @brief Control thread, ONLY while the consumer is not running (e.g. audio sink stopped):
     * replace everything with @p value as the current set.
     */
    void resetCurrent(T value) {
        destroyAll();
        Node* node = new Node{std::move(value), nullptr};
        m_current.store(node, std::memory_order_release);
        m_latest = node;
    }

    /** @brief Control thread, ONLY while the consumer is not running: drop everything. */
    void clear() noexcept {
        destroyAll();
    }

    /** @brief Control thread: true while a published value has not been taken yet. */
    [[nodiscard]] bool hasPending() const noexcept {
        return m_pending.load(std::memory_order_acquire) != nullptr;
    }

    /**
     * @brief Control thread: the most recently published or reset value (pending or current).
     * Stays valid until the next publish()/resetCurrent()/clear() on the control thread.
     */
    [[nodiscard]] T* latest() noexcept {
        return m_latest != nullptr ? &m_latest->value : nullptr;
    }

private:
    struct Node {
        T value;
        Node* next;
    };

    void pushRetired(Node* node) noexcept {
        Node* head = m_retired.load(std::memory_order_relaxed);
        do {
            node->next = head;
        } while (!m_retired.compare_exchange_weak(head, node,
                                                  std::memory_order_release,
                                                  std::memory_order_relaxed));
    }

    static std::size_t destroyChain(Node* node) noexcept {
        std::size_t count = 0;
        while (node != nullptr) {
            Node* next = node->next;
            delete node;
            node = next;
            ++count;
        }
        return count;
    }

    void destroyAll() noexcept {
        delete m_pending.exchange(nullptr, std::memory_order_acq_rel);
        delete m_current.exchange(nullptr, std::memory_order_acq_rel);
        destroyChain(m_retired.exchange(nullptr, std::memory_order_acquire));
        m_latest = nullptr;
    }

    std::atomic<Node*> m_pending{nullptr};
    std::atomic<Node*> m_current{nullptr};
    std::atomic<Node*> m_retired{nullptr};
    Node* m_latest{nullptr}; // control thread only
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_REALTIME_HANDOFF_HPP
