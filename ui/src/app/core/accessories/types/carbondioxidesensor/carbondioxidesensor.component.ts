import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'
import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-carbondioxidesensor',
  templateUrl: './carbondioxidesensor.component.html',
  styleUrls: ['./carbondioxidesensor.component.scss'],
})
export class CarbondioxidesensorComponent {
  @Input() public service: ServiceTypeX

  constructor() {}
}
