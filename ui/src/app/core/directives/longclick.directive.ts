/* global NodeJS */
import { Directive, HostListener, Input, OnDestroy, output } from '@angular/core'

@Directive({
  selector: '[appLongclick]',
  standalone: true,
})
export class LongClickDirective implements OnDestroy {
  @Input() public duration = 350
  public readonly longclick = output<MouseEvent | TouchEvent>()
  public readonly shortclick = output<MouseEvent | KeyboardEvent | TouchEvent>()

  private downTimeout: NodeJS.Timeout
  private done = false

  constructor() {}

  @HostListener('keyup.enter', ['$event'])
  public onEnter(event: KeyboardEvent) {
    this.shortclick.emit(event)
  }

  @HostListener('mouseup', ['$event'])
  public onMouseUp(event: MouseEvent): void {
    clearTimeout(this.downTimeout)
    if (!this.done) {
      this.done = true
      this.shortclick.emit(event)
    }
  }

  @HostListener('touchend', ['$event'])
  public onTouchEnd(event: TouchEvent): void {
    clearTimeout(this.downTimeout)
    event.preventDefault()
    event.stopPropagation()
    if (!this.done) {
      this.done = true
      this.shortclick.emit(event)
    }
  }

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  public onMouseDown(event: MouseEvent | TouchEvent): void {
    // Check for the left mouse button (button 0) in case of mouse event
    if (event instanceof MouseEvent && event.button !== 0) {
      return
    }
    this.done = false
    event.preventDefault()
    event.stopPropagation()
    this.downTimeout = setTimeout(() => {
      if (!this.done) {
        this.done = true
        this.longclick.emit(event)
      }
    }, this.duration)
  }

  @HostListener('mousemove', ['$event'])
  @HostListener('touchmove', ['$event'])
  public onMouseMove(): void {
    this.done = true
    clearTimeout(this.downTimeout)
  }

  ngOnDestroy() {
    clearTimeout(this.downTimeout)
  }
}
