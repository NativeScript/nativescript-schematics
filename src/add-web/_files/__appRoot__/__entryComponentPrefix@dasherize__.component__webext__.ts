import { Component } from '@angular/core';

@Component({
  selector: '<%= indexAppRootTag %>',
  templateUrl: '<%= entryComponentImportPath %>.html'
})
export class <%= entryComponentName %> {
  title = 'app';
}
