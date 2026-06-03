import { Directive, ElementRef, HostListener, AfterViewInit } from '@angular/core';

@Directive({
  selector: 'textarea[autoGrow]',
  standalone: true,
})
export class AutoGrowDirective implements AfterViewInit {
  constructor(private readonly el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    // Defer so ngModel has time to populate the value before measuring
    setTimeout(() => this.adjust());
  }

  @HostListener('input')
  adjust(): void {
    const el = this.el.nativeElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
}
