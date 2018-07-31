import { Component } from '@angular/core';

@Component({
  selector: '<%= prefix %>-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.<%= style %>'],
  moduleId: module.id,
})
export class HomeComponent {
  title = '<%= name %>';
  private counter = 42;

  constructor() { }

  public getMessage() {
    return this.counter > 0 ?
      `${this.counter} taps left` :
      'Hoorraaay! You unlocked the NativeScript clicker achievement!';
  }

  public onTap() {
    this.counter--;
  }
}
