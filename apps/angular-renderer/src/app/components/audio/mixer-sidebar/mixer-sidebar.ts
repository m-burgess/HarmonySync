import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../core/audio.service';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
import { VSCodeButtonComponent } from '../../vscode-ui/vscode-button/vscode-button.component';

@Component({
  selector: 'app-mixer-sidebar',
  standalone: true,
  imports: [CommonModule, VSCodePanelComponent, VSCodeButtonComponent],
  templateUrl: './mixer-sidebar.html',
  styleUrl: './mixer-sidebar.scss'
})
export class MixerSidebarComponent implements OnInit {
  audioService = inject(AudioService);

  ngOnInit() {
    // Initial state or subscriptions if needed
  }

  playAll() {
    this.audioService.play().subscribe();
  }

  stopAll() {
    this.audioService.stop().subscribe();
  }

  toggleMute(trackId: string) {
    this.audioService.toggleMute(trackId);
  }

  getTrackById(id: string) {
    return this.audioService.tracks().find(t => t.id === id);
  }
}
