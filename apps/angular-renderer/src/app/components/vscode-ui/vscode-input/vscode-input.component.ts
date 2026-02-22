import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
    selector: 'app-vscode-input',
    standalone: true,
    imports: [CommonModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => VSCodeInputComponent),
            multi: true
        }
    ],
    template: `
    <input 
      #inputElement
      class="vscode-input"
      [ngClass]="className"
      [type]="type"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [value]="value"
      (input)="onInputChange($event)"
      (blur)="onTouched()"
    />
  `,
    styles: []
})
export class VSCodeInputComponent implements ControlValueAccessor {
    @Input() className: string = '';
    @Input() type: string = 'text';
    @Input() placeholder: string = '';
    @Input() disabled: boolean = false;
    @Input() value: string = '';

    @Output() onChange = new EventEmitter<string>();

    @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;

    onTouched = () => { };

    writeValue(value: string): void {
        this.value = value || '';
        if (this.inputElement) {
            this.inputElement.nativeElement.value = this.value;
        }
    }

    registerOnChange(fn: any): void {
        this.onChangeFn = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onInputChange(event: Event) {
        const target = event.target as HTMLInputElement;
        this.value = target.value;
        this.onChangeFn(this.value);
        this.onChange.emit(this.value);
    }

    private onChangeFn = (value: string) => { };
}
