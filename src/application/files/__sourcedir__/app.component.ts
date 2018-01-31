import { Component } from '@angular/core';

@Component({
  selector: '<%= appRootSelector %>',
  template: `<% if (!minimal) { %>
      <!--The content below is only a placeholder and can be replaced.-->
      <StackLayout class="p-20">
        <Label text="Tap the button" class="h1 text-center"></Label>
        <Button text="tap" (tap)="onTap()" class="btn btn-primary btn-active"></Button>
        <Label [text]="getMessage()" class="h2 text-center" textWrap="true"></Label>
      </StackLayout>

      <% if (routing) { %>
      <page-router-outlet></page-router-outlet><% } %>
    <% } %>
  `
})
export class AppComponent {<% if (!minimal) { %>
  private counter = 42;

  public getMessage() {
    return this.counter > 0 ?
      `${this.counter} taps left` :
      'Hoorraaay! You unlocked the NativeScript clicker achievement!';
  }

  public onTap() {
    this.counter--;
  }
  <% } %>
}
