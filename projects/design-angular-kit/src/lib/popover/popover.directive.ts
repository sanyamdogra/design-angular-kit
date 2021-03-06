/**
 * @license
 * Copyright Angular ng-bootstrap team All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://raw.githubusercontent.com/ng-bootstrap/ng-bootstrap/master/LICENSE
 */
import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  Injector,
  Renderer2,
  ComponentRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  ComponentFactoryResolver,
  NgZone,
  SimpleChanges,
} from '@angular/core';

import { listenToTriggers } from './triggers';
import { positionElements, Placement, PlacementArray } from './positioning';
import { PopupService } from './popup';
import { PopoverConfig } from './popover.config';
import { PopoverComponent } from './popover.component';
import { Subscription } from 'rxjs';
import { POPOVER_TRIGGERS, PopoverTrigger } from '../models/InteractionTrigger';
import { Util } from '../util/util';

let identifier = 0;

/**
 * Una direttiva per la creazione di un popover.
 */
@Directive({
  selector: '[it-popover]', // tslint:disable-line
  exportAs: 'it-popover'
})
export class PopoverDirective implements OnInit, OnDestroy, OnChanges {
  /**
   * Contenuto da mostrare nel popover. In assenza di titolo e contenuto, il popover non si aprirà.
   */
  @Input('it-popover')
  get itPopover(): string | TemplateRef<any> { return this._itPopover; }
  set itPopover(value: string | TemplateRef<any>) { this._itPopover = value; }
  private _itPopover: string | TemplateRef<any>;

  /**
   * Titolo del popover. In assenza di titolo e contenuto, il popover non si aprirà.
   */
  @Input()
  get title(): string { return this._title; }
  set title(value: string) { this._title = value; }
  private _title: string;

  /**
   * Il collocamento accettato dal popover:
   *    "top", "top-left", "top-right", "bottom", "bottom-left", "bottom-right",
   *    "left", "left-top", "left-bottom", "right", "right-top", "right-bottom"
   * ed array dei valori soprariportati.
   */
  @Input()
  get placement(): PlacementArray { return this._placement; }
  set placement(value: PlacementArray) { this._placement = value; }
  private _placement: PlacementArray;

  /**
   * Specifica gli eventi che dovrebbero innescare il popover. Supporta una lista con nomi di eventi separati da spazi.
   */
  @Input()
  get triggers(): any {
    return this._triggers;
  }
  set triggers(value: any) {
    if (PopoverTrigger.is(value)) {
      this._triggers = value;
    } else {
      this._triggers = POPOVER_TRIGGERS.CLICK;
    }
  }
  private _triggers;

  /**
   * Un selettore che specifica l'elemento in cui il popover dovrebbe essere aggiunto.
   * Attualmente supporta solo "body".
   */
  @Input()
  get container(): string { return this._container; }
  set container(value: string) { this._container = value; }
  private _container: string;

  /**
   * Evento da emettere quando il popover sta per essere mostrato
   */
  @Output('show')
  get showEvent(): EventEmitter<PopoverDirective> { return this._showEvent; }
  set showEvent(value: EventEmitter<PopoverDirective>) { this._showEvent = value; }
  private _showEvent = new EventEmitter<PopoverDirective>();

  /**
   * Evento da emettere quando il popover è mostrato
   */
  @Output('shown')
  get shownEvent(): EventEmitter<PopoverDirective> { return this._shownEvent; }
  set shownEvent(value: EventEmitter<PopoverDirective>) { this._shownEvent = value; }
  private _shownEvent = new EventEmitter<PopoverDirective>();

  /**
   * Evento da emettere quando il popover viene inserito nel DOM
   */
  @Output('inserted')
  get insertedEvent(): EventEmitter<PopoverDirective> { return this._insertedEvent; }
  set insertedEvent(value: EventEmitter<PopoverDirective>) { this._insertedEvent = value; }
  private _insertedEvent = new EventEmitter<PopoverDirective>();

