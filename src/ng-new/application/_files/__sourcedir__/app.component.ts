import { Component } from '@angular/core';

@Component({
  selector: '<%= prefix %>-root',
  template: `<%
  if (!minimal) {
    if (routing) { %>
      <page-router-outlet></page-router-outlet><%
    } else { %>
      <!--The content below is only a placeholder and can be replaced.-->
      <StackLayout<% if (theme) { %> class="p-20"<% } %>>
        <Label text="Tap the button"<% if (theme) { %> class="h1 text-center"<% } %>></Label>
        <Button text="tap" (tap)="onTap()"<% if (theme) { %> class="btn btn-primary btn-active"<% } %>></Button>
        <Label [text]="getMessage()"<% if (theme) { %> class="h2 text-center"<% } %> textWrap="true"></Label>
      </StackLayout><%
    }
  } %>`
})
export class AppComponent {<% if (!minimal && !routing) { %>
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
