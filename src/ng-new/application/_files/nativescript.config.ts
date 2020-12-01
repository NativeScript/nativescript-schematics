import { NativeScriptConfig } from '@nativescript/core';

export default {
	id: 'org.nativescript.<%= utils.sanitize(name) %>',
	appResourcesPath: 'App_Resources',
	android: {
		v8Flags: '--expose_gc',
		markingMode: 'none',
	},
	appPath: '<%= sourcedir %>'
} as NativeScriptConfig;
