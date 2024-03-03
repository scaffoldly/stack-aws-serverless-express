import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Observable, Subject, filter, first, map } from 'rxjs';
import { StackService } from '../../lib/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private count = new Subject<number>();

  title = 'web';

  count$ = this.count.asObservable();

  openApiDocs$: Observable<string>;

  constructor(private stackService: StackService) {
    this.openApiDocs$ = this.stackService
      .health()
      .pipe(map((health) => health.hrefs.openApiDocs));
  }

  ngOnInit(): void {
    this.stackService
      .getCount()
      .pipe(
        first(),
        filter((count) => !!count),
        map((count) => {
          this.count.next(count.count);
        }),
      )
      .subscribe();
  }

  increment(): void {
    this.stackService
      .incrementCount()
      .pipe(map((count) => this.count.next(count.count)))
      .subscribe();
  }
}
