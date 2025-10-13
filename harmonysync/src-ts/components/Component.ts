/**
 * Base Component class for creating vanilla TypeScript components
 * Inspired by VS Code's component architecture
 */

export interface ComponentOptions {
  className?: string;
  id?: string;
  parent?: HTMLElement;
}

export abstract class Component<T extends HTMLElement = HTMLElement> {
  protected element: T;
  protected disposed: boolean = false;
  private listeners: Array<{ target: any; type: string; handler: EventListener }> = [];

  constructor(tagName: string, options: ComponentOptions = {}) {
    this.element = document.createElement(tagName) as T;
    
    if (options.className) {
      this.element.className = options.className;
    }
    
    if (options.id) {
      this.element.id = options.id;
    }
    
    if (options.parent) {
      options.parent.appendChild(this.element);
    }
  }

  /**
   * Get the root DOM element of this component
   */
  getElement(): T {
    return this.element;
  }

  /**
   * Append this component to a parent element
   */
  appendTo(parent: HTMLElement): void {
    parent.appendChild(this.element);
  }

  /**
   * Remove this component from its parent
   */
  remove(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }

  /**
   * Add an event listener and track it for cleanup
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window | Document,
    type: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
  ): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener);
    this.listeners.push({ target, type, handler: listener });
  }

  /**
   * Set the inner HTML of the element
   */
  protected setHTML(html: string): void {
    this.element.innerHTML = html;
  }

  /**
   * Set text content of the element
   */
  protected setText(text: string): void {
    this.element.textContent = text;
  }

  /**
   * Add a CSS class to the element
   */
  protected addClass(...classes: string[]): void {
    this.element.classList.add(...classes);
  }

  /**
   * Remove a CSS class from the element
   */
  protected removeClass(...classes: string[]): void {
    this.element.classList.remove(...classes);
  }

  /**
   * Toggle a CSS class on the element
   */
  protected toggleClass(className: string, force?: boolean): void {
    this.element.classList.toggle(className, force);
  }

  /**
   * Set an attribute on the element
   */
  protected setAttribute(name: string, value: string): void {
    this.element.setAttribute(name, value);
  }

  /**
   * Abstract render method that subclasses must implement
   */
  abstract render(): void;

  /**
   * Dispose of this component and clean up resources
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    // Remove all event listeners
    this.listeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.listeners = [];

    // Remove from DOM
    this.remove();

    this.disposed = true;
  }
}