  /**
   * Evento da emettere quando il popover sta per essere nascosto
   */
  @Output('hide')
  get hideEvent(): EventEmitter<PopoverDirective> { return this._hideEvent; }
  set hideEvent(value: EventEmitter<PopoverDirective>) { this._hideEvent = value; }
  private _hideEvent = new EventEmitter<PopoverDirective>();

  /**
   * Evento da emettere quando il popover è nascosto
   */
  @Output('hidden')
  get hiddenEvent(): EventEmitter<PopoverDirective> { return this._hiddenEvent; }
  set hiddenEvent(value: EventEmitter<PopoverDirective>) { this._hiddenEvent = value; }
  private _hiddenEvent = new EventEmitter<PopoverDirective>();

  /**
   * Un flag utilizzato per indicare se un popover è disabilitato, così da non doverlo mostrare.
   */
  @Input('disabled')
  get disablePopover(): boolean { return this._disablePopover; }
  set disablePopover(value: boolean) { this._disablePopover = Util.coerceBooleanProperty(value); }
  private _disablePopover = false;

  private _itPopoverWindowId = `it-popover-${identifier++}`;
  private _popupService: PopupService<PopoverComponent>;
  private _windowRef: ComponentRef<PopoverComponent>;
  private _unregisterListenersFn;
  private _zoneSubscription: Subscription;
  private _isDisabled(): boolean {
    if (this.disablePopover) {
      return true;
    }
    if (!this.itPopover && !this.title) {
      return true;
    }
    return false;
  }

  constructor(
      private _elementRef: ElementRef<HTMLElement>,
      private _renderer: Renderer2,
      injector: Injector,
      componentFactoryResolver: ComponentFactoryResolver,
      viewContainerRef: ViewContainerRef,
      config: PopoverConfig,
      ngZone: NgZone
  ) {
    this.placement = config.placement;
    this.triggers = config.triggers;
    this.container = config.container;
    this.disablePopover = config.disablePopover;
    this._popupService = new PopupService<PopoverComponent>(
      PopoverComponent, injector, viewContainerRef, _renderer, componentFactoryResolver);

    this._zoneSubscription = ngZone.onStable.subscribe(() => {
      if (this._windowRef) {
        this._windowRef.instance.applyPlacement(
          positionElements(
            this._elementRef.nativeElement, this._windowRef.location.nativeElement,
            this.placement, this.container === 'body'
          )
        );
      }
    });
  }

  /**
   * Apre il popover di un elemento. È considerato un azionamento "manuale" del popover.
   * Il context è un valore opzionale da iniettare nel template del popover quando esso viene creato.
   */
  show(context?: any) {
    if (!this._isDisabled()) {
      // Scatena l'evento per segnalare l'inizio del processo per visualizzare il popover
      this.showEvent.emit(this);

      if (!this._windowRef) {
        this._windowRef = this._popupService.open(this.itPopover, context);

        const popoverComponent = this._windowRef.instance;
        popoverComponent.title = this.title;
        popoverComponent.id = this._itPopoverWindowId;

        this._renderer.setAttribute(this._elementRef.nativeElement, 'aria-describedby', this._itPopoverWindowId);

        if (this.container === 'body') {
          window.document.querySelector(this.container).appendChild(this._windowRef.location.nativeElement);
        }

        this._windowRef.changeDetectorRef.detectChanges();
        this._windowRef.changeDetectorRef.markForCheck();

        // Posiziona il popover attorno all'elemento
        popoverComponent.applyPlacement(
          positionElements(
            this._elementRef.nativeElement, this._windowRef.location.nativeElement,
            this.placement, this.container === 'body'
          )
        );

        // Scatena l'evento per segnalare l'inserimento nel DOM
        this.insertedEvent.emit(this);
      } else {
        const popoverComponent = this._windowRef.instance;
        popoverComponent.hidden = false;
      }

      // Scatena l'evento per segnalare che il popover è stato visualizzato
      this.shownEvent.emit(this);
    }
  }

