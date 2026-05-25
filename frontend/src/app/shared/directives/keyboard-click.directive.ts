import { Directive, HostListener } from '@angular/core';

/**
 * Keyboard equivalent for click handlers on non-native interactive elements.
 * Listens for Enter and Space and invokes `.click()` on the host element.
 *
 * When used for actions (not modal backdrops), the host should also have:
 * `tabindex="0"` and `role="button"`.
 */
@Directive({
  selector: '[appKeyboardClick]',
  standalone: true,
})
export class KeyboardClickDirective {
  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onKeydown(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    keyEvent.preventDefault();
    (keyEvent.currentTarget as HTMLElement).click();
  }
}
