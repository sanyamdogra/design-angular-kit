import { Directive, Output, EventEmitter, Input, OnChanges, ElementRef, SimpleChanges, OnInit, Renderer2} from '@angular/core';
import { AnimationBuilder, style, animate, AnimationPlayer } from '@angular/animations';

const CLASS_ATTRIBUTE = 'class';
const HIDDEN_STATE = 'collapse';
const COLLAPSING_STATE = 'collapsing';
const SHOWN_STATE = `${HIDDEN_STATE} show`;
const ANIMATION_STYLE = '.35s ease';

/**
 * Per ottimizzare l’ingombro dei contenuti di una pagina si possono usare degli elementi richiudibili
 * (in gergo definiti collassabili o collapse), che possono essere attivati indipendentemente l’uno dall’altro
 */
@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[it-collapse]',
  exportAs: 'it-collapse'
})
export class CollapseDirective implements OnInit, OnChanges {

  private _player: AnimationPlayer;
  private _isDisposed = false;

  /**
   * La direttiva di collapse che opzionalmente contiene il predicato che ne stabilisce
   * che sarà avvalorato a true quando il collapse è espanso, a false altrimenti
   */
  @Input('it-collapse')
  get itCollapse(): boolean { return this._isShown; }
  set itCollapse(value: boolean) { this._isShown = value != null && `${value}` === 'true'; }
  private _isShown = false;

  /**
   * Evento da emettere quando il collapse sta per essere mostrato
   */
  @Output('show')
  get showEvent(): EventEmitter<CollapseDirective> { return this._showEvent; }
  set showEvent(value: EventEmitter<CollapseDirective>) { this._showEvent = value; }
  private _showEvent = new EventEmitter<CollapseDirective>();

  /**
   * Evento da emettere quando il collapse è mostrato
   */
  @Output('shown')
  get shownEvent(): EventEmitter<CollapseDirective> { return this._shownEvent; }
  set shownEvent(value: EventEmitter<CollapseDirective>) { this._shownEvent = value; }
  private _shownEvent = new EventEmitter<CollapseDirective>();

  /**
   * Evento da emettere quando il collapse sta per essere nascosto
   */
  @Output('hide')
  get hideEvent(): EventEmitter<CollapseDirective> { return this._hideEvent; }
  set hideEvent(value: EventEmitter<CollapseDirective>) { this._hideEvent = value; }
  private _hideEvent = new EventEmitter<CollapseDirective>();

  /**
   * Evento da emettere quando il collapse è nascosto
   */
  @Output('hidden')
  get hiddenEvent(): EventEmitter<CollapseDirective> { return this._hiddenEvent; }
  set hiddenEvent(value: EventEmitter<CollapseDirective>) { this._hiddenEvent = value; }
  private _hiddenEvent = new EventEmitter<CollapseDirective>();

  show() {
    this.showEvent.emit(this);
    this._animate(true);
  }

  hide() {
    this.hideEvent.emit(this);
    if (!this._isDisposed) {
      this._animate(false);
    }
  }

  toggle() {
    if (!this.isShown()) {
      this.show();
    } else {
      this.hide();
    }
  }

  dispose() {
    this._isDisposed = true;
  }

  isShown() {
    return this._isShown;
  }

  constructor(private _elementRef: ElementRef, private _animationBuilder: AnimationBuilder, private _renderer: Renderer2) { }

  ngOnInit() {
    this.ngOnChanges(undefined);
  }

  ngOnChanges(changes: SimpleChanges) {
    const state = this._isShown ? SHOWN_STATE : HIDDEN_STATE;
    this._renderer.setAttribute(this._elementRef.nativeElement, CLASS_ATTRIBUTE, state);
  }

  private _animate(isOpening: boolean) {
    const nativeElement = this._elementRef.nativeElement as HTMLDivElement;
    if (this._player) {
      this._player.destroy();
    }

    if (isOpening) {
      // Usato per permettere l'animazione in apertura senza calcoli aggiuntivi
      this._renderer.setAttribute(nativeElement, CLASS_ATTRIBUTE, SHOWN_STATE);
    }

    const metadata = isOpening ? [
      style({ height: 0, position: 'relative', overflow: 'hidden' }),
      animate(ANIMATION_STYLE, style({ height: '*' }))
    ] : [
      style({ height: '*', position: 'relative', overflow: 'hidden' }),
      animate(ANIMATION_STYLE, style({ height: 0 }))
    ];

    const factory = this._animationBuilder.build(metadata);
    this._player = factory.create(nativeElement);
    this._player.onStart(() => {
      this._renderer.setAttribute(nativeElement, CLASS_ATTRIBUTE, COLLAPSING_STATE);
    });
    this._player.onDone(() => {
      this._isShown = isOpening;
      const state = this._isShown ? SHOWN_STATE : HIDDEN_STATE;
      this._renderer.setAttribute(nativeElement, CLASS_ATTRIBUTE, state);
      if (this._isShown) {
        this.shownEvent.emit(this);
      } else {
        this.hiddenEvent.emit(this);
      }
    });
    this._player.play();
  }
}
