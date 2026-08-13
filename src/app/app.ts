import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

@Component({
  selector: 'th-root',
  standalone: true,
  imports: [RouterOutlet, MainLayoutComponent],
  template: `<th-main-layout><router-outlet></router-outlet></th-main-layout>`,
})
export class App {}
