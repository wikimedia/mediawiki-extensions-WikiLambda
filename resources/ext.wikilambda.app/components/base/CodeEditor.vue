<!--
	WikiLambda Vue wrapper component for ACE CodeEditor
	https://ace.c9.io/

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-code-editor"
		:class="{ 'ext-wikilambda-app-code-editor--disabled': disabled }">
		<div
			ref="editor"
			class="ext-wikilambda-app-code-editor__ace"
			data-testid="ace-code-editor"></div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
require( '../../../lib/ace/src/ace.js' );

module.exports = exports = defineComponent( {
	name: 'wl-code-editor',
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
		},
		disabled: {
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
			this.editor = window.ace.edit( this.$refs.editor, { value: this.value } );

			// Set base path to know where to import modules while setting language and theme
			let basePath = mw.config.get( 'wgExtensionAssetsPath', '' );
			// ACE doesn't understand relative links
			if ( basePath.slice( 0, 2 ) === '//' ) {
				basePath = window.location.protocol + basePath;
			}
			// TODO: Figure a way to not have this path hardcoded
			window.ace.config.set( 'basePath', basePath + '/WikiLambda/resources/lib/ace/src' );

			// Set readonly attribute when readonly or disabled
			this.editor.setReadOnly( this.readOnly || this.disabled );

			// Set language and theme
			this.editor.getSession().setMode( 'ace/mode/' + this.mode );
			this.editor.setTheme( 'ace/theme/' + this.theme );

			// Set custom options
			// TODO: Do we want to pass options as a prop?
			this.editor.setOptions( this.options );

			// Set listener
			this.editor.on( 'change', () => {
				this.$emit( 'change', this.editor.getValue() );
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
		},
		disabled: function ( newValue ) {
			this.editor.setReadOnly( newValue );
		}
	},
	mounted: function () {
		this.initialize();
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-code-editor {
	.ext-wikilambda-app-code-editor__ace.ace_editor {
		width: 100%;
		border: 1px solid @border-color-subtle;
		min-height: 85px;
		z-index: 0;
		box-sizing: @box-sizing-base;
		font-size: calc( @font-size-medium * 0.857 );
	}

	&--disabled {
		.ext-wikilambda-app-code-editor__ace.ace_editor {
			background-color: @background-color-disabled-subtle;
		}
	}
}
</style>
