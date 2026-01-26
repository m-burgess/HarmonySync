/**
 * Slide Service - Business logic for slide operations
 * 
 * This service abstracts slide-related functionality including:
 * - Loading and managing slides
 * - Importing slides from various sources
 * - Displaying slides on different outputs
 * 
 * OOP Principles:
 * - Encapsulation: Private IPC service
 * - Single Responsibility: Only handles slide operations
 * - Dependency Injection: Depends on IpcService abstraction
 * - Interface Segregation: Implements ISlideService
 */

import { BaseService } from '../base/BaseService';
import type { ISlideService, IIpcService } from '../types/services';
import type { Slide } from '../types';

/**
 * Slide Service Implementation
 */
export class SlideService extends BaseService implements ISlideService {
  protected readonly serviceName = 'SlideService';
  
  private readonly ipc: IIpcService;

  /**
   * Constructor
   * @param ipcService - IPC service for communication
   */
  constructor(ipcService: IIpcService) {
    super();
    this.ipc = ipcService;
  }

  /**
   * Load slides from a folder
   * @param folderPath - Path to folder containing slides
   * @returns Array of slides
   */
  public async loadSlides(folderPath: string): Promise<Slide[]> {
    try {
      return await this.ipc.invoke('slides:loadSlides', folderPath) as Slide[];
    } catch (error) {
      return this.handleError('loadSlides', error);
    }
  }

  /**
   * Import a slide from content
   * @param content - Slide content
   * @returns Imported slide
   */
  public async importSlide(content: string): Promise<Slide> {
    try {
      return await this.ipc.invoke('slides:importSlide', content) as Slide;
    } catch (error) {
      return this.handleError('importSlide', error);
    }
  }

  /**
   * Save a slide
   * @param slide - Slide to save
   */
  public async saveSlide(slide: Slide): Promise<void> {
    try {
      await this.ipc.invoke('slides:saveSlide', slide);
    } catch (error) {
      return this.handleError('saveSlide', error);
    }
  }

  /**
   * Delete a slide
   * @param slideId - Slide ID
   */
  public async deleteSlide(slideId: string): Promise<void> {
    try {
      await this.ipc.invoke('slides:deleteSlide', slideId);
    } catch (error) {
      return this.handleError('deleteSlide', error);
    }
  }

  /**
   * Reorder slides
   * @param slideIds - Array of slide IDs in new order
   */
  public async reorderSlides(slideIds: string[]): Promise<void> {
    try {
      await this.ipc.invoke('slides:reorderSlides', slideIds);
    } catch (error) {
      return this.handleError('reorderSlides', error);
    }
  }

  /**
   * Display a slide on a specific display
   * @param slideId - Slide ID
   * @param displayId - Display ID
   */
  public async displaySlide(slideId: string, displayId: string): Promise<void> {
    try {
      await this.ipc.invoke('slides:displaySlide', slideId, displayId);
    } catch (error) {
      return this.handleError('displaySlide', error);
    }
  }

  /**
   * Clear display
   * @param displayId - Display ID
   */
  public async clearDisplay(displayId: string): Promise<void> {
    try {
      await this.ipc.invoke('slides:clearDisplay', displayId);
    } catch (error) {
      return this.handleError('clearDisplay', error);
    }
  }
}

export default SlideService;
