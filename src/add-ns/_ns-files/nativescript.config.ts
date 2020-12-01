import { NativeScriptConfig } from '@nativescript/core';

export default {
	id: 'org.nativescript.ngsample',
	appResourcesPath: 'App_Resources',
	android: {
		v8Flags: '--expose_gc',
		markingMode: 'none',
	},
	appPath: '<%= sourceDir %>'
} as NativeScriptConfig;
