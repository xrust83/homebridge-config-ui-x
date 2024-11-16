import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'
import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-carbonmonoxidesensor',
  templateUrl: './carbonmonoxidesensor.component.html',
  styleUrls: ['./carbonmonoxidesensor.component.scss'],
})
export class CarbonmonoxidesensorComponent {
  @Input() public service: ServiceTypeX

  constructor() {}
}
