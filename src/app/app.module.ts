import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DesignAngularKitModule } from 'projects/design-angular-kit/src/public_api';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TableOfContentComponent } from './table-of-content/table-of-content.component';
import { TableOfContentItemComponent } from './table-of-content-item/table-of-content-item.component';
import { RouterDispatcherComponent } from './router-dispatcher/router-dispatcher.component';
import { SharedModule } from './shared/shared.module';
import { LinkSortPipe } from './link-sort.pipe';

@NgModule({
  declarations: [
    AppComponent,
    TableOfContentComponent,
    TableOfContentItemComponent,
    RouterDispatcherComponent,
    LinkSortPipe
  ],
  imports: [
    BrowserModule,
    DesignAngularKitModule,
    AppRoutingModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
