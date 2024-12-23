import { Component, inject, Input, OnInit } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
  templateUrl: './plugin-info.component.html',
  styleUrls: ['./plugin-info.component.scss'],
  standalone: true,
  imports: [TranslatePipe],
})
export class PluginInfoComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)

  @Input() plugin: any

  public defaultIcon = 'assets/hb-icon.png'

  constructor() {}

  ngOnInit() {
    if (!this.plugin.icon) {
      this.plugin.icon = this.defaultIcon
    }
  }

  handleIconError() {
    this.plugin.icon = this.defaultIcon
  }
}
