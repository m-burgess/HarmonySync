package events

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type EventBus struct {
	clients   map[*websocket.Conn]bool
	broadcast chan interface{}
	mu        sync.Mutex
}

func NewEventBus() *EventBus {
	eb := &EventBus{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan interface{}),
	}
	go eb.run()
	return eb
}

func (eb *EventBus) run() {
	for {
		msg := <-eb.broadcast
		eb.mu.Lock()
		for client := range eb.clients {
			// Write JSON message
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("Websocket error: %v", err)
				client.Close()
				delete(eb.clients, client)
			}
		}
		eb.mu.Unlock()
	}
}

func (eb *EventBus) Register(conn *websocket.Conn) {
	eb.mu.Lock()
	eb.clients[conn] = true
	eb.mu.Unlock()
}

func (eb *EventBus) Unregister(conn *websocket.Conn) {
	eb.mu.Lock()
	if _, ok := eb.clients[conn]; ok {
		delete(eb.clients, conn)
		conn.Close()
	}
	eb.mu.Unlock()
}

func (eb *EventBus) Broadcast(msg interface{}) {
	eb.broadcast <- msg
}