  /**
   * Chiude il popover di un elemento. È considerato un azionamento "manuale" del popover.
   */
  hide() {
    // Scatena l'evento per segnalare l'inizio del processo per nascondere il popover
    this.hideEvent.emit(this);
    if (this._windowRef) {
      const popoverComponent = this._windowRef.instance;
      popoverComponent.hidden = true;

      // Scatena l'evento per segnalare che il popover è stato nascosto
      this.hiddenEvent.emit(this);
    }
  }

  /**
   * Apre/chiude il un popover di un elemento. È considerato un azionamento "manuale" del popover.
   */
  toggle() {
    if (this._windowRef) {
      if (this._windowRef.instance.hidden) {
        this.show();
      } else {
        this.hide();
      }
    } else {
      this.show();
    }
  }

  /**
   * Nasconde e distrugge il popover di un elemento.
   */
  dispose() {
    const isShown = this._windowRef ? !this._windowRef.instance.hidden : false;
    if (isShown) {
      this.hide();
    }

    if (this._windowRef) {
      this._renderer.removeAttribute(this._elementRef.nativeElement, 'aria-describedby');
      this._popupService.close();
      this._windowRef = null;
    }
  }

  /**
   * Fornisce al popover di un elemento la possibilità di essere mostrato.
   */
  enable() {
    if (this._isDisabled()) {
      this.disablePopover = false;
    }
  }

  /**
   * Rimuove la capacità di mostrare il popover di un elemento.
   */
  disable() {
    if (!this._isDisabled()) {
      this.disablePopover = true;
    }
  }

  /**
   * Attiva/disattiva la possibilità che il popover di un elemento sia mostrato o nascosto.
   */
  toggleEnabled() {
    if (this._isDisabled()) {
      this.enable();
    } else {
      this.disable();
    }
  }

  ngOnInit() {
    this._unregisterListenersFn = listenToTriggers(
      this._renderer, this._elementRef.nativeElement, this.triggers,
      this.show.bind(this), this.hide.bind(this), this.toggle.bind(this)
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    // Chiude il popover se titolo e contenuti risultano vuoti, o se disablePopover è impostato a vero
    if (changes['itPopover'] || changes['title'] || changes['disablePopover']) {
      if (this._windowRef) {
        const isShown = !this._windowRef.instance.hidden;
        if (changes['itPopover']) {
          this._windowRef.instance.setNewContent(this.itPopover);
          this._windowRef.changeDetectorRef.detectChanges();
          this._windowRef.changeDetectorRef.markForCheck();
        }
        if (changes['title']) {
          this._windowRef.instance.title = this.title;
        }


        if (isShown) {
          if (!this._isDisabled()) {
            this.show();
          } else {
            this.hide();
          }
        }
      }
    } else if (changes['placement']) {
      if (this._windowRef) {
        this._windowRef.instance.applyPlacement(
          positionElements(
            this._elementRef.nativeElement, this._windowRef.location.nativeElement,
            this.placement, this.container === 'body'
          )
        );
      }
    } else if (changes['container']) {
      const isShown = this._windowRef ? !this._windowRef.instance.hidden : false;
      this.dispose();
      if (isShown) {
        this.show();
      }
    } else if (changes['triggers']) {
      this.dispose();

      const triggersChangers = changes['triggers'];
      if (triggersChangers.previousValue !== triggersChangers.currentValue && !triggersChangers.firstChange) {
        this._unregisterListenersFn();
        this._unregisterListenersFn = listenToTriggers(
          this._renderer, this._elementRef.nativeElement, this.triggers,
          this.show.bind(this), this.hide.bind(this), this.toggle.bind(this)
        );
      }
    }
  }

  ngOnDestroy() {
    this.dispose();
    this._unregisterListenersFn();
    this._zoneSubscription.unsubscribe();
  }

}
