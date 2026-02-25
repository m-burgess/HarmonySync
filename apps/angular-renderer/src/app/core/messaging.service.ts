import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EventType, EventPayload } from '../models/messaging.models';

interface Message {
    type: EventType;
    payload: EventPayload;
}

@Injectable({
    providedIn: 'root'
})
export class MessagingService implements OnDestroy {
    private readonly bus$ = new Subject<Message>();

    /**
     * Publish an event to the message bus
     * @param type - Event type
     * @param payload - Optional payload
     */
    publish<T = EventPayload>(type: EventType, payload?: T): void {
        this.bus$.next({ type, payload });
    }

    /**
     * Subscribe to a specific event type
     * @param type - Event type to listen for
     * @returns Observable of the event payload
     */
    subscribe<T = EventPayload>(type: EventType): Observable<T> {
        return this.bus$.asObservable().pipe(
            filter(msg => msg.type === type),
            map(msg => msg.payload as T)
        );
    }

    /**
     * Listen for an event once and then auto-unsubscribe
     * @param type - Event type
     * @param callback - Callback function
     */
    once<T = EventPayload>(type: EventType, callback: (payload: T) => void): Subscription {
        const subscription = this.subscribe<T>(type).subscribe(payload => {
            callback(payload);
            subscription.unsubscribe();
        });
        return subscription;
    }

    ngOnDestroy(): void {
        this.bus$.complete();
    }
}
