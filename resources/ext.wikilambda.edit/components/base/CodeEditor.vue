<template>
	<!--
		WikiLambda Vue wrapper component for ACE CodeEditor
		https://ace.c9.io/

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div ref="editor" class="ext-wikilambda-codeEditor"></div>
</template>

<script>
require( '../../../lib/ace/src/ace.js' );

// @vue/component
module.exports = {
	name: 'CodeEditor',
	props: {
		value: {
			type: String,
			default: ''
		},
		mode: {
			type: String,
			default: 'javascript'
		},
		theme: {
			type: String,
			default: 'chrome'
		},
		readOnly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			options: {
				minLines: 5,
				maxLines: 20,
				showPrintMargin: false,
				fontSize: 12,
				useSoftTabs: false
			},
			editor: null
		};
	},
	methods: {
		initialize: function () {
			var self = this,
				basePath;

			this.editor = window.ace.edit( this.$refs.editor, { value: this.value } );

			// Set base path to know where to import modules while setting language and theme
			basePath = mw.config.get( 'wgExtensionAssetsPath', '' );
			// ACE doesn't understand relative links
			if ( basePath.slice( 0, 2 ) === '//' ) {
				basePath = window.location.protocol + basePath;
			}
			// TODO: Figure a way to not have this path hardcoded
			window.ace.config.set( 'basePath', basePath + '/WikiLambda/resources/lib/ace/src' );

			// Set readonly
			this.editor.setReadOnly( this.readOnly );

			// Set language and theme
			this.editor.getSession().setMode( 'ace/mode/' + this.mode );
			this.editor.setTheme( 'ace/theme/' + this.theme );

			// Set custom options
			// TODO: Do we want to pass options as a prop?
			this.editor.setOptions( this.options );

			// Set listener
			this.editor.on( 'change', function () {
				self.$emit( 'change', self.editor.getValue() );
			} );
		}
	},
	watch: {
		value: function ( newValue ) {
			this.editor.setValue( newValue, 1 );
		},
		mode: function ( newMode ) {
			this.editor.setOption( 'mode', 'ace/mode/' + newMode );
		},
		theme: function ( newTheme ) {
			this.editor.setTheme( 'ace/theme/' + newTheme );
		},
		readOnly: function ( newValue ) {
			this.editor.setReadOnly( newValue );
		}
	},
	mounted: function () {
		this.initialize();
	}
};
</script>

<style lang="less">
.ext-wikilambda-codeEditor {
	width: 100%;
	border: 1px solid #e0e0e0;
	min-height: 85px;
}
</style>
